import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceRoleClient } from "@/lib/supabase";
import { updateContactMetadata } from "@/nodes/updateContactMetadata";

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

describe("updateContactMetadata", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockReset();
    rpc.mockResolvedValue({ error: null });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      rpc,
    } as any);
  });

  it("normalizes aliases for experience and preferred slots", async () => {
    const result = await updateContactMetadata({
      phone: "(51) 99999-9999",
      clientId: "client-1",
      fields: {
        yoga_experience: "iniciante",
        turno: "manha",
        dia: "sexta",
      },
    });

    expect(result.persisted).toBe(true);
    expect(result.rejected).toHaveLength(0);
    expect(result.saved).toEqual({
      experiencia: "iniciante",
      periodo_preferido: "manha",
      dia_preferido: "sexta",
    });

    expect(rpc).toHaveBeenCalledWith("merge_contact_metadata", {
      p_telefone: 51999999999,
      p_client_id: "client-1",
      p_metadata: {
        experiencia: "iniciante",
        periodo_preferido: "manha",
        dia_preferido: "sexta",
      },
    });
  });

  it("rejects invalid email and skips persistence when nothing is valid", async () => {
    const result = await updateContactMetadata({
      phone: "5551999999999",
      clientId: "client-1",
      fields: {
        email: "nao-e-email",
      },
    });

    expect(result.persisted).toBe(false);
    expect(result.saved).toEqual({});
    expect(result.rejected).toEqual([
      {
        field: "email",
        value: "nao-e-email",
        reason: "invalid_email",
      },
    ]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

