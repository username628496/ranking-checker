import { useEffect, useState } from "react";
import { useTheme } from "@contexts/ThemeContext";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Search,
  Calendar,
  Tag,
  Globe,
  Check,
  Save,
  FolderOpen,
  Play,
} from "lucide-react";
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../api";

type Template = {
  id: number;
  user_name: string;
  name: string;
  keywords: string[];
  domains: string[];
  created_at: string;
};

type Props = {
  onUseTemplate?: (keywords: string, domains: string) => void;
};

export default function UserTemplate({ onUseTemplate }: Props) {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [userName, setUserName] = useState("");
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [domains, setDomains] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function loadTemplates() {
    const data = await fetchTemplates();
    setTemplates(data);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  async function handleSave() {
    if (!userName || !name) return alert("Vui lòng nhập đầy đủ thông tin");

    const payload = {
      user_name: userName,
      name,
      keywords: keywords.split("\n").map((s) => s.trim()).filter(Boolean),
      domains: domains.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    if (editId) {
      await updateTemplate(editId, payload);
      setEditId(null);
    } else {
      await createTemplate(payload);
    }

    resetForm();
    loadTemplates();
  }

  function resetForm() {
    setUserName("");
    setName("");
    setKeywords("");
    setDomains("");
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(t: Template) {
    setEditId(t.id);
    setUserName(t.user_name);
    setName(t.name);
    setKeywords(t.keywords.join("\n"));
    setDomains(t.domains.join("\n"));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (confirm("Bạn có chắc muốn xoá template này?")) {
      await deleteTemplate(id);
      loadTemplates();
    }
  }

  function handleCopy(list: string[], label: string) {
    navigator.clipboard.writeText(list.join("\n"));
    setCopyFeedback(`Đã copy ${label}`);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  function handleQuickUse(t: Template) {
    const keywordsText = t.keywords.join("\n");
    const domainsText = t.domains.join("\n");

    if (onUseTemplate) {
      onUseTemplate(keywordsText, domainsText);
      setCopyFeedback("Đã tải template vào form!");
      setTimeout(() => setCopyFeedback(null), 2000);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden">
      {/* Copy feedback toast */}
      {copyFeedback && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500 text-white shadow-lg">
            <Check className="w-4 h-4" />
            <span className="font-medium text-sm">{copyFeedback}</span>
          </div>
        </div>
      )}

      {/* Header - Stripe Style */}
      <div className={`relative px-6 py-5 ${
        theme === "dark"
          ? "bg-gradient-to-b from-gray-800/40 via-gray-800/20 to-transparent"
          : "bg-gradient-to-b from-gray-50/80 via-white/40 to-transparent"
      }`}>
        {/* Bottom gradient border */}
        <div className={`absolute bottom-0 left-0 right-0 h-px ${
          theme === "dark"
            ? "bg-gradient-to-r from-transparent via-gray-700 to-transparent"
            : "bg-gradient-to-r from-transparent via-gray-200 to-transparent"
        }`} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
              theme === "dark"
                ? "bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 shadow-lg shadow-cyan-500/5"
                : "bg-gradient-to-br from-cyan-50 to-cyan-100/50 shadow-sm"
            }`}>
              <FolderOpen className={`w-4.5 h-4.5 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
            <div>
              <h3 className={`font-semibold text-base tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Template cá nhân</h3>
              <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{templates.length} templates</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${showForm
                ? theme === "dark"
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
              }
            `}
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                Đóng
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Thêm mới
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Form */}
        {showForm && (
          <div className={`rounded-lg border p-5 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700"
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className={`flex items-center gap-2 pb-3 mb-4 border-b ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                theme === "dark" ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"
              }`}>
                {editId ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </div>
              <h4 className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {editId ? "Chỉnh sửa Template" : "Tạo Template Mới"}
              </h4>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Tên người dùng</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                    }`}
                    placeholder="Tên người dùng"
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Tên template</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                    }`}
                    placeholder="Tên template"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className={`text-xs font-medium flex items-center gap-1.5 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}>
                    <Tag className={`w-3 h-3 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                    Keywords
                  </label>
                  <textarea
                    rows={4}
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Mỗi dòng 1 keyword"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-mono transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-medium flex items-center gap-1.5 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}>
                    <Globe className={`w-3 h-3 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                    Domains
                  </label>
                  <textarea
                    rows={4}
                    value={domains}
                    onChange={(e) => setDomains(e.target.value)}
                    placeholder="Mỗi dòng 1 domain"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-mono transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-all duration-200"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editId ? "Cập nhật" : "Lưu"}
                </button>
                <button
                  onClick={resetForm}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search className={`w-4 h-4 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
          </div>
          <input
            type="text"
            placeholder="Tìm template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
              }`}
            >
              <X className={`w-4 h-4 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
            </button>
          )}
        </div>

        {/* Template Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((t) => (
              <div
                key={t.id}
                className={`rounded-lg border p-4 transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 hover:shadow-md hover:border-gray-600"
                    : "bg-white border-gray-200 hover:shadow-md hover:border-gray-300"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm truncate mb-1 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {t.name}
                    </h4>
                    <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{t.user_name}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className={`flex items-center gap-3 mb-3 text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>
                  <span className="flex items-center gap-1">
                    <Tag className={`w-3 h-3 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                    {t.keywords.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className={`w-3 h-3 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                    {t.domains.length}
                  </span>
                  {t.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(t.created_at)}
                    </span>
                  )}
                </div>

                {/* Preview tags */}
                <div className={`space-y-2 mb-3 pb-3 border-b ${
                  theme === "dark" ? "border-gray-700" : "border-gray-100"
                }`}>
                  <div className="flex flex-wrap gap-1.5">
                    {t.keywords.slice(0, 2).map((k, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border text-xs truncate max-w-[90px] ${
                          theme === "dark"
                            ? "bg-green-900/20 border-green-800 text-green-300"
                            : "bg-green-50 border-green-200 text-green-700"
                        }`}
                        title={k}
                      >
                        {k}
                      </span>
                    ))}
                    {t.keywords.length > 2 && (
                      <span className={`px-2 py-0.5 rounded border text-xs ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-gray-300"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}>
                        +{t.keywords.length - 2}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.domains.slice(0, 1).map((d, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border font-mono text-xs truncate max-w-[120px] ${
                          theme === "dark"
                            ? "bg-blue-900/20 border-blue-800 text-blue-300"
                            : "bg-blue-50 border-blue-200 text-blue-700"
                        }`}
                        title={d}
                      >
                        {d}
                      </span>
                    ))}
                    {t.domains.length > 1 && (
                      <span className={`px-2 py-0.5 rounded border text-xs ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-gray-300"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}>
                        +{t.domains.length - 1}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    onClick={() => handleQuickUse(t)}
                    className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-all duration-200"
                    title="Sử dụng nhanh"
                  >
                    <Play className="w-3 h-3" />
                    <span>Dùng</span>
                  </button>
                  <button
                    onClick={() => handleCopy(t.keywords, "từ khóa")}
                    className={`flex items-center justify-center p-2 rounded-lg border transition-all duration-200 ${
                      theme === "dark"
                        ? "border-green-800 text-green-400 hover:bg-green-900/20"
                        : "border-green-200 text-green-600 hover:bg-green-50"
                    }`}
                    title="Copy từ khóa"
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCopy(t.domains, "domain")}
                    className={`flex items-center justify-center p-2 rounded-lg border transition-all duration-200 ${
                      theme === "dark"
                        ? "border-blue-800 text-blue-400 hover:bg-blue-900/20"
                        : "border-blue-200 text-blue-600 hover:bg-blue-50"
                    }`}
                    title="Copy domain"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleEdit(t)}
                    className={`flex items-center justify-center p-2 rounded-lg border transition-all duration-200 ${
                      theme === "dark"
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                    title="Chỉnh sửa"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Delete button - separate row */}
                <button
                  onClick={() => handleDelete(t.id)}
                  className={`w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs transition-all duration-200 ${
                    theme === "dark"
                      ? "border-red-800 text-red-400 hover:bg-red-900/20"
                      : "border-red-200 text-red-600 hover:bg-red-50"
                  }`}
                  title="Xóa"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa template</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-3 ${
              theme === "dark" ? "bg-gray-700" : "bg-gray-100"
            }`}>
              <Search className={`w-6 h-6 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
            </div>
            <h4 className={`text-sm font-semibold mb-1 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              {searchQuery ? "Không tìm thấy template" : "Chưa có template"}
            </h4>
            <p className={`text-xs mb-4 ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}>
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác"
                : "Tạo template đầu tiên để bắt đầu"
              }
            </p>
            {!showForm && !searchQuery && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Tạo Template
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
