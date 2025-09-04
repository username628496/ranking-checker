import React from "react";
import { ExternalLink, Trophy, Target, Calendar, MapPin, TrendingUp, Eye, Globe } from "lucide-react";

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
  if (!results.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Chưa có kết quả kiểm tra nào</p>
          <p className="text-sm text-gray-400 mt-1">Hãy thêm từ khóa để bắt đầu kiểm tra ranking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
      {/* Enhanced Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                Kết quả kiểm tra
              </h3>
              <p className="text-sm text-gray-500">
                {results.length} từ khóa được phân tích
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Live Data</span>
          </div>
        </div>
      </div>

      {/* Modern Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">#</span>
              </th>
              <th className="px-6 py-4 text-left">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Từ khóa</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left">
              <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />

                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Domain gốc</span>
                </div>
              </th>
              <th className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Vị trí</span>
                </div>
              </th>
              <th className="px-6 py-4 text-center">
              <div className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-gray-500" />

                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Ranking domain</span>
                </div>

              </th>
              <th className="px-6 py-4 text-left">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày kiểm tra</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Khu vực</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((r, i) => {
              const posNum = typeof r.position === "number" ? r.position : Number(r.position);
              const isNA = Number.isNaN(posNum);
              
              let badge;
              if (isNA) {
                badge = "bg-gray-50 text-gray-500 border border-gray-200";
              } else if (posNum <= 6) {
                badge = "bg-green-50 text-green-700 border border-green-200";
              } else if (posNum <= 10) {
                badge = "bg-yellow-50 text-yellow-700 border border-yellow-200";
              } else if (posNum <= 50) {
                badge = "bg-red-50 text-red-700 border border-red-200";
              } else {
                badge = "bg-gray-50 text-gray-500 border border-gray-200";
              }

              return (
                <tr 
                  key={`${r.keyword}-${i}`} 
                  className="hover:bg-gray-50/50 transition-colors duration-150"
                >
                  <td className="px-6 py-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">{i + 1}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">{r.keyword}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-mono text-sm border">
                      {r.domain}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg ${badge}`}>
                        {isNA ? "N/A" : `#${posNum}`}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {r.url && !isNA ? (
                      <a 
                        href={r.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all duration-150 group max-w-48"
                      >
                        <span className="truncate font-medium">{hostFromUrl(r.url)}</span>
                        <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </a>
                    ) : (
                      <span className="text-gray-400 font-medium">-</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className="text-gray-600 font-medium">
                      {r.checked_at || "-"}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {r.location_display || "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

     {/* Footer Stats */}
<div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-4">
      <span className="text-gray-600">
        <strong>{results.filter(r => {
          const pos = Number(r.position);
          return !isNaN(pos) && pos <= 6;
        }).length}</strong> từ khóa trong top 6
      </span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-600">
        <strong>{results.filter(r => {
          const pos = Number(r.position);
          return !isNaN(pos) && pos <= 3;
        }).length}</strong> từ khóa trong top 3
      </span>
    </div>
    <div className="text-gray-500">
      Cập nhật lần cuối: {new Date().toLocaleDateString("vi-VN")}
    </div>
  </div>
</div>
    </div>
  );
}