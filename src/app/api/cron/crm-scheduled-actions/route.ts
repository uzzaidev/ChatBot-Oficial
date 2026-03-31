import { runDueScheduledCrmActions } from "@/lib/crm-automation-engine";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isAuthorizedCronRequest = (request: NextRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
};

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 200) : 100;

    const result = await runDueScheduledCrmActions(limit);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[cron/crm-scheduled-actions] error", error);
    return NextResponse.json(
      { error: "Failed to process scheduled CRM actions" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
