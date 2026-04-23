import {
  buildQualityDailyReport,
  listQualityDailyReports,
  storeQualityDailyReport,
} from "@/lib/quality-daily-report";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const toSafeInt = (
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
) => {
  const n = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(n, max));
};

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const days = toSafeInt(sp.get("days"), 7, 1, 30);
    const includeLive = sp.get("includeLive") === "true";

    const reports = await listQualityDailyReports({ clientId, days });
    if (!includeLive) {
      return NextResponse.json({ data: reports });
    }

    const liveMetrics = await buildQualityDailyReport({ clientId });
    return NextResponse.json({
      data: reports,
      live: liveMetrics,
    });
  } catch (error) {
    console.error("[GET /api/quality/daily-report]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      reportDate?: string;
    };

    const metrics = await buildQualityDailyReport({
      clientId,
      reportDate: body.reportDate,
    });
    await storeQualityDailyReport(clientId, metrics);

    return NextResponse.json({ success: true, data: metrics });
  } catch (error) {
    console.error("[POST /api/quality/daily-report]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
