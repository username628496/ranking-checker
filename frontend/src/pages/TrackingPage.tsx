import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, RefreshCw, Calendar, Upload, FileText, Globe, Zap, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  fetchTrackingList,
  addTracking,
  deleteTracking,
  manualCheckTracking,
  fetchTrackingHistory,
  fetchTemplates,
  fetchMonthlySnapshot,
} from "../api";

interface Tracking {
  id: number;
  user_name: string | null;
  keyword: string;
  domain: string;
  ranking_domain: string | null;
  location: string;
  device: string;
  frequency: string;
  is_active: boolean;
  next_check_date: string | null;
  created_at: string;
  last_checked_at: string | null;
}

interface HistoryEntry {
  keyword: string;
  domain: string;
  position: number | null;
  url: string;
  checked_at: string;
  location_display: string;
}

export default function TrackingPage() {
  const [trackings, setTrackings] = useState<Tracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTracking, setSelectedTracking] = useState<Tracking | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state
  const [userName, setUserName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [domain, setDomain] = useState("");
  const [location, setLocation] = useState("vn");
  const [device, setDevice] = useState("desktop");
  const [frequency, setFrequency] = useState("daily");

  // Bulk import state
  const [bulkUserName, setBulkUserName] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [bulkDomains, setBulkDomains] = useState("");
  const [bulkLocation, setBulkLocation] = useState("vn");
  const [bulkDevice, setBulkDevice] = useState("desktop");
  const [bulkFrequency, setBulkFrequency] = useState("daily");
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; errors: string[] } | null>(null);

  // Template state
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);

  // History map: tracking.id -> { date -> position }
  const [historyMap, setHistoryMap] = useState<Record<number, Record<string, number | null>>>({});

  // Month selection state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState<'current' | 'historical'>('current');

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filter state
  const [showOnlyRanking, setShowOnlyRanking] = useState(false);

  // Action column visibility state
  const [showActions, setShowActions] = useState(true);

  // Generate dates based on selected month - always show all days
  const getDatesForMonth = (year: number, month: number) => {
    const dates = [];
    // month parameter is 1-12 (January=1, December=12)
    // new Date(year, month, 0) returns last day of month (month-1)
    // Example: new Date(2024, 12, 0) = Dec 31, 2024 (last day of December)
    const daysInMonth = new Date(year, month, 0).getDate();

    // Create dates from day 1 to last day
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month - 1, day));
    }
    return dates;
  };

  const dates = getDatesForMonth(selectedYear, selectedMonth);

  // Filter trackings based on ranking status
  const filteredTrackings = showOnlyRanking
    ? trackings.filter((tracking) => {
        const history = historyMap[tracking.id];
        if (!history) return false;

        // Check if any day has a ranking (not null and not undefined)
        return Object.values(history).some(pos => pos !== null && pos !== undefined);
      })
    : trackings;

  useEffect(() => {
    loadTrackings();
  }, []);

  // Reload history when month changes
  useEffect(() => {
    if (trackings.length > 0) {
      loadHistoryData(trackings);
    }
  }, [selectedYear, selectedMonth]);

  // Load templates when bulk modal opens
  useEffect(() => {
    if (showBulkModal) {
      fetchTemplates()
        .then((data) => setTemplates(data))
        .catch(() => setTemplates([]));
    }
  }, [showBulkModal]);

  async function loadTrackings() {
    try {
      const data = await fetchTrackingList();
      setTrackings(data);
      await loadHistoryData(data);
    } catch (error) {
      console.error("Error loading trackings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistoryData(trackingList: Tracking[]) {
    const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1;

    if (isCurrentMonth) {
      // Current month: Load live data (last 30 days)
      setViewMode('current');
      const historyPromises = trackingList.map((t: Tracking) =>
        fetchTrackingHistory(t.keyword, t.domain, 30).catch(() => [])
      );
      const allHistory = await Promise.all(historyPromises);

      // Build history map
      const newMap: Record<number, Record<string, number | null>> = {};
      trackingList.forEach((t: Tracking, idx: number) => {
        newMap[t.id] = {};
        allHistory[idx].forEach((h: HistoryEntry) => {
          const dateKey = new Date(h.checked_at).toLocaleDateString("vi-VN");
          newMap[t.id][dateKey] = h.position;
        });
      });
      setHistoryMap(newMap);
    } else {
      // Historical month: Load from snapshot
      setViewMode('historical');
      await loadMonthlySnapshot(trackingList);
    }
  }

  async function loadMonthlySnapshot(trackingList: Tracking[]) {
    // Check localStorage cache first
    const cacheKey = `snapshot_${selectedYear}_${selectedMonth}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsedCache = JSON.parse(cachedData);
        buildHistoryMapFromSnapshot(trackingList, parsedCache);
        return;
      } catch (e) {
        console.error("Failed to parse cached snapshot:", e);
      }
    }

    // Fetch from API
    try {
      const snapshots = await fetchMonthlySnapshot(selectedYear, selectedMonth);

      // Cache in localStorage
      localStorage.setItem(cacheKey, JSON.stringify(snapshots));

      buildHistoryMapFromSnapshot(trackingList, snapshots);
    } catch (error) {
      console.error("Error loading monthly snapshot:", error);
      // If no snapshot exists, show empty data
      setHistoryMap({});
    }
  }

  function buildHistoryMapFromSnapshot(trackingList: Tracking[], snapshots: any[]) {
    const newMap: Record<number, Record<string, number | null>> = {};

    trackingList.forEach((t: Tracking) => {
      newMap[t.id] = {};

      // Find snapshot for this tracking
      const snapshot = snapshots.find(
        (s: any) => s.keyword === t.keyword && s.domain === t.domain
      );

      if (snapshot && snapshot.daily_data) {
        snapshot.daily_data.forEach((entry: any) => {
          const date = new Date(entry.date);
          const dateKey = date.toLocaleDateString("vi-VN");
          newMap[t.id][dateKey] = entry.position;
        });
      }
    });

    setHistoryMap(newMap);
  }

  async function handleAdd() {
    if (!keyword.trim() || !domain.trim()) {
      alert("Vui lòng nhập đầy đủ từ khóa và domain");
      return;
    }

    try {
      await addTracking({
        user_name: userName.trim() || undefined,
        keyword: keyword.trim(),
        domain: domain.trim(),
        location,
        device,
        frequency,
      });
      setShowModal(false);
      resetForm();
      loadTrackings();
    } catch (error: any) {
      alert(error.message || "Không thể thêm tracking");
    }
  }

  async function handleBulkImport() {
    const keywords = bulkKeywords.split("\n").map((k) => k.trim()).filter((k) => k.length > 0);
    const domains = bulkDomains.split("\n").map((d) => d.trim()).filter((d) => d.length > 0);

    if (keywords.length === 0 || domains.length === 0) {
      alert("Vui lòng nhập cả từ khóa và domain");
      return;
    }

    if (keywords.length !== domains.length) {
      alert(`Số lượng không khớp!\nKeywords: ${keywords.length}\nDomains: ${domains.length}\n\nVui lòng đảm bảo mỗi keyword có 1 domain tương ứng.`);
      return;
    }

    const pairs: Array<{ keyword: string; domain: string }> = [];
    for (let i = 0; i < keywords.length; i++) {
      pairs.push({ keyword: keywords[i], domain: domains[i] });
    }

    // Start importing
    setBulkProgress({ total: pairs.length, done: 0, errors: [] });

    let successCount = 0;
    const importErrors: string[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const { keyword, domain } = pairs[i];
      try {
        await addTracking({
          user_name: bulkUserName.trim() || undefined,
          keyword,
          domain,
          location: bulkLocation,
          device: bulkDevice,
          frequency: bulkFrequency,
        });
        successCount++;
      } catch (error: any) {
        importErrors.push(`${keyword} - ${domain}: ${error.message}`);
      }

      setBulkProgress({
        total: pairs.length,
        done: i + 1,
        errors: importErrors,
      });
    }

    // Done
    if (importErrors.length === 0) {
      alert(`✅ Đã thêm thành công ${successCount}/${pairs.length} tracking!`);
      setShowBulkModal(false);
      resetBulkForm();
      loadTrackings();
    } else {
      alert(
        `Hoàn thành: ${successCount} thành công, ${importErrors.length} lỗi.\n\nLỗi:\n${importErrors.slice(0, 5).join("\n")}${
          importErrors.length > 5 ? `\n... và ${importErrors.length - 5} lỗi khác` : ""
        }`
      );
    }

    setBulkProgress(null);
  }

  function resetForm() {
    setUserName("");
    setKeyword("");
    setDomain("");
    setLocation("vn");
    setDevice("desktop");
    setFrequency("daily");
  }

  function resetBulkForm() {
    setBulkUserName("");
    setBulkKeywords("");
    setBulkDomains("");
    setBulkLocation("vn");
    setBulkDevice("desktop");
    setBulkFrequency("daily");
    setBulkProgress(null);
    setTemplates([]);
    setShowTemplateSelect(false);
  }

  function handleLoadTemplate(templateId: number) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // Fill keywords and domains from template
    const keywords = template.keywords.join("\n");
    const domains = template.domains.join("\n");

    setBulkKeywords(keywords);
    setBulkDomains(domains);
    setBulkUserName(template.user_name || "");
    setShowTemplateSelect(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Xác nhận xóa tracking này?")) return;
    try {
      await deleteTracking(id);
      loadTrackings();
    } catch (error) {
      alert("Không thể xóa tracking");
    }
  }

  async function handleManualCheck(id: number) {
    try {
      await manualCheckTracking(id);
      alert("Đã kiểm tra xong!");
      loadTrackings();
    } catch (error) {
      alert("Không thể kiểm tra");
    }
  }

  function handlePreviousMonth() {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  }

  function handleNextMonth() {
    const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1;
    if (isCurrentMonth) return; // Can't go beyond current month

    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  }

  function handleGoToCurrentMonth() {
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth() + 1);
  }

  function handleSelectAll() {
    if (selectedIds.size === trackings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trackings.map(t => t.id)));
    }
  }

  function handleToggleSelect(id: number) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  async function handleBulkCheck() {
    if (selectedIds.size === 0) {
      alert("Vui lòng chọn ít nhất 1 tracking");
      return;
    }

    if (!confirm(`Xác nhận kiểm tra ${selectedIds.size} tracking đã chọn?`)) return;

    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of Array.from(selectedIds)) {
      try {
        await manualCheckTracking(id);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setBulkActionLoading(false);
    alert(`Hoàn thành!\nThành công: ${successCount}\nThất bại: ${failCount}`);
    setSelectedIds(new Set());
    loadTrackings();
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) {
      alert("Vui lòng chọn ít nhất 1 tracking");
      return;
    }

    if (!confirm(`⚠️ XÁC NHẬN XÓA ${selectedIds.size} TRACKING?\n\nHành động này không thể hoàn tác!`)) return;

    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of Array.from(selectedIds)) {
      try {
        await deleteTracking(id);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setBulkActionLoading(false);
    alert(`Hoàn thành!\nĐã xóa: ${successCount}\nThất bại: ${failCount}`);
    setSelectedIds(new Set());
    loadTrackings();
  }

  async function handleViewHistory(tracking: Tracking) {
    setSelectedTracking(tracking);
    setShowHistoryModal(true);
    setHistoryLoading(true);

    try {
      const history = await fetchTrackingHistory(tracking.keyword, tracking.domain, 90);
      setHistoryData(history);
    } catch (error) {
      alert("Không thể tải lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  }

  function getPositionCell(tracking: Tracking, date: Date) {
    const dateKey = date.toLocaleDateString("vi-VN");
    const historyEntry = historyMap[tracking.id]?.[dateKey];

    // Case 1: No data for this date - show gray dash
    if (historyEntry === undefined) {
      return {
        display: "-",
        color: "#F1F5F9",
        textColor: "#94A3B8",
      };
    }

    // Case 2: Data exists but position is null - not in TOP 100 (N/A)
    if (historyEntry === null) {
      return {
        display: "N/A",
        color: "#E5E7EB",
        textColor: "#6B7280",
      };
    }

    const pos = historyEntry;
    let color = "#F1F5F9";
    let textColor = "#1E293B";

    // Top 1-6: Xanh lá mạnh
    if (pos <= 6) {
      color = "#059669";
      textColor = "#FFFFFF";
    }
    // Top 7-10: Vàng
    else if (pos <= 10) {
      color = "#F59E0B";
      textColor = "#FFFFFF";
    }
    // Top 11-20: Xám đậm
    else if (pos <= 20) {
      color = "#475569";
      textColor = "#FFFFFF";
    }
    // Top 21-50: Xám nhạt
    else if (pos <= 50) {
      color = "#CBD5E1";
      textColor = "#1E293B";
    }
    // Top 50+: Đỏ nhạt
    else {
      color = "#FEE2E2";
      textColor = "#991B1B";
    }

    // Calculate change from previous day
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateKey = prevDate.toLocaleDateString("vi-VN");
    const prevPosition = historyMap[tracking.id]?.[prevDateKey];

    let indicator = "";
    if (prevPosition && prevPosition !== pos) {
      if (pos < prevPosition) {
        indicator = "▲"; // Improved
      } else {
        indicator = "▼"; // Declined
      }
    }

    return {
      display: `#${pos}${indicator}`,
      color,
      textColor,
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="px-4 py-3 border-b border-base-300 bg-base-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-lg w-8">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  Theo dõi hàng ngày
                </h3>
                <p className="text-xs opacity-60">
                  {trackings.length} từ khóa đang theo dõi
                  {selectedIds.size > 0 && <span className="ml-2 text-primary font-semibold">({selectedIds.size} đã chọn)</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleBulkCheck}
                    disabled={bulkActionLoading}
                    className="btn btn-success btn-sm gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Kiểm tra hàng loạt
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkActionLoading}
                    className="btn btn-error btn-sm gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa hàng loạt
                  </button>
                </>
              )}
              <button
                onClick={() => setShowBulkModal(true)}
                className="btn btn-success btn-sm gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Import hàng loạt
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary btn-sm gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm 1 tracking
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Month Selector + Legend + Filter */}
      <div className="card bg-base-100 border border-base-300 p-3 space-y-3">
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousMonth}
              className="btn btn-sm btn-ghost btn-square"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-base-200 rounded-lg border border-base-300">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Tháng {selectedMonth}/{selectedYear}
              </span>
              {viewMode === 'current' && (
                <span className="badge badge-success badge-sm">
                  Live
                </span>
              )}
              {viewMode === 'historical' && (
                <span className="badge badge-info badge-sm">
                  Snapshot
                </span>
              )}
            </div>

            <button
              onClick={handleNextMonth}
              disabled={selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1}
              className="btn btn-sm btn-ghost btn-square"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="label cursor-pointer gap-2 px-3 py-1.5 rounded-lg hover:bg-base-200 transition-colors border border-base-300">
              <input
                type="checkbox"
                checked={showOnlyRanking}
                onChange={(e) => setShowOnlyRanking(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="label-text text-xs font-semibold">
                Chỉ hiện có ranking
              </span>
            </label>
            <button
              onClick={handleGoToCurrentMonth}
              className="btn btn-sm btn-info gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Tháng hiện tại
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs flex-wrap pt-2 border-t border-base-300">
          <span className="font-semibold">Chú thích:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#059669" }}></div>
            <span className="opacity-70">Top 1-6</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#F59E0B" }}></div>
            <span className="opacity-70">Top 7-10</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#475569" }}></div>
            <span className="opacity-70">Top 11-20</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#CBD5E1" }}></div>
            <span className="opacity-70">Top 21-50</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FEE2E2" }}></div>
            <span className="opacity-70">50+</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#E5E7EB" }}></div>
            <span className="opacity-70">N/A</span>
          </div>
          <span className="opacity-60 ml-2">▲ Tăng | ▼ Giảm</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
          <table className="min-w-full border-collapse text-xs">
            <thead className="sticky top-0 z-30" style={{ backgroundColor: "#F8FAFC", color: "#1E293B" }}>
              <tr style={{ backgroundColor: "#F8FAFC", color: "#1E293B" }}>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-40 px-1 py-2 text-center font-semibold border-r"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", color: "#1E293B", width: "28px", minWidth: "28px", maxWidth: "28px" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredTrackings.length && filteredTrackings.length > 0}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th
                  rowSpan={2}
                  className="sticky z-40 px-1 py-2 text-center font-semibold border-r"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", color: "#1E293B", left: "28px", width: "32px", minWidth: "32px", maxWidth: "32px" }}
                >
                  #
                </th>
                <th
                  rowSpan={2}
                  className="sticky z-40 px-1 py-2 text-left font-semibold border-r"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", color: "#1E293B", left: "60px", width: "50px", minWidth: "50px", maxWidth: "50px" }}
                >
                  PIC
                </th>
                <th
                  rowSpan={2}
                  className="sticky z-40 px-1 py-2 text-left font-semibold border-r"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", color: "#1E293B", left: "110px", width: "70px", minWidth: "70px", maxWidth: "70px" }}
                >
                  Keyword
                </th>
                <th
                  rowSpan={2}
                  className="sticky z-40 px-1 py-2 text-left font-semibold border-r whitespace-nowrap"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", color: "#1E293B", left: "180px", width: "100px", minWidth: "100px" }}
                >
                  Domain gốc
                </th>
                <th
                  rowSpan={2}
                  className="sticky z-40 px-1 py-2 text-left font-semibold border-r whitespace-nowrap"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", color: "#1E293B", left: "280px", width: "100px", minWidth: "100px", boxShadow: "2px 0 4px rgba(0,0,0,0.05)" }}
                >
                  Ranking Domain
                </th>
                <th
                  colSpan={dates.length}
                  className="px-3 py-2 text-center font-semibold border-r"
                  style={{ borderColor: "#CBD5E1", color: "#1E293B" }}
                >
                  Tháng {selectedMonth}/{selectedYear} ({viewMode === 'current' ? '30 ngày gần nhất' : `${dates.length} ngày`})
                </th>
                <th
                  rowSpan={2}
                  className="sticky right-0 z-40 text-center font-semibold"
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderColor: "#CBD5E1",
                    color: "#1E293B",
                    width: showActions ? "90px" : "40px",
                    padding: showActions ? "8px" : "4px"
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    {showActions && <span className="text-xs">Hành động</span>}
                    <button
                      onClick={() => setShowActions(!showActions)}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                      title={showActions ? "Thu gọn cột" : "Mở rộng cột"}
                    >
                      {showActions ? (
                        <ChevronsRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </th>
              </tr>
              <tr style={{ backgroundColor: "#F8FAFC", color: "#1E293B" }}>
                {dates.map((date, idx) => (
                  <th
                    key={idx}
                    className="px-1.5 py-1 text-center font-medium border-r"
                    style={{ borderColor: "#E2E8F0", minWidth: "38px", backgroundColor: "#F8FAFC", color: "#1E293B" }}
                  >
                    {date.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTrackings.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 7} className="px-4 py-8 text-center opacity-60">
                    {showOnlyRanking ? "Không có tracking nào có ranking" : "Chưa có tracking nào. Nhấn \"Thêm tracking\" để bắt đầu."}
                  </td>
                </tr>
              ) : (
                filteredTrackings.map((tracking, rowIdx) => (
                  <tr key={tracking.id} className="hover:bg-gray-50 group">
                    {/* Checkbox */}
                    <td
                      className="sticky left-0 z-20 px-1 py-1 text-center border-r"
                      style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#1E293B", width: "28px", minWidth: "28px", maxWidth: "28px" }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tracking.id)}
                        onChange={() => handleToggleSelect(tracking.id)}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* STT */}
                    <td
                      className="sticky z-20 px-1 py-1 text-center font-medium border-r text-xs"
                      style={{ left: "28px", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#1E293B", width: "32px", minWidth: "32px", maxWidth: "32px" }}
                    >
                      {rowIdx + 1}
                    </td>

                    {/* PIC */}
                    <td className="sticky z-20 px-1 py-1 border-r text-xs" style={{ left: "60px", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#1E293B", width: "50px", minWidth: "50px", maxWidth: "50px" }}>
                      <span className="font-medium truncate block" title={tracking.user_name || "-"}>{tracking.user_name || "-"}</span>
                    </td>

                    {/* Keyword */}
                    <td className="sticky z-20 px-1 py-1 border-r text-xs" style={{ left: "110px", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#1E293B", width: "70px", minWidth: "70px", maxWidth: "70px" }}>
                      <div className="font-medium truncate" title={tracking.keyword}>{tracking.keyword}</div>
                    </td>

                    {/* Domain gốc */}
                    <td className="sticky z-20 px-1 py-1 border-r font-mono text-xs whitespace-nowrap" style={{ left: "180px", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#1E293B", width: "100px", minWidth: "100px" }}>
                      <div className="truncate" title={tracking.domain}>{tracking.domain}</div>
                    </td>

                    {/* Ranking Domain */}
                    <td className="sticky z-20 px-1 py-1 border-r font-mono text-xs whitespace-nowrap" style={{ left: "280px", backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#1E293B", boxShadow: "2px 0 4px rgba(0,0,0,0.05)", width: "100px", minWidth: "100px" }}>
                      {(() => {
                        // Get the most recent history entry for this tracking
                        const history = historyMap[tracking.id];
                        if (!history) return <span className="opacity-40">-</span>;

                        // Find most recent date with data
                        const sortedDates = Object.keys(history).sort((a, b) => {
                          const dateA = new Date(a.split('/').reverse().join('-'));
                          const dateB = new Date(b.split('/').reverse().join('-'));
                          return dateB.getTime() - dateA.getTime();
                        });

                        // Use ranking_domain from tracking if available, otherwise show domain
                        const displayDomain = tracking.ranking_domain || tracking.domain;
                        const hasRanking = sortedDates.length > 0 && history[sortedDates[0]] !== undefined;

                        return (
                          <span className={hasRanking && displayDomain !== tracking.domain ? "text-success" : "opacity-40"}>
                            {displayDomain}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Days */}
                    {dates.map((date, idx) => {
                      const cell = getPositionCell(tracking, date);
                      return (
                        <td
                          key={idx}
                          className="px-1.5 py-1 text-center font-semibold border-r"
                          style={{
                            backgroundColor: cell.color,
                            color: cell.textColor,
                            borderColor: "#E2E8F0",
                            minWidth: "38px",
                          }}
                        >
                          {cell.display}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td
                      className="sticky right-0 z-20 border-l"
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#CBD5E1",
                        color: "#1E293B",
                        width: showActions ? "90px" : "40px",
                        padding: showActions ? "4px 8px" : "4px"
                      }}
                    >
                      {showActions ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleManualCheck(tracking.id)}
                            className="p-1 rounded hover:bg-blue-50 text-blue-600"
                            title="Kiểm tra ngay"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleViewHistory(tracking)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-600"
                            title="Xem lịch sử"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tracking.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-600"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <button
                            onClick={() => setShowActions(true)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-600"
                            title="Mở hành động"
                          >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">Thêm Tracking Mới</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-semibold">Tên người dùng (PIC)</span>
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="input input-bordered input-sm"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-semibold">Từ khóa *</span>
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="VD: seo tools"
                  className="input input-bordered input-sm"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-semibold">Domain *</span>
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="VD: example.com"
                  className="input input-bordered input-sm font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-semibold">Vị trí</span>
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    <option value="vn">Việt Nam</option>
                    <option value="hochiminh">TP.HCM</option>
                    <option value="hanoi">Hà Nội</option>
                    <option value="danang">Đà Nẵng</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-semibold">Thiết bị</span>
                  </label>
                  <select
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-semibold">Tần suất</span>
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="daily">Hàng ngày</option>
                  <option value="every_3_days">3 ngày/lần</option>
                  <option value="weekly">Hàng tuần</option>
                </select>
              </div>
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="btn btn-ghost btn-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleAdd}
                className="btn btn-primary btn-sm"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Import Hàng Loạt Tracking</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs font-semibold">Tên người dùng (PIC) - Áp dụng cho tất cả</span>
                </label>
                <input
                  type="text"
                  value={bulkUserName}
                  onChange={(e) => setBulkUserName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="input input-bordered input-sm"
                />
              </div>

              {/* Template Selector */}
              {templates.length > 0 && (
                <div className="card bg-info text-info-content p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <label className="text-xs font-semibold">
                        Load từ Template
                      </label>
                    </div>
                    <button
                      onClick={() => setShowTemplateSelect(!showTemplateSelect)}
                      className="btn btn-xs btn-ghost"
                    >
                      {showTemplateSelect ? "Ẩn" : "Hiển thị"}
                    </button>
                  </div>
                  {showTemplateSelect && (
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleLoadTemplate(template.id)}
                          className="btn btn-sm w-full justify-start"
                        >
                          <div className="text-left">
                            <div className="text-xs font-semibold">{template.name}</div>
                            <div className="text-xs opacity-70">
                              {template.keywords.length} từ khóa × {template.domains.length} domains
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Two-column layout for keywords and domains */}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-success" />
                      Keywords (mỗi dòng 1 từ khóa)
                    </span>
                  </label>
                  <textarea
                    rows={10}
                    value={bulkKeywords}
                    onChange={(e) => setBulkKeywords(e.target.value)}
                    placeholder="seo tools&#10;ranking checker&#10;google search&#10;..."
                    className="textarea textarea-bordered textarea-sm font-mono resize-none"
                  />
                  <label className="label">
                    <span className="label-text-alt flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {bulkKeywords.split("\n").filter((k) => k.trim()).length} dòng
                    </span>
                  </label>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      Domains (mỗi dòng 1 domain)
                    </span>
                  </label>
                  <textarea
                    rows={10}
                    value={bulkDomains}
                    onChange={(e) => setBulkDomains(e.target.value)}
                    placeholder="example.com&#10;mydomain.vn&#10;test.com&#10;..."
                    className="textarea textarea-bordered textarea-sm font-mono resize-none"
                  />
                  <label className="label">
                    <span className="label-text-alt flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {bulkDomains.split("\n").filter((d) => d.trim()).length} dòng
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-semibold">Vị trí</span>
                  </label>
                  <select
                    value={bulkLocation}
                    onChange={(e) => setBulkLocation(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    <option value="vn">Việt Nam</option>
                    <option value="hochiminh">TP.HCM</option>
                    <option value="hanoi">Hà Nội</option>
                    <option value="danang">Đà Nẵng</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-semibold">Thiết bị</span>
                  </label>
                  <select
                    value={bulkDevice}
                    onChange={(e) => setBulkDevice(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs font-semibold">Tần suất</span>
                  </label>
                  <select
                    value={bulkFrequency}
                    onChange={(e) => setBulkFrequency(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="every_3_days">3 ngày/lần</option>
                    <option value="weekly">Hàng tuần</option>
                  </select>
                </div>
              </div>

              {bulkProgress && (
                <div className="card bg-info text-info-content p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">
                      Đang import: {bulkProgress.done}/{bulkProgress.total}
                    </span>
                    <span className="text-xs">
                      {Math.round((bulkProgress.done / bulkProgress.total) * 100)}%
                    </span>
                  </div>
                  <progress
                    className="progress progress-primary w-full"
                    value={bulkProgress.done}
                    max={bulkProgress.total}
                  ></progress>
                  {bulkProgress.errors.length > 0 && (
                    <div className="mt-2 text-xs text-error">
                      {bulkProgress.errors.length} lỗi
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  if (!bulkProgress) {
                    setShowBulkModal(false);
                    resetBulkForm();
                  }
                }}
                disabled={bulkProgress !== null}
                className="btn btn-ghost btn-sm"
              >
                {bulkProgress ? "Đang import..." : "Hủy"}
              </button>
              <button
                onClick={handleBulkImport}
                disabled={bulkProgress !== null}
                className="btn btn-success btn-sm"
              >
                {bulkProgress ? "Đang xử lý..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedTracking && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[80vh]">
            <h3 className="font-bold text-lg mb-4">
              Lịch sử: {selectedTracking.keyword} - {selectedTracking.domain}
            </h3>
            <div className="overflow-auto">
              {historyLoading ? (
                <div className="text-center py-8">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 opacity-60">Chưa có dữ liệu lịch sử</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-xs table-zebra">
                    <thead>
                      <tr className="bg-base-200">
                        <th className="text-left">Ngày</th>
                        <th className="text-center">Vị trí</th>
                        <th className="text-left">URL</th>
                        <th className="text-left">Vị trí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((entry, idx) => (
                        <tr key={idx}>
                          <td>
                            {new Date(entry.checked_at).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="text-center font-semibold">
                            {entry.position ? `#${entry.position}` : "N/A"}
                          </td>
                          <td className="font-mono truncate max-w-xs" title={entry.url}>
                            {entry.url}
                          </td>
                          <td>{entry.location_display}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedTracking(null);
                  setHistoryData([]);
                }}
                className="btn btn-ghost btn-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
