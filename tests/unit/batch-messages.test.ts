import { batchMessages } from "@/nodes/batchMessages";
import {
  acquireLock,
  deleteKey,
  get,
  lrangeMessages,
  setWithExpiry,
} from "@/lib/redis";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/config", () => ({
  getBotConfig: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  acquireLock: vi.fn(),
  deleteKey: vi.fn(),
  get: vi.fn(),
  lrangeMessages: vi.fn(),
  setWithExpiry: vi.fn(),
}));

describe("batchMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(get).mockResolvedValue(null);
    vi.mocked(deleteKey).mockResolvedValue(undefined as any);
    vi.mocked(setWithExpiry).mockResolvedValue(undefined as any);
  });

  it("keeps batched messages in timestamp order even when Redis returns newest first", async () => {
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(lrangeMessages).mockResolvedValue([
      JSON.stringify({
        content: "segunda",
        timestamp: "2026-04-25T10:00:02.000Z",
      }),
      JSON.stringify({
        content: "primeira",
        timestamp: "2026-04-25T10:00:01.000Z",
      }),
    ]);

    const result = await batchMessages("555", "client-1", 0);

    expect(result).toBe("primeira\n\nsegunda");
  });

  it("returns empty content when another execution holds the batch lock", async () => {
    vi.mocked(acquireLock).mockResolvedValue(false);

    const result = await batchMessages("555", "client-1", 0);

    expect(result).toBe("");
    expect(lrangeMessages).not.toHaveBeenCalled();
  });
});
