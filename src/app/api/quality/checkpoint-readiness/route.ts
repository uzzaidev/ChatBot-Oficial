import { getQualityCheckpointReadiness } from "@/lib/quality-checkpoint-readiness";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const reportDate = request.nextUrl.searchParams.get("reportDate") || undefined;
    const data = await getQualityCheckpointReadiness({
      clientId,
      reportDate,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (detail.includes("invalid_report_date_format")) {
      return NextResponse.json(
        { error: "invalid_report_date_format" },
        { status: 400 },
      );
    }

    console.error("[GET /api/quality/checkpoint-readiness]", error);
    return NextResponse.json(
      {
        error: "internal_server_error",
        detail,
      },
      { status: 500 },
    );
  }
}
