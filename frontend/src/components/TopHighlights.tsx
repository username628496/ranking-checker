import { Trophy, Crown, Medal, Award, Star, Zap } from "lucide-react";
import { useTheme } from "@contexts/ThemeContext";
import type { RankResult } from "@hooks/useSSE";

function getRankDisplay(position: number | string) {
  const pos = typeof position === "number" ? position : Number(position);

  // Top 1-3: màu xanh lá (green)
  if (pos <= 3) {
    switch (pos) {
      case 1:
        return { icon: Crown, color: "bg-emerald-600 dark:bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", bgLight: "bg-emerald-50 dark:bg-emerald-500/10", borderColor: "border-emerald-200 dark:border-emerald-500/20", label: "Champion" };
      case 2:
        return { icon: Medal, color: "bg-emerald-600 dark:bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", bgLight: "bg-emerald-50 dark:bg-emerald-500/10", borderColor: "border-emerald-200 dark:border-emerald-500/20", label: "Top 2" };
      case 3:
        return { icon: Award, color: "bg-emerald-600 dark:bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", bgLight: "bg-emerald-50 dark:bg-emerald-500/10", borderColor: "border-emerald-200 dark:border-emerald-500/20", label: "Top 3" };
    }
  }

  // Top 4-6: màu vàng (yellow)
  if (pos >= 4 && pos <= 6) {
    return { icon: Star, color: "bg-yellow-500 dark:bg-yellow-600", textColor: "text-yellow-600 dark:text-yellow-400", bgLight: "bg-yellow-50 dark:bg-yellow-500/10", borderColor: "border-yellow-200 dark:border-yellow-500/20", label: `Top ${pos}` };
  }

  // Top 7-10: màu đỏ (red)
  if (pos >= 7 && pos <= 10) {
    return { icon: Star, color: "bg-red-500 dark:bg-red-600", textColor: "text-red-600 dark:text-red-400", bgLight: "bg-red-50 dark:bg-red-500/10", borderColor: "border-red-200 dark:border-red-500/20", label: `Top ${pos}` };
  }

  return { icon: Star, color: "bg-slate-600 dark:bg-slate-500", textColor: "text-slate-600 dark:text-slate-400", bgLight: "bg-slate-50 dark:bg-slate-800", borderColor: "border-slate-200 dark:border-slate-700", label: `Top ${pos}` };
}

type Props = {
  topHighlights: RankResult[];
};

export default function TopHighlights({ topHighlights }: Props) {
  const { theme } = useTheme();
  const top10 = topHighlights.filter((r) => {
    const pos = typeof r.position === "number" ? r.position : Number(r.position);
    return !isNaN(pos) && pos <= 10;
  });

  if (!top10.length) return null;

  return (
    <div className="rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden">
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
                ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-lg shadow-amber-500/5"
                : "bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-sm"
            }`}>
              <Trophy className={`w-4.5 h-4.5 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div>
              <h3 className={`font-semibold text-base tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Top Rankings</h3>
              <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{top10.length} từ khóa trong top 10</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
            theme === "dark"
              ? "bg-green-900/20 border-green-800"
              : "bg-green-50 border-green-100"
          }`}>
            <Zap className={`w-3 h-3 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
            <span className={`text-xs font-medium ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>Live</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Top 1-3 - Green */}
        {top10.some(r => Number(r.position) <= 3) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-green-500 rounded-full"></div>
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>Top 1 - 3</h4>
              <div className={`flex-1 h-px ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top10.filter(r => Number(r.position) <= 3).map((result, idx) => {
                const rank = getRankDisplay(result.position);
                const Icon = rank.icon;
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 hover:shadow-md transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-green-800/50"
                        : "bg-white border-green-200"
                    }`}
                  >
                    {/* Compact header with icon and rank */}
                    <div className="flex items-center justify-between mb-2">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                        theme === "dark" ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-green-500 text-white text-xs font-bold">
                        #{result.position}
                      </div>
                    </div>

                    {/* Content in single row */}
                    <div className="flex items-center gap-2">
                      <h5 className={`flex-1 font-semibold text-xs leading-tight truncate ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {result.keyword}
                      </h5>
                      <span className={`px-1.5 py-0.5 rounded border font-mono text-xs truncate max-w-[40%] ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-gray-300"
                          : "bg-gray-100 border-gray-200 text-gray-600"
                      }`}>
                        {result.domain}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Positions 4-6 - Yellow */}
        {top10.some(r => Number(r.position) >= 4 && Number(r.position) <= 6) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-yellow-500 rounded-full"></div>
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>Top 4 - 6</h4>
              <div className={`flex-1 h-px ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top10.filter(r => Number(r.position) >= 4 && Number(r.position) <= 6).map((result, idx) => {
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 hover:shadow-md transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-yellow-800/50"
                        : "bg-white border-yellow-200"
                    }`}
                  >
                    {/* Compact header with rank badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-0.5 rounded-md bg-yellow-500 text-white text-xs font-bold">
                        #{result.position}
                      </div>
                      <Star className={`w-3 h-3 ${theme === "dark" ? "text-yellow-400" : "text-yellow-500"}`} />
                    </div>

                    {/* Content in single row */}
                    <div className="flex items-center gap-2">
                      <h5 className={`flex-1 font-semibold text-xs leading-tight truncate ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {result.keyword}
                      </h5>
                      <span className={`px-1.5 py-0.5 rounded border font-mono text-xs truncate max-w-[40%] ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-gray-300"
                          : "bg-gray-100 border-gray-200 text-gray-600"
                      }`}>
                        {result.domain}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Positions 7-10 - Red */}
        {top10.some(r => Number(r.position) >= 7 && Number(r.position) <= 10) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-red-500 rounded-full"></div>
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>Top 7 - 10</h4>
              <div className={`flex-1 h-px ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top10.filter(r => Number(r.position) >= 7 && Number(r.position) <= 10).map((result, idx) => {
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 hover:shadow-md transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-gray-800 border-red-800/50"
                        : "bg-white border-red-200"
                    }`}
                  >
                    {/* Compact header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="px-2 py-0.5 rounded-md bg-red-500 text-white text-xs font-bold">
                        #{result.position}
                      </div>
                      <Star className={`w-3 h-3 ${theme === "dark" ? "text-red-400" : "text-red-500"}`} />
                    </div>

                    {/* Content in single row */}
                    <div className="flex items-center gap-2">
                      <h5 className={`flex-1 font-semibold text-xs leading-tight truncate ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {result.keyword}
                      </h5>
                      <span className={`px-1.5 py-0.5 rounded border font-mono text-xs truncate max-w-[40%] ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600 text-gray-300"
                          : "bg-gray-100 border-gray-200 text-gray-600"
                      }`}>
                        {result.domain}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
