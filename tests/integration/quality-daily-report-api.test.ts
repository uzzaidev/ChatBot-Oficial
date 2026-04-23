import { GET as getDailyReport, POST as postDailyReport } from "@/app/api/quality/daily-report/route";
import {
  buildQualityDailyReport,
  listQualityDailyReports,
  storeQualityDailyReport,
} from "@/lib/quality-daily-report";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/quality-daily-report", () => ({
  listQualityDailyReports: vi.fn(),
  buildQualityDailyReport: vi.fn(),
  storeQualityDailyReport: vi.fn(),
}));

describe("API /api/quality/daily-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when unauthorized", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);

    const request = {
      nextUrl: new URL("http://localhost/api/quality/daily-report"),
    } as any;
    const response = await getDailyReport(request);

    expect(response.status).toBe(401);
  });

  it("GET returns report history", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(listQualityDailyReports).mockResolvedValue([
      {
        reportDate: "2026-04-23",
        totalTraces: 10,
        pendingBuckets: {},
        metadataCapture: {
          contatosNoPeriodo: 2,
          comEmail: 1,
          comCpf: 1,
          comObjetivo: 1,
          comExperiencia: 1,
          comPeriodoOuDia: 1,
        },
        evaluationCoverage: {
          traces: 10,
          evals: 2,
          evalCoveragePct: 20,
        },
        alertsSnapshot: [],
      },
    ] as any);

    const request = {
      nextUrl: new URL("http://localhost/api/quality/daily-report?days=5"),
    } as any;
    const response = await getDailyReport(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listQualityDailyReports).toHaveBeenCalledWith({
      clientId: "client-1",
      days: 5,
    });
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST builds and stores a daily report", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(buildQualityDailyReport).mockResolvedValue({
      reportDate: "2026-04-23",
      windowStart: "2026-04-23T00:00:00.000Z",
      windowEnd: "2026-04-24T00:00:00.000Z",
      totalTraces: 10,
      successCount: 8,
      needsReviewCount: 1,
      failedCount: 1,
      pendingCount: 0,
      successRatePct: 80,
      semAgentResponse: 0,
      avgLatencyMs: 1500,
      p95LatencyMs: 3500,
      pendingBuckets: {},
      metadataCapture: {
        contatosNoPeriodo: 4,
        comEmail: 3,
        comCpf: 2,
        comObjetivo: 3,
        comExperiencia: 2,
        comPeriodoOuDia: 2,
      },
      evaluationCoverage: {
        traces: 10,
        evals: 3,
        evalCoveragePct: 30,
      },
      alertsSnapshot: [],
    });

    const request = {
      nextUrl: new URL("http://localhost/api/quality/daily-report"),
      json: async () => ({ reportDate: "2026-04-23" }),
    } as any;

    const response = await postDailyReport(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(buildQualityDailyReport).toHaveBeenCalledWith({
      clientId: "client-1",
      reportDate: "2026-04-23",
    });
    expect(storeQualityDailyReport).toHaveBeenCalled();
    expect(body.success).toBe(true);
  });
});
