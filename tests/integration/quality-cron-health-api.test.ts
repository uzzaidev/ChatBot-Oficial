import { GET as getCronHealth } from "@/app/api/quality/cron-health/route";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/postgres", () => ({
  query: vi.fn(),
}));

describe("API /api/quality/cron-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);
    const request = {
      nextUrl: new URL("http://localhost/api/quality/cron-health"),
    } as any;

    const response = await getCronHealth(request);
    expect(response.status).toBe(401);
  });

  it("returns health payload", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(query)
      .mockResolvedValueOnce({
        rows: [{ last_reconcile_at: new Date().toISOString() }],
      } as any)
      .mockResolvedValueOnce({
        rows: [{ last_report_date: "2026-04-23" }],
      } as any)
      .mockResolvedValueOnce({
        rows: [{ recent_traces: 12, recent_pending: 1 }],
      } as any);

    const request = {
      nextUrl: new URL("http://localhost/api/quality/cron-health"),
    } as any;
    const response = await getCronHealth(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeTruthy();
    expect(Array.isArray(body.data.crons)).toBe(true);
  });
});
