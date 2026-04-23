import { GET as getReviewQueue } from "@/app/api/evaluations/review-queue/route";
import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/postgres", () => ({
  query: vi.fn(),
}));

describe("API /api/evaluations/review-queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);

    const request = {
      nextUrl: new URL("http://localhost/api/evaluations/review-queue"),
    } as any;
    const response = await getReviewQueue(request);

    expect(response.status).toBe(401);
  });

  it("returns queue rows", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          evaluation_id: "eval-1",
          trace_id: "trace-1",
          verdict: "FAIL",
          trace_status: "needs_review",
          score_sum_0_to_4: 1.8,
          user_msg_180: "msg",
          bot_msg_220: "resp",
          evaluation_created_at: "2026-04-23T00:00:00.000Z",
        },
      ],
    } as any);

    const request = {
      nextUrl: new URL(
        "http://localhost/api/evaluations/review-queue?lookbackDays=7&limit=20&verdict=FAIL",
      ),
    } as any;

    const response = await getReviewQueue(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(query).toHaveBeenCalledOnce();
    expect(body.meta.total).toBe(1);
    expect(body.meta.verdicts).toEqual(["FAIL"]);
  });
});
