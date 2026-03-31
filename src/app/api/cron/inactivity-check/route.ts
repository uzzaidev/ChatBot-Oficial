import { runInactivityCheck } from "@/lib/jobs/inactivity-check";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isAuthorizedCronRequest = (request: NextRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
};

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 2000) : 500;

    const result = await runInactivityCheck(limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[cron/inactivity-check] error", error);
    return NextResponse.json(
      { error: "Failed to process inactivity check" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
