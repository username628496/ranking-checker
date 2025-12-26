import React, { useMemo, useRef, useState } from "react";
import { useTheme } from "@contexts/ThemeContext";
import {
  Settings,
  Monitor,
  Smartphone,
  Globe,
  Type,
  Zap,
  Play,
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
  initialKeywords?: string;
  initialDomains?: string;
};

const deviceOptions = [
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "mobile", label: "Mobile", icon: Smartphone },
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
  if (keywords.length === 0) issues.push("Chưa có từ khóa");
  return { valid: issues.length === 0, issues };
}

function validateDomains(domains: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (domains.length === 0) issues.push("Chưa có domain");
  return { valid: issues.length === 0, issues };
}

function validatePairs(keywords: string[], domains: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (keywords.length !== domains.length) {
    issues.push(
      `Số lượng không khớp: ${keywords.length} từ khóa & ${domains.length} domain`
    );
  }
  return { valid: issues.length === 0, issues };
}

export default function Form({ onStart, onError, initialKeywords, initialDomains }: Props) {
  const { theme } = useTheme();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [location, setLocation] = useState<string>("vn");
  const [keywordsText, setKeywordsText] = useState(initialKeywords || "");
  const [domainsText, setDomainsText] = useState(initialDomains || "");

  // Update text when template data changes
  React.useEffect(() => {
    if (initialKeywords !== undefined && initialKeywords !== null) {
      setKeywordsText(initialKeywords);
    }
    if (initialDomains !== undefined && initialDomains !== null) {
      setDomainsText(initialDomains);
    }
  }, [initialKeywords, initialDomains]);

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
    <div className="rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden">
      {/* Header with Settings - Stripe Style */}
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

        <div className="flex items-center justify-between gap-6">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
              theme === "dark"
                ? "bg-gradient-to-br from-orange-500/10 to-orange-600/5 shadow-lg shadow-orange-500/5"
                : "bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-sm"
            }`}>
              <Settings className={`w-4.5 h-4.5 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
            </div>
            <div>
              <h3 className={`font-semibold text-base tracking-tight ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>Cấu hình kiểm tra</h3>
            </div>
          </div>

          {/* Right: Device & Location */}
          <div className="flex items-center gap-3">
            {/* Device Selection */}
            <div className="flex gap-1.5">
              {deviceOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = device === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDevice(opt.value)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-md
                      text-xs font-medium transition-all duration-200
                      ${isActive
                        ? "bg-blue-500 text-white shadow-sm"
                        : theme === "dark"
                          ? "bg-gray-700 border border-gray-600 text-gray-200 hover:border-gray-500 hover:bg-gray-600"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className={`w-px h-6 ${theme === "dark" ? "bg-gray-600" : "bg-gray-200"}`}></div>

            {/* Location Selection */}
            <div className="flex gap-1.5">
              {locationOptions.map((opt) => {
                const isActive = location === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLocation(opt.value)}
                    className={`
                      px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                      ${isActive
                        ? "bg-blue-500 text-white shadow-sm"
                        : theme === "dark"
                          ? "bg-gray-700 border border-gray-600 text-gray-200 hover:border-gray-500 hover:bg-gray-600"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                    title={opt.label}
                  >
                    {opt.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">

        {/* Input Section */}
        <div ref={formRef} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Keywords */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className={`text-xs font-medium flex items-center gap-1.5 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <Type className="w-3.5 h-3.5" />
                  Từ khóa
                </span>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{keywords.length}</span>
              </label>
              <textarea
                rows={7}
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                className={`
                  w-full px-3.5 py-2.5 rounded-lg border
                  text-sm transition-all duration-200 resize-none
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 hover:border-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 hover:border-gray-300"
                  }
                `}
                placeholder="seo tools&#10;digital marketing&#10;content strategy"
              />
              {keywordValidation.issues.map((issue, i) => (
                <p key={i} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {issue}
                </p>
              ))}
            </div>

            {/* Domains */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className={`text-xs font-medium flex items-center gap-1.5 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <Globe className="w-3.5 h-3.5" />
                  Domain
                </span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">{domains.length}</span>
              </label>
              <textarea
                rows={7}
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
                className={`
                  w-full px-3.5 py-2.5 rounded-lg border
                  text-sm transition-all duration-200 resize-none
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 hover:border-gray-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 hover:border-gray-300"
                  }
                `}
                placeholder="example.com&#10;mydomain.vn&#10;yoursite.org"
              />
              {domainValidation.issues.map((issue, i) => (
                <p key={i} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {issue}
                </p>
              ))}
            </div>
          </div>

          {/* Validation Errors */}
          {pairValidation.issues.length > 0 && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
              theme === "dark"
                ? "bg-amber-900/20 border border-amber-800"
                : "bg-amber-50 border border-amber-200"
            }`}>
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${
                theme === "dark" ? "text-amber-400" : "text-amber-600"
              }`} />
              <span className={`text-sm ${
                theme === "dark" ? "text-amber-300" : "text-amber-800"
              }`}>{pairValidation.issues[0]}</span>
            </div>
          )}

          {/* Ready Summary - Compact Single Row */}
          {totalPairs > 0 && pairValidation.valid && (
            <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${
              theme === "dark"
                ? "bg-linear-to-r from-blue-900/30 to-indigo-900/30 border-blue-800"
                : "bg-linear-to-r from-blue-50 to-indigo-50 border-blue-100"
            }`}>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500 text-white">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className={`text-sm font-semibold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>Sẵn sàng kiểm tra</span>
              </div>

              <div className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Type className={`w-3.5 h-3.5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                  <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Từ khóa:</span>
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{keywords.length}</span>
                </div>
                <div className={`w-px h-4 ${theme === "dark" ? "bg-blue-700" : "bg-blue-200"}`}></div>
                <div className="flex items-center gap-1.5">
                  <Globe className={`w-3.5 h-3.5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                  <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Domain:</span>
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{domains.length}</span>
                </div>
                <div className={`w-px h-4 ${theme === "dark" ? "bg-blue-700" : "bg-blue-200"}`}></div>
                <div className="flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                  <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>Tác vụ:</span>
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{totalPairs}</span>
                </div>
                <div className={`w-px h-4 ${theme === "dark" ? "bg-blue-700" : "bg-blue-200"}`}></div>
                <div className="flex items-center gap-1.5">
                  {selectedDevice && (
                    <>
                      <selectedDevice.icon className={`w-3.5 h-3.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} />
                      <span className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{selectedDevice.label}</span>
                    </>
                  )}
                </div>
                <div className={`w-px h-4 ${theme === "dark" ? "bg-blue-700" : "bg-blue-200"}`}></div>
                <div className="flex items-center gap-1.5">
                  <Globe className={`w-3.5 h-3.5 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`} />
                  <span className={`text-xs font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{selectedLocation?.label}</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className={`
              w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg
              font-medium text-sm transition-all duration-200
              ${submitting || !canSubmit
                ? theme === "dark"
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md active:scale-[0.98]"
              }
            `}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang khởi tạo...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Bắt đầu kiểm tra ({totalPairs})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
