import { evaluateQualityCheckpoint } from "@/lib/quality-checkpoint-readiness";
import { describe, expect, it } from "vitest";

describe("evaluateQualityCheckpoint", () => {
  it("returns awaiting_data when there is no snapshot", () => {
    const result = evaluateQualityCheckpoint(null);

    expect(result.status).toBe("awaiting_data");
    expect(result.criteria).toHaveLength(0);
  });

  it("returns not_ready when blocking criteria fail", () => {
    const result = evaluateQualityCheckpoint({
      report_date: "2026-04-23",
      total_traces: 12,
      pending_count: 5,
      failed_count: 1,
      pending_buckets: { erro_ia: 1 },
      metadata_capture: {
        contatosNoPeriodo: 10,
        comExperiencia: 2,
        comPeriodoOuDia: 3,
      },
      evaluation_coverage: { evalCoveragePct: 4 },
      alerts_snapshot: [{ severity: "warning" }],
    });

    expect(result.status).toBe("not_ready");
    expect(
      result.criteria.find((criterion) => criterion.key === "pending_under_control")
        ?.pass,
    ).toBe(false);
    expect(
      result.criteria.find((criterion) => criterion.key === "metadata_experiencia")
        ?.pass,
    ).toBe(false);
  });

  it("returns ready_for_s5 when all blocking criteria pass", () => {
    const result = evaluateQualityCheckpoint({
      report_date: "2026-04-23",
      total_traces: 40,
      pending_count: 6,
      failed_count: 1,
      pending_buckets: { erro_ia: 0 },
      metadata_capture: {
        contatosNoPeriodo: 20,
        comExperiencia: 10,
        comPeriodoOuDia: 9,
      },
      evaluation_coverage: { evalCoveragePct: 12 },
      alerts_snapshot: [{ severity: "warning" }],
    });

    expect(result.status).toBe("ready_for_s5");
    expect(result.criteria.every((criterion) => !criterion.blocking || criterion.pass)).toBe(
      true,
    );
  });
});
