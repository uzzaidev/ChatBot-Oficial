import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

interface PendingResponse {
  data?: {
    pendingCount: number;
    totalReviewable: number;
    reviewedCount: number;
  };
  error?: string;
}

export const useQualityPendingCount = (pollMs = 30000) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    try {
      const response = await apiFetch("/api/evaluations/pending");
      const json = (await response.json()) as PendingResponse;
      if (!response.ok || !json.data) {
        setPendingCount(0);
        return;
      }
      setPendingCount(json.data.pendingCount ?? 0);
    } catch {
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPending();
    const timer = window.setInterval(() => {
      void fetchPending();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [fetchPending, pollMs]);

  return {
    pendingCount,
    loading,
    refresh: fetchPending,
  };
};
