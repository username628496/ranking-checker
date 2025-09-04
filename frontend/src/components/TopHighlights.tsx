import React from "react";
import { Trophy, TrendingUp, Crown, Medal, Award, Star } from "lucide-react";
import type { RankResult } from "@hooks/useSSE";

function getRankDisplay(position: number | string) {
  const pos = typeof position === "number" ? position : Number(position);
  switch (pos) {
    case 1:
      return { icon: Crown, bgColor: "bg-yellow-500", textColor: "text-white" };
    case 2:
      return { icon: Medal, bgColor: "bg-slate-400", textColor: "text-white" };
    case 3:
      return { icon: Award, bgColor: "bg-amber-600", textColor: "text-white" };
    default:
      return { icon: Star, bgColor: "bg-blue-500", textColor: "text-white" };
  }
}

type Props = {
  topHighlights: RankResult[];
};

export default function TopHighlights({ topHighlights }: Props) {
  // Chỉ lấy những kết quả <= 6
  const top6 = topHighlights.filter((r) => {
    const pos = typeof r.position === "number" ? r.position : Number(r.position);
    return !isNaN(pos) && pos <= 6;
  });

  if (!top6.length) return null;

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="relative px-8 py-6 bg-slate-900 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Top 6 Ranking</h3>
              <p className="text-slate-300 text-sm">
                {top6.length} từ khóa đạt vị trí ≤ 6
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Highlight</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-8 space-y-6">
        {/* Top 3 đặc biệt */}
        <div className="grid md:grid-cols-3 gap-6">
          {top6.filter(r => Number(r.position) <= 3).map((result, idx) => {
            const rank = getRankDisplay(result.position);
            const Icon = rank.icon;
            return (
              <div
                key={idx}
                className="relative p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* Badge */}
                <div className="absolute -top-3 -right-3">
                  <div
                    className={`w-10 h-10 ${rank.bgColor} rounded-full flex items-center justify-center shadow-md`}
                  >
                    <Icon className={`w-5 h-5 ${rank.textColor}`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-bold text-slate-700">
                    #{result.position}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 line-clamp-2">
                      {result.keyword}
                    </h4>
                    <p className="text-sm text-slate-500 font-mono">
                      {result.domain}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Các vị trí 4–6 */}
        {top6.some(r => Number(r.position) > 3) && (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              Vị trí 4–6
            </h4>
            {top6.filter(r => Number(r.position) > 3).map((result, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all duration-200 border border-slate-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                    <span className="font-bold text-slate-700 text-lg">
                      {result.position}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900">
                      {result.keyword}
                    </h5>
                    <p className="text-sm text-slate-500 font-mono">
                      {result.domain}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 shadow-sm">
                  Top {result.position}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}