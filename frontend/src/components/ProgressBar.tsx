import { Loader2, CheckCircle, Zap } from "lucide-react";
import { useTheme } from "@contexts/ThemeContext";

type Props = {
  done: number;
  total: number;
  current?: { keyword?: string; domain?: string } | null;
  statusText?: string;
  ended?: boolean;
};

export default function ProgressBar({ done, total, current, statusText, ended }: Props) {
  const { theme } = useTheme();
  if (!total) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <div className={`rounded-lg border overflow-hidden ${
      theme === "dark" ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
    }`}>
      {/* Progress Bar - Full Width */}
      <div className="relative h-2 overflow-hidden">
        <div className={`absolute inset-0 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`} />
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
            ended
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          }`}
          style={{ width: `${pct}%` }}
        >
          {/* Animated shimmer effect */}
          {!ended && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                 style={{
                   backgroundSize: '200% 100%',
                   animation: 'shimmer 2s infinite'
                 }}
            />
          )}
        </div>
      </div>

      {/* Info Row */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex items-center justify-center w-5 h-5 rounded ${
              ended
                ? theme === "dark" ? "bg-green-900/30" : "bg-green-100"
                : theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
            }`}>
              {!ended ? (
                <Loader2 className={`w-3 h-3 animate-spin ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
              ) : (
                <CheckCircle className={`w-3 h-3 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
              )}
            </div>

            <span className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {statusText || (ended ? "Hoàn thành" : "Đang xử lý")}
            </span>

            {/* Current Task - Inline */}
            {!ended && current?.keyword && (
              <>
                <div className={`w-px h-4 ${theme === "dark" ? "bg-gray-600" : "bg-gray-300"}`} />
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap className={`w-3 h-3 shrink-0 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                  <span className={`text-xs truncate ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    <span className="font-semibold">"{current.keyword}"</span>
                    {current.domain && (
                      <>
                        {" • "}
                        <span className={`font-mono ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                          {current.domain}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right: Progress Stats */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              {done}/{total}
            </span>
            <div className={`px-2 py-0.5 rounded-md text-xs font-bold ${
              ended
                ? "bg-green-500 text-white"
                : theme === "dark"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-blue-50 text-blue-600 border border-blue-200"
            }`}>
              {pct}%
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
