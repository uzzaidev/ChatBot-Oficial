import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveChatMessage } from "@/nodes/saveChatMessage";
import { createServiceRoleClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

const createSupabaseMock = () => {
  const insert = vi.fn(async () => ({ error: null }));
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn(() => ({ insert, upsert }));

  return { from, insert, upsert };
};

describe("saveChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses duplicate-safe upsert for WhatsApp wamid messages", async () => {
    const supabase = createSupabaseMock();
    vi.mocked(createServiceRoleClient).mockReturnValue(supabase as any);

    await saveChatMessage({
      phone: "555199999999",
      message: "Oi",
      type: "user",
      clientId: "client-a",
      wamid: "wamid.123",
    });

    expect(supabase.from).toHaveBeenCalledWith("n8n_chat_histories");
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-a",
        session_id: "555199999999",
        wamid: "wamid.123",
      }),
      {
        onConflict: "client_id,wamid",
        ignoreDuplicates: true,
      },
    );
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it("uses insert for system messages without wamid", async () => {
    const supabase = createSupabaseMock();
    vi.mocked(createServiceRoleClient).mockReturnValue(supabase as any);

    await saveChatMessage({
      phone: "555199999999",
      message: "Evento interno",
      type: "system",
      clientId: "client-a",
    });

    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-a",
        session_id: "555199999999",
        wamid: null,
      }),
    );
    expect(supabase.upsert).not.toHaveBeenCalled();
  });
});
