import { useEffect, useMemo, useRef, useState } from "react";

export type RankResult = {
  keyword: string;
  domain: string;
  position: number | string;
  url: string;
  redirect_chain: string[];
  checked_at: string;
  location_display: string;
  error?: string | null;
};

export type StreamStatus = "idle" | "connecting" | "streaming" | "ended" | "error";

export function useSSE(sessionId: string | null, opts?: { autoClear?: boolean }) {
  const { autoClear = true } = opts || {};
  const [results, setResults] = useState<RankResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");

  const esRef = useRef<EventSource | null>(null);
  const endedRef = useRef(false);

  const url = useMemo(() => {
    if (!sessionId) return null;
    return `/api/stream?session_id=${encodeURIComponent(sessionId)}`;
  }, [sessionId]);

  const cancel = () => {
    endedRef.current = true;
    esRef.current?.close();
    esRef.current = null;
  };

  const restart = () => {
    endedRef.current = false;
    esRef.current?.close();
    esRef.current = null;
  };

  useEffect(() => {
    if (!url) {
      cancel();
      setStatus("idle");
      return;
    }

    if (autoClear) {
      setResults([]);
      setError(null);
    }
    endedRef.current = false;

    setStatus("connecting");
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setStatus("streaming");

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as Partial<RankResult> & { error?: string };

        // Nếu server gửi một "fatal error" (chỉ có error, không có keyword/domain) => đóng stream
        const hasKeywordOrDomain = !!(data && (data.keyword || data.domain));
        if (data?.error && !hasKeywordOrDomain) {
          setError(data.error || "Server error");
          setStatus("error");
          endedRef.current = true;
          es.close();
          esRef.current = null;
          return;
        }

        // Còn lại: coi như là 1 dòng kết quả (kể cả khi có error per-item)
        setResults((prev) => [...prev, data as RankResult]);
      } catch {
        // ignore parse errors (có thể là keep-alive lines)
      }
    };

    const onEnd = () => {
      endedRef.current = true;
      setStatus("ended");
      es.close();
      esRef.current = null;
    };
    es.addEventListener("end", onEnd);

    es.onerror = () => {
      // Nếu đã kết thúc hợp lệ thì bỏ qua lỗi do đóng kết nối tự nhiên
      if (endedRef.current || es.readyState === EventSource.CLOSED) {
        return;
      }
      setError("SSE connection error");
      setStatus("error");
      es.close();
      esRef.current = null;
    };

    return () => {
      es.removeEventListener("end", onEnd as EventListener);
      try { es.close(); } catch {}
      esRef.current = null;
    };
  }, [url, autoClear]);

  return { results, error, status, setResults, setError, cancel, restart };
}