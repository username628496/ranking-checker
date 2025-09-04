import React, { useMemo, useRef, useState } from "react";
import {
  Settings,
  Monitor,
  Smartphone,
  Globe,
  Type,
  Cog,
  Zap,
  Power,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Props = {
  onStart: (p: {
    sessionId: string;
    total: number;
    keywords: string[];
    domains: string[];
  }) => void;
  onError: (msg: string) => void;
};

const deviceOptions = [
  { value: "desktop", label: "Desktop", icon: <Monitor className="w-4 h-4" /> },
  { value: "mobile", label: "Mobile", icon: <Smartphone className="w-4 h-4" /> },
] as const;

const locationOptions = [
  { value: "vn", label: "Việt Nam", shortLabel: "VN" },
  { value: "hanoi", label: "Hà Nội", shortLabel: "HN" },
  { value: "hochiminh", label: "Hồ Chí Minh", shortLabel: "HCM" },
  { value: "danang", label: "Đà Nẵng", shortLabel: "DN" },
] as const;

function normalizeDomain(d: string): string {
  try {
    return new URL(d).hostname.replace(/^www\./, "");
  } catch {
    return d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
}

function validateKeywords(keywords: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (keywords.length === 0) issues.push("Chưa có từ khóa nào");
  return { valid: issues.length === 0, issues };
}

function validateDomains(domains: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (domains.length === 0) issues.push("Chưa có domain nào");
  return { valid: issues.length === 0, issues };
}

function validatePairs(keywords: string[], domains: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (keywords.length !== domains.length) {
    issues.push(
      `Số lượng từ khóa (${keywords.length}) và domain (${domains.length}) không khớp`
    );
  }
  return { valid: issues.length === 0, issues };
}

export default function Form({ onStart, onError }: Props) {
  const formRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [location, setLocation] = useState<string>("vn");
  const [keywordsText, setKeywordsText] = useState("");
  const [domainsText, setDomainsText] = useState("");

  const keywords = useMemo(
    () => keywordsText.split("\n").map((s) => s.trim()).filter(Boolean),
    [keywordsText]
  );
  const domains = useMemo(
    () => domainsText.split("\n").map((s) => s.trim()).filter(Boolean),
    [domainsText]
  );
  const totalPairs = useMemo(
    () => Math.min(keywords.length, domains.length),
    [keywords.length, domains.length]
  );

  const keywordValidation = useMemo(() => validateKeywords(keywords), [keywords]);
  const domainValidation = useMemo(() => validateDomains(domains), [domains]);
  const pairValidation = useMemo(() => validatePairs(keywords, domains), [keywords, domains]);

  const canSubmit =
    keywordValidation.valid &&
    domainValidation.valid &&
    pairValidation.valid &&
    totalPairs > 0;

  async function handleSubmit() {
    if (submitting || !canSubmit) return;

    const cleanedDomains = domains.map(normalizeDomain);

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.set("keywords", keywordsText);
      fd.set("domains", cleanedDomains.join("\n"));
      fd.set("device", device);
      fd.set("location", location);

      const resp = await fetch("/api/stream/save", { method: "POST", body: fd });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data?.session_id) throw new Error("Không nhận được session_id");

      onStart({
        sessionId: data.session_id,
        total: totalPairs,
        keywords,
        domains: cleanedDomains,
      });
    } catch (err: any) {
      onError(err?.message || "Gửi dữ liệu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedLocation = locationOptions.find((opt) => opt.value === location);
  const selectedDevice = deviceOptions.find((opt) => opt.value === device);

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow border border-gray-100">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Cấu Hình Google Ranking Checker
            </h3>
            <p className="text-sm text-gray-500">Không giới hạn số lượng kiểm tra</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div ref={formRef} className="p-8">
        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Keywords */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Type className="w-5 h-5 text-blue-600" />
                Keywords
              </label>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                {keywords.length}
              </span>
            </div>
            <textarea
              rows={8}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="seo tools&#10;digital marketing&#10;content strategy"
            />
            {keywordValidation.issues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{issue}</span>
              </div>
            ))}
          </div>

          {/* Domains */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Globe className="w-5 h-5 text-green-600" />
                Domains
              </label>
              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {domains.length}
              </span>
            </div>
            <textarea
              rows={8}
              value={domainsText}
              onChange={(e) => setDomainsText(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="example.com&#10;mydomain.vn&#10;yoursite.org"
            />
            {domainValidation.issues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pair Validation */}
        {pairValidation.issues.length > 0 && (
          <div className="mb-6">
            {pairValidation.issues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {totalPairs > 0 && pairValidation.valid && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 text-md">Tổng quan kiểm tra</h4>
                <div className="text-blue-600 mt-2 text-sm">
                  <span><strong>{totalPairs}</strong> tác vụ • </span>
                  <span><strong>{keywords.length}</strong> từ khóa • </span>
                  <span><strong>{domains.length}</strong> website • </span>
                  <span>Thiết bị: <strong>{selectedDevice?.label}</strong> • </span>
                  <span>Khu vực: <strong>{selectedLocation?.label}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className={`w-full px-8 py-3 rounded-xl font-semibold text-lg transition-all ${
            submitting || !canSubmit
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-95"
          }`}
        >
          {submitting ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Đang khởi tạo...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Power className="w-5 h-5" />
              Bắt đầu kiểm tra ({totalPairs})
            </div>
          )}
        </button>
      </div>
    </div>
  );
}