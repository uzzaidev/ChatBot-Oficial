import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DiagnosticTest = {
  name: string;
  status: "pass" | "warn" | "fail";
  httpStatus?: number | null;
  durationMs?: number;
  message: string;
  details?: Record<string, unknown>;
};

type DiagnosticPayload = {
  startedAt?: string;
  finishedAt?: string;
  url?: string;
  userAgent?: string;
  language?: string;
  platform?: string;
  timezone?: string;
  tests?: DiagnosticTest[];
};

const safeText = (value: unknown, fallback = "unknown") => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.slice(0, 500);
};

const safeTests = (value: unknown): DiagnosticTest[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is DiagnosticTest => {
      return (
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        "status" in item &&
        "message" in item
      );
    })
    .slice(0, 20)
    .map((item) => ({
      name: safeText(item.name),
      status:
        item.status === "pass" ||
        item.status === "warn" ||
        item.status === "fail"
          ? item.status
          : "fail",
      httpStatus: typeof item.httpStatus === "number" ? item.httpStatus : null,
      durationMs: typeof item.durationMs === "number" ? item.durationMs : 0,
      message: safeText(item.message),
      details:
        item.details && typeof item.details === "object"
          ? item.details
          : undefined,
    }));
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as DiagnosticPayload;
    const reportId = crypto.randomUUID();
    const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
    const ip = forwardedFor.split(",")[0]?.trim() || "unknown";

    const report = {
      reportId,
      createdAt: new Date().toISOString(),
      ip,
      startedAt: safeText(payload.startedAt),
      finishedAt: safeText(payload.finishedAt),
      url: safeText(payload.url),
      userAgent: safeText(payload.userAgent),
      language: safeText(payload.language),
      platform: safeText(payload.platform),
      timezone: safeText(payload.timezone),
      tests: safeTests(payload.tests),
    };

    console.info("[diagnostico] Report received", JSON.stringify(report));

    return NextResponse.json(
      {
        success: true,
        reportId,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
