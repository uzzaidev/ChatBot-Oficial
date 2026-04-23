import { GET as getCheckpointReadiness } from "@/app/api/quality/checkpoint-readiness/route";
import { getQualityCheckpointReadiness } from "@/lib/quality-checkpoint-readiness";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/quality-checkpoint-readiness", () => ({
  getQualityCheckpointReadiness: vi.fn(),
}));

describe("API /api/quality/checkpoint-readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);

    const request = {
      nextUrl: new URL("http://localhost/api/quality/checkpoint-readiness"),
    } as any;
    const response = await getCheckpointReadiness(request);

    expect(response.status).toBe(401);
  });

  it("returns checkpoint data", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(getQualityCheckpointReadiness).mockResolvedValue({
      status: "not_ready",
      reportDate: "2026-04-23",
      criteria: [],
      nextSteps: ["step"],
      summary: {
        totalTraces: 10,
        pendingCount: 2,
        failedCount: 1,
        pendingRatioPct: 20,
        failedRatioPct: 10,
        experienciaRatePct: 20,
        periodoRatePct: 10,
        evaluationCoveragePct: 5,
        criticalAlerts: 0,
      },
    });

    const request = {
      nextUrl: new URL(
        "http://localhost/api/quality/checkpoint-readiness?reportDate=2026-04-23",
      ),
    } as any;
    const response = await getCheckpointReadiness(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getQualityCheckpointReadiness).toHaveBeenCalledWith({
      clientId: "client-1",
      reportDate: "2026-04-23",
    });
    expect(body.data.status).toBe("not_ready");
  });

  it("returns 400 on invalid reportDate", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(getQualityCheckpointReadiness).mockRejectedValue(
      new Error("invalid_report_date_format"),
    );

    const request = {
      nextUrl: new URL("http://localhost/api/quality/checkpoint-readiness?reportDate=abc"),
    } as any;
    const response = await getCheckpointReadiness(request);

    expect(response.status).toBe(400);
  });
});
