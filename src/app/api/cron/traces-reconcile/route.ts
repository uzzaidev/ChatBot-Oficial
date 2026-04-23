import { reconcileTraces } from "@/lib/trace-reconciliation";
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
    const lookbackHours = toSafeInt(sp.get("lookbackHours"), 24, 1, 168);
    const limit = toSafeInt(sp.get("limit"), 400, 20, 2000);
    const dryRun = sp.get("dryRun") === "true";
    const clientId = sp.get("clientId") || undefined;

    const result = await reconcileTraces({
      clientId,
      lookbackHours,
      limit,
      dryRun,
    });

    return NextResponse.json({
      success: true,
      dryRun,
      lookbackHours,
      limit,
      clientId: clientId ?? null,
      result,
    });
  } catch (error) {
    console.error("[cron/traces-reconcile] error", error);
    return NextResponse.json(
      {
        error: "Failed to reconcile traces",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

