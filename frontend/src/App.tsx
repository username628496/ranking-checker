import React, { useMemo, useState } from "react";
import Form from "@components/Form";
import ProgressBar from "@components/ProgressBar";
import ResultTable from "@components/ResultTable";
import UserTemplate from "@components/UserTemplate";
import TopHighlights from "@components/TopHighlights";
import { useSSE, type RankResult } from "@hooks/useSSE";
import { 
  Settings, 
  ShieldCheck, 
  Search, 
  Trophy, 
  AlertTriangle,
  Crown,
  Medal,
  Award,
  Star,
  TrendingUp
} from "lucide-react";

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expectedTotal, setExpectedTotal] = useState<number>(0);

  const { results, error, status, setResults, setError, cancel } = useSSE(sessionId, {
    autoClear: true,
  });

  const done = results.length;
  const current = results.length ? results[results.length - 1] : null;

  // Sửa lại logic để hiển thị top 10 (thay vì 6)
  const topHighlights = useMemo(
    () =>
      results.filter((r) =>
        typeof r.position === "number"
          ? r.position <= 10
          : Number(r.position) <= 10
      ),
    [results]
  );

  // ✅ Thêm type cho parameter position
  const getRankDisplay = (position: number | string) => {
    const pos = typeof position === 'number' ? position : Number(position);
    switch (pos) {
      case 1:
        return { 
          icon: Crown, 
          bgColor: "bg-yellow-500", 
          textColor: "text-white",
          shadowColor: "shadow-yellow-200"
        };
      case 2:
        return { 
          icon: Medal, 
          bgColor: "bg-slate-400", 
          textColor: "text-white",
          shadowColor: "shadow-slate-200"
        };
      case 3:
        return { 
          icon: Award, 
          bgColor: "bg-amber-600", 
          textColor: "text-white",
          shadowColor: "shadow-amber-200"
        };
      default:
        return { 
          icon: Star, 
          bgColor: "bg-blue-500", 
          textColor: "text-white",
          shadowColor: "shadow-blue-200"
        };
    }
  };

  function handleStart(p: {
    sessionId: string;
    total: number;
    keywords: string[];
    domains: string[];
  }) {
    cancel();
    setSessionId(null);
    setResults([]);
    setError(null);
    setExpectedTotal(p.total);
    setSessionId(p.sessionId);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium">
            <Search className="w-4 h-4" />
            SEO Ranking Checker
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Kiểm tra thứ hạng từ khóa
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Công cụ kiểm tra vị trí từ khóa trên Google nhanh chóng và chính xác
          </p>
        </div>

        {/* Form */}
        <Form onStart={handleStart} onError={(msg) => setError(msg)} />

        {/* Progress */}
        {(expectedTotal > 0 || results.length > 0) && (
          <ProgressBar
            done={done}
            total={expectedTotal || done}
            current={current ? { keyword: current.keyword, domain: current.domain } : null}
            statusText={
              status === "error"
                ? `Lỗi: ${error}`
                : status === "ended"
                ? "Hoàn thành"
                : status === "streaming"
                ? "Đang kiểm tra..."
                : "Đang chuẩn bị..."
            }
            ended={status === "ended"}
          />
        )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Có lỗi xảy ra</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

       {/* Top Results */}
        <TopHighlights topHighlights={topHighlights} />

        {/* Results Table */}
        <ResultTable results={results as RankResult[]} />

        {/* User Template */}
        <UserTemplate />

        {/* Footer */}
        <footer className=" text-gray-600">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Hello World © 2025</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}