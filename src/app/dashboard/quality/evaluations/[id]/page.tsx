"use client";

import { EvaluationDetails, EvaluationDetailPayload } from "@/components/quality/EvaluationDetails";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface EvaluationDetailResponse {
  data?: EvaluationDetailPayload;
  error?: string;
}

export default function QualityEvaluationDetailPage() {
  const params = useParams<{ id: string }>();
  const traceId = params?.id;
  const [detail, setDetail] = useState<EvaluationDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/api/evaluations/${traceId}`);
        const json = (await response.json()) as EvaluationDetailResponse;
        if (!response.ok || !json.data) {
          throw new Error(json.error ?? "Falha ao carregar avaliação");
        }
        if (mounted) setDetail(json.data);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Erro inesperado");
          setDetail(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [traceId]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Detalhe da Avaliação</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <EvaluationDetails detail={detail} loading={loading} />
    </div>
  );
}
