import { isPlanActive } from "../plan-access";

describe("isPlanActive", () => {
  const now = new Date("2026-10-25T12:00:00Z");

  it("allows active and trial", () => {
    expect(isPlanActive("active", null, now)).toBe(true);
    expect(isPlanActive("trial", null, now)).toBe(true);
    expect(isPlanActive("trialing", null, now)).toBe(true);
  });

  it("allows past_due only inside grace period", () => {
    expect(isPlanActive("past_due", "2026-10-26T00:00:00Z", now)).toBe(true);
    expect(isPlanActive("past_due", "2026-10-24T00:00:00Z", now)).toBe(false);
    expect(isPlanActive("past_due", null, now)).toBe(false);
  });

  it("blocks everything else", () => {
    for (const s of [null, undefined, "", "free", "pending_payment", "incomplete", "canceled", "suspended", "unpaid"]) {
      expect(isPlanActive(s, "2026-12-01T00:00:00Z", now)).toBe(false);
    }
  });
});
