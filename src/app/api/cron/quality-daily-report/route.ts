import { runQualityDailyReports } from "@/lib/quality-daily-report";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isAuthorizedCronRequest = (request: NextRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
};

const toSafeInt = (
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number => {
  const n = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(n, max));
};

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const reportDate = sp.get("reportDate") || undefined;
    const clientId = sp.get("clientId") || undefined;
    const limitClients = toSafeInt(sp.get("limitClients"), 200, 1, 1000);

    const result = await runQualityDailyReports({
      reportDate,
      clientId,
      limitClients,
    });

    return NextResponse.json({
      success: true,
      clientId: clientId ?? null,
      reportDate: reportDate ?? result.reportDate,
      limitClients,
      result,
    });
  } catch (error) {
    console.error("[cron/quality-daily-report] error", error);
    return NextResponse.json(
      {
        error: "Failed to generate quality daily report",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
