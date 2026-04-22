import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/ground-truth/route";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/openai";

vi.mock("@/lib/supabase-server", () => ({
  getClientIdFromSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  generateEmbedding: vi.fn(),
}));

type QueryResult = { data?: any; error?: any; count?: number };

const createAwaitableQuery = (result: QueryResult) => {
  const query: any = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return query;
};

describe("/api/ground-truth (vitest)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when unauthenticated", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue(null);
    vi.mocked(createServiceRoleClient).mockReturnValue({} as any);

    const request = new NextRequest("http://localhost/api/ground-truth");
    const response = await GET(request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("POST creates an entry with embedding", async () => {
    vi.mocked(getClientIdFromSession).mockResolvedValue("client-1");
    vi.mocked(generateEmbedding).mockResolvedValue({
      embedding: new Array(1536).fill(0.2),
    } as any);

    const insertQuery = createAwaitableQuery({
      data: { id: "gt-1" },
      error: null,
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      },
      from: vi.fn(() => insertQuery),
    } as any);

    const request = new NextRequest("http://localhost/api/ground-truth", {
      method: "POST",
      body: JSON.stringify({
        user_query: "Qual o horario?",
        expected_response: "Das 9h as 18h",
        category: "horarios",
      }),
    });

    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.id).toBe("gt-1");
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        created_by: "u1",
        version: 1,
      }),
    );
  });
});

