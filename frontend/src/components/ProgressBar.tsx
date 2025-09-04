import { Loader2, CheckCircle, Activity } from "lucide-react";

type Props = {
  done: number;
  total: number;
  current?: { keyword?: string; domain?: string } | null;
  statusText?: string;
  ended?: boolean;
};

export default function ProgressBar({ done, total, current, statusText, ended }: Props) {
  if (!total) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {!ended ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {statusText || (ended ? "Hoàn thành" : "Đang xử lý...")}
              </p>
              <p className="text-sm text-gray-600">
                {done}/{total} ({pct}%)
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              ended ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Current Task */}
        {!ended && current?.keyword && current?.domain && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Activity className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-blue-800">
              Đang kiểm tra <span className="font-medium">"{current.keyword}"</span> cho {current.domain}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}