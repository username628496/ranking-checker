import { ExternalLink, Trophy, Target, TrendingUp, Globe, Calendar, MapPin } from "lucide-react";
import { useTheme } from "@contexts/ThemeContext";

type RankResult = {
  keyword: string;
  domain: string;
  position: number | string;
  url?: string;
  checked_at?: string;
  location_display?: string;
};

function hostFromUrl(u?: string | null) {
  if (!u || u === "-") return "-";
  try {
    return new URL(u).host || u;
  } catch {
    return u;
  }
}

export default function ResultTable({ results }: { results: RankResult[] }) {
  const { theme } = useTheme();

  if (!results.length) {
    return (
      <div className="rounded-xl backdrop-blur-sm border shadow-sm p-12">
        <div className="flex flex-col items-center text-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-100"
          }`}>
            <Trophy className={`w-6 h-6 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
          </div>
          <p className={`font-semibold text-sm mb-1 ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>Chưa có kết quả</p>
          <p className={`text-xs ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>Hãy thêm từ khóa để bắt đầu kiểm tra</p>
        </div>
      </div>
    );
  }

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

        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
            theme === "dark"
              ? "bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-lg shadow-purple-500/5"
              : "bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-sm"
          }`}>
            <Trophy className={`w-4.5 h-4.5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-base tracking-tight ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Kết quả kiểm tra</h3>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{results.length} kết quả</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={theme === "dark" ? "bg-gray-800/50" : "bg-gray-50"}>
            <tr className={`border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}>#</th>
              <th className="px-4 py-3 text-left">
                <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <Target className="w-3 h-3" />
                  <span>Từ khóa</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <Globe className="w-3 h-3" />
                  <span>Domain</span>
                </div>
              </th>
              <th className="px-4 py-3 text-center">
                <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  <span>Rank</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <ExternalLink className="w-3 h-3" />
                  <span>URL</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span>Ngày</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}>
                  <MapPin className="w-3 h-3" />
                  <span>Vị trí</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
            {results.map((r, i) => {
              const posNum = typeof r.position === "number" ? r.position : Number(r.position);
              const isNA = Number.isNaN(posNum);

              let badgeColor = theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700";
              if (!isNA) {
                if (posNum <= 3) {
                  badgeColor = "bg-green-500 text-white";
                } else if (posNum <= 6) {
                  badgeColor = "bg-yellow-500 text-white";
                } else if (posNum <= 10) {
                  badgeColor = "bg-red-500 text-white";
                } else if (posNum <= 20) {
                  badgeColor = theme === "dark" ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-700";
                } else if (posNum <= 50) {
                  badgeColor = theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700";
                } else {
                  badgeColor = theme === "dark" ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-500";
                }
              }

              return (
                <tr key={`${r.keyword}-${i}`} className={`transition-colors ${
                  theme === "dark" ? "hover:bg-gray-800/50" : "hover:bg-gray-50"
                }`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${
                      theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}>
                      {i + 1}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className={`font-medium text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{r.keyword}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded border font-mono text-xs ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-gray-300"
                        : "bg-gray-100 border-gray-200 text-gray-700"
                    }`}>
                      {r.domain}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${badgeColor}`}>
                      {isNA ? "N/A" : `#${posNum}`}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {r.url && !isNA ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1 text-xs max-w-[180px] group ${
                          theme === "dark"
                            ? "text-blue-400 hover:text-blue-300"
                            : "text-blue-600 hover:text-blue-700"
                        }`}
                      >
                        <span className="truncate">{hostFromUrl(r.url)}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    ) : (
                      <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{r.checked_at || "-"}</span>
                  </td>

                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1.5 text-xs ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {r.location_display || "-"}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className={`px-6 py-4 border-t ${
        theme === "dark"
          ? "bg-gray-800/50 border-gray-700"
          : "bg-gray-50 border-gray-200"
      }`}>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
              {results.filter(r => {
                const pos = Number(r.position);
                return !isNaN(pos) && pos <= 3;
              }).length}
            </div>
            <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Top 1-3</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
              {results.filter(r => {
                const pos = Number(r.position);
                return !isNaN(pos) && pos >= 4 && pos <= 6;
              }).length}
            </div>
            <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Top 4-6</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
              {results.filter(r => {
                const pos = Number(r.position);
                return !isNaN(pos) && pos >= 7 && pos <= 10;
              }).length}
            </div>
            <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Top 7-10</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              {results.filter(r => {
                const pos = Number(r.position);
                return !isNaN(pos) && pos >= 11 && pos <= 50;
              }).length}
            </div>
            <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Top 11-50</div>
          </div>
        </div>
      </div>
    </div>
  );
}
