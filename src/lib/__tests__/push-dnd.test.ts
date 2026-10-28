jest.mock("@/lib/supabase", () => ({ createServiceRoleClient: jest.fn() }));
jest.mock("@/lib/firebase-admin", () => ({ getFirebaseMessaging: jest.fn() }));

import { isInDNDPeriod } from "../push-dispatch";

describe("isInDNDPeriod (Brazil wall-clock time)", () => {
  // 2026-10-28 (Wednesday) 01:30 UTC = Tuesday 22:30 in São Paulo (UTC-3)
  const now = new Date("2026-10-28T01:30:00Z");

  it("uses São Paulo time, not server UTC", () => {
    expect(isInDNDPeriod(true, "22:00", "07:00", [], now)).toBe(true);
    expect(isInDNDPeriod(true, "00:00", "02:00", [], now)).toBe(false);
  });

  it("uses the São Paulo weekday", () => {
    expect(isInDNDPeriod(true, "22:00", "23:00", [2], now)).toBe(true); // Tuesday
    expect(isInDNDPeriod(true, "22:00", "23:00", [3], now)).toBe(false);
  });
});
