import { GET as cronGet, POST as cronPost } from "@/app/api/cron/traces-reconcile/route";
import { reconcileTraces } from "@/lib/trace-reconciliation";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trace-reconciliation", () => ({
  reconcileTraces: vi.fn(),
}));

describe("POST /api/cron/traces-reconcile", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("returns 401 when missing/invalid authorization", async () => {
    const request = {
      headers: new Headers(),
      nextUrl: new URL("http://localhost/api/cron/traces-reconcile"),
    } as any;

    const response = await cronPost(request);
    expect(response.status).toBe(401);
  });

  it("runs reconciliation when authorized", async () => {
    vi.mocked(reconcileTraces).mockResolvedValue({
      scanned: 10,
      changed: 4,
      statusToSuccess: 3,
      statusToFailed: 1,
      pendingBucketUpdated: 5,
      unchanged: 6,
      errors: 0,
      buckets: {
        nao_chegou_na_geracao: 5,
        geracao_iniciada_nao_concluida: 2,
        geracao_concluida_sem_envio: 2,
        enviado_sem_status: 1,
        erro_ia: 0,
        outro_pending: 0,
      },
    });

    const request = {
      headers: new Headers({
        authorization: "Bearer test-secret",
      }),
      nextUrl: new URL(
        "http://localhost/api/cron/traces-reconcile?lookbackHours=12&limit=100",
      ),
    } as any;

    const response = await cronPost(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(reconcileTraces).toHaveBeenCalledWith(
      expect.objectContaining({
        lookbackHours: 12,
        limit: 100,
        dryRun: false,
      }),
    );
    expect(body.success).toBe(true);
    expect(body.result.changed).toBe(4);
  });

  it("GET delegates to POST", async () => {
    vi.mocked(reconcileTraces).mockResolvedValue({
      scanned: 0,
      changed: 0,
      statusToSuccess: 0,
      statusToFailed: 0,
      pendingBucketUpdated: 0,
      unchanged: 0,
      errors: 0,
      buckets: {
        nao_chegou_na_geracao: 0,
        geracao_iniciada_nao_concluida: 0,
        geracao_concluida_sem_envio: 0,
        enviado_sem_status: 0,
        erro_ia: 0,
        outro_pending: 0,
      },
    });

    const request = {
      headers: new Headers({
        authorization: "Bearer test-secret",
      }),
      nextUrl: new URL("http://localhost/api/cron/traces-reconcile?dryRun=true"),
    } as any;

    const response = await cronGet(request);
    expect(response.status).toBe(200);
  });
});
