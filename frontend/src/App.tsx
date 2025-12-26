import { useMemo, useState } from "react";
import Form from "@components/Form";
import ProgressBar from "@components/ProgressBar";
import ResultTable from "@components/ResultTable";
import UserTemplate from "@components/UserTemplate";
import TopHighlights from "@components/TopHighlights";
import { useSSE, type RankResult } from "@hooks/useSSE";
import { useTheme } from "@contexts/ThemeContext";
import {
  ShieldCheck,
  AlertTriangle,
  Sun,
  Moon
} from "lucide-react";

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expectedTotal, setExpectedTotal] = useState<number>(0);
  const [templateData, setTemplateData] = useState<{ keywords: string; domains: string } | null>(null);
  const { theme, toggleTheme } = useTheme();

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

  function handleUseTemplate(keywords: string, domains: string) {
    setTemplateData({ keywords, domains });
    // Reset after a short delay to allow Form to pick up the data
    setTimeout(() => setTemplateData(null), 100);
  }

  // Background patterns
  const getBackgroundStyle = () => {
    if (theme === "dark") {
      return {
        backgroundImage: `
          linear-gradient(rgba(55, 65, 81, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(55, 65, 81, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        backgroundColor: '#0f172a'
      };
    }
    return {
      backgroundImage: `
        linear-gradient(rgba(229, 231, 235, 0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(229, 231, 235, 0.5) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      backgroundColor: '#f8fafc'
    };
  };

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={getBackgroundStyle()}
    >
      {/* Header */}
      <header className="pt-8 pb-6">
        {/* Top Badge */}
        <div className="flex justify-center mb-4">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 border rounded-full text-sm font-medium shadow-sm ${
            theme === "dark"
              ? "border-blue-700 bg-blue-900/50 text-blue-300"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}>
            <ShieldCheck size={16} className={theme === "dark" ? "text-blue-400" : "text-blue-600"} />
            <span>AE SEO1</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-2">
          <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Công cụ kiểm tra <span className="text-blue-600">Ranking Google</span>
          </h1>
          <p className={`text-sm max-w-2xl mx-auto ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Kiểm tra thứ hạng từ khóa trên Google trong vài giây
          </p>
        </div>

        {/* Theme Toggle */}
        <div className="flex justify-center mt-5">
          <button
            onClick={toggleTheme}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-all ${
              theme === "dark"
                ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {theme === "dark" ? (
              <>
                <Sun size={16} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={16} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          <>
            {/* Form */}
            <div className={`rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/50"
                : "bg-white/50 border-gray-200/50"
            }`}>
              <Form
                onStart={handleStart}
                onError={(msg) => setError(msg)}
                initialKeywords={templateData?.keywords}
                initialDomains={templateData?.domains}
              />
            </div>

            {/* Progress */}
            {(expectedTotal > 0 || results.length > 0) && (
              <div className={`rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden ${
                theme === "dark"
                  ? "bg-gray-800/50 border-gray-700/50"
                  : "bg-white/50 border-gray-200/50"
              }`}>
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
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className={`rounded-xl border shadow-sm p-4 ${
                theme === "dark"
                  ? "bg-red-900/20 border-red-800"
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                    theme === "dark" ? "text-red-400" : "text-red-600"
                  }`} />
                  <div>
                    <h3 className={`font-bold ${
                      theme === "dark" ? "text-red-300" : "text-red-900"
                    }`}>Có lỗi xảy ra</h3>
                    <div className={`text-sm mt-1 ${
                      theme === "dark" ? "text-red-400" : "text-red-700"
                    }`}>{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Results */}
            <div className={`rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/50"
                : "bg-white/50 border-gray-200/50"
            }`}>
              <TopHighlights topHighlights={topHighlights} />
            </div>

            {/* Results Table */}
            <div className={`rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/50"
                : "bg-white/50 border-gray-200/50"
            }`}>
              <ResultTable results={results as RankResult[]} />
            </div>

            {/* User Template */}
            <div className={`rounded-xl backdrop-blur-sm border shadow-sm overflow-hidden ${
              theme === "dark"
                ? "bg-gray-800/50 border-gray-700/50"
                : "bg-white/50 border-gray-200/50"
            }`}>
              <UserTemplate onUseTemplate={handleUseTemplate} />
            </div>
          </>

        {/* Footer */}
        <footer className="a">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className={`flex items-center justify-center gap-2 text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}>
              <ShieldCheck size={18} className="text-green-600" />
              <span>Hello World © 2025</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}