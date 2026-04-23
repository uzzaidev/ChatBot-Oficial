import { GET as cronGet, POST as cronPost } from "@/app/api/cron/quality-daily-report/route";
import { runQualityDailyReports } from "@/lib/quality-daily-report";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/quality-daily-report", () => ({
  runQualityDailyReports: vi.fn(),
}));

describe("POST /api/cron/quality-daily-report", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("returns 401 when authorization is invalid", async () => {
    const request = {
      headers: new Headers(),
      nextUrl: new URL("http://localhost/api/cron/quality-daily-report"),
    } as any;

    const response = await cronPost(request);
    expect(response.status).toBe(401);
  });

  it("runs daily report generation when authorized", async () => {
    vi.mocked(runQualityDailyReports).mockResolvedValue({
      reportDate: "2026-04-23",
      processedClients: 3,
      stored: 3,
      failed: 0,
      errors: [],
    });

    const request = {
      headers: new Headers({ authorization: "Bearer test-secret" }),
      nextUrl: new URL(
        "http://localhost/api/cron/quality-daily-report?reportDate=2026-04-23&limitClients=25",
      ),
    } as any;

    const response = await cronPost(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runQualityDailyReports).toHaveBeenCalledWith(
      expect.objectContaining({
        reportDate: "2026-04-23",
        limitClients: 25,
      }),
    );
    expect(body.success).toBe(true);
    expect(body.result.stored).toBe(3);
  });

  it("GET delegates to POST", async () => {
    vi.mocked(runQualityDailyReports).mockResolvedValue({
      reportDate: "2026-04-23",
      processedClients: 0,
      stored: 0,
      failed: 0,
      errors: [],
    });

    const request = {
      headers: new Headers({ authorization: "Bearer test-secret" }),
      nextUrl: new URL("http://localhost/api/cron/quality-daily-report"),
    } as any;

    const response = await cronGet(request);
    expect(response.status).toBe(200);
  });
});
