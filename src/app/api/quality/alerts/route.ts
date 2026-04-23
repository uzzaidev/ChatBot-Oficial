import { query } from "@/lib/postgres";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AlertSeverity = "critical" | "warning" | "info";

interface QualityAlert {
  code: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
}

const pct = (value: number): number => Number((value * 100).toFixed(2));

const pushAlert = (
  alerts: QualityAlert[],
  payload: QualityAlert,
): void => {
  alerts.push(payload);
};

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient() as any;
    const now = Date.now();
    const since15m = new Date(now - 15 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: traces15m, error: traces15Error }, { data: traces24h, error: traces24Error }] =
      await Promise.all([
        supabase
          .from("message_traces")
          .select("status, latency_total_ms")
          .eq("client_id", clientId)
          .gte("created_at", since15m),
        supabase
          .from("message_traces")
          .select("phone")
          .eq("client_id", clientId)
          .gte("created_at", since24h),
      ]);

    if (traces15Error) throw new Error(traces15Error.message);
    if (traces24Error) throw new Error(traces24Error.message);

    const recent = traces15m ?? [];
    const total15 = recent.length;
    const pending15 = recent.filter((row: { status: string }) => row.status === "pending").length;
    const failed15 = recent.filter((row: { status: string }) => row.status === "failed").length;
    const avgLatency15 =
      total15 > 0
        ? recent.reduce(
            (acc: number, row: { latency_total_ms: number | null }) =>
              acc + (row.latency_total_ms ?? 0),
            0,
          ) / total15
        : 0;

    const alerts: QualityAlert[] = [];
    const pendingRatio15 = total15 > 0 ? pending15 / total15 : 0;
    const failedRatio15 = total15 > 0 ? failed15 / total15 : 0;

    if (pendingRatio15 > 0.2) {
      pushAlert(alerts, {
        code: "high_pending_ratio_15m",
        severity: pendingRatio15 > 0.35 ? "critical" : "warning",
        message: "Taxa de pending alta nos ultimos 15 minutos",
        value: pct(pendingRatio15),
        threshold: 20,
      });
    }

    if (failedRatio15 > 0.05) {
      pushAlert(alerts, {
        code: "high_failed_ratio_15m",
        severity: failedRatio15 > 0.12 ? "critical" : "warning",
        message: "Taxa de falha alta nos ultimos 15 minutos",
        value: pct(failedRatio15),
        threshold: 5,
      });
    }

    if (avgLatency15 > 12000 && total15 >= 5) {
      pushAlert(alerts, {
        code: "high_latency_15m",
        severity: avgLatency15 > 18000 ? "critical" : "warning",
        message: "Latencia media elevada nos ultimos 15 minutos",
        value: Number(avgLatency15.toFixed(0)),
        threshold: 12000,
      });
    }

    const phoneDigits = Array.from(
      new Set(
        (traces24h ?? [])
          .map((row: { phone: string }) => String(row.phone ?? "").replace(/\D/g, ""))
          .filter((phone: string) => phone.length > 0),
      ),
    );

    let coverage: {
      contatos_no_periodo: number;
      com_experiencia: number;
      com_periodo_ou_dia: number;
    } | null = null;

    if (phoneDigits.length > 0) {
      try {
        const coverageResult = await query<{
          contatos_no_periodo: number;
          com_experiencia: number;
          com_periodo_ou_dia: number;
        }>(
          `
          WITH phones AS (
            SELECT UNNEST($1::text[]) AS phone
          ),
          contacts AS (
            SELECT
              regexp_replace(telefone::text, '\\D', '', 'g') AS phone,
              metadata
            FROM clientes_whatsapp
            WHERE client_id = $2
          )
          SELECT
            COUNT(*)::int AS contatos_no_periodo,
            COUNT(*) FILTER (
              WHERE COALESCE(NULLIF(c.metadata->>'experiencia', ''), NULLIF(c.metadata->>'experiencia_yoga', '')) IS NOT NULL
            )::int AS com_experiencia,
            COUNT(*) FILTER (
              WHERE COALESCE(NULLIF(c.metadata->>'periodo_preferido', ''), NULLIF(c.metadata->>'dia_preferido', '')) IS NOT NULL
            )::int AS com_periodo_ou_dia
          FROM phones p
          LEFT JOIN contacts c ON c.phone = p.phone
          `,
          [phoneDigits, clientId],
        );
        coverage = coverageResult.rows[0] ?? null;
      } catch (coverageError) {
        console.warn("[GET /api/quality/alerts] coverage query failed", {
          clientId,
          error:
            coverageError instanceof Error
              ? coverageError.message
              : String(coverageError),
        });
        coverage = null;
      }
    }

    if (coverage && coverage.contatos_no_periodo > 0) {
      const expRate = coverage.com_experiencia / coverage.contatos_no_periodo;
      const periodRate =
        coverage.com_periodo_ou_dia / coverage.contatos_no_periodo;

      if (expRate < 0.4) {
        pushAlert(alerts, {
          code: "low_metadata_experiencia",
          severity: expRate < 0.25 ? "critical" : "warning",
          message: "Cobertura de experiencia com yoga abaixo da meta",
          value: pct(expRate),
          threshold: 40,
        });
      }

      if (periodRate < 0.4) {
        pushAlert(alerts, {
          code: "low_metadata_periodo_dia",
          severity: periodRate < 0.25 ? "critical" : "warning",
          message: "Cobertura de periodo/dia preferido abaixo da meta",
          value: pct(periodRate),
          threshold: 40,
        });
      }
    }

    return NextResponse.json({
      data: {
        window15m: {
          total: total15,
          pending: pending15,
          failed: failed15,
          pendingRatioPct: pct(pendingRatio15),
          failedRatioPct: pct(failedRatio15),
          avgLatencyMs: Number(avgLatency15.toFixed(0)),
        },
        coverage24h: coverage,
        alerts,
      },
    });
  } catch (error) {
    console.error("[GET /api/quality/alerts]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
