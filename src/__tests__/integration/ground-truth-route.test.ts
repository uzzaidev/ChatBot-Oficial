import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/ground-truth/route";
import {
  createRouteHandlerClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { generateEmbedding } from "@/lib/openai";

jest.mock("@/lib/supabase-server", () => ({
  createRouteHandlerClient: jest.fn(),
  getClientIdFromSession: jest.fn(),
}));

jest.mock("@/lib/openai", () => ({
  generateEmbedding: jest.fn(),
}));

type QueryResult = { data?: any; error?: any; count?: number };

const createAwaitableQuery = (result: QueryResult) => {
  const query: any = {
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    range: jest.fn(() => query),
    or: jest.fn(() => query),
    select: jest.fn(() => query),
    insert: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return query;
};

describe("Ground Truth API - /api/ground-truth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET retorna 401 sem sessão", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/ground-truth");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("GET retorna lista paginada", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const query = createAwaitableQuery({
      data: [{ id: "gt-1", user_query: "q1" }],
      count: 1,
      error: null,
    });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => query),
    });

    const request = new NextRequest(
      "http://localhost/api/ground-truth?limit=10&offset=0&category=horarios",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
    expect(query.eq).toHaveBeenCalledWith("client_id", "client-1");
    expect(query.eq).toHaveBeenCalledWith("category", "horarios");
  });

  it("GET aplica busca textual quando search é informado", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const query = createAwaitableQuery({
      data: [{ id: "gt-1", user_query: "q1" }],
      count: 1,
      error: null,
    });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => query),
    });

    const request = new NextRequest(
      "http://localhost/api/ground-truth?search=horario",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(query.or).toHaveBeenCalled();
  });

  it("GET retorna 400 para query params inválidos", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(),
    });

    const request = new NextRequest(
      "http://localhost/api/ground-truth?limit=9999",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_query_params");
  });

  it("GET retorna 500 em erro inesperado", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const query = createAwaitableQuery({
      data: null,
      count: 0,
      error: { message: "db down" },
    });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => query),
    });

    const request = new NextRequest("http://localhost/api/ground-truth");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("internal_server_error");
    errorSpy.mockRestore();
  });

  it("POST retorna 401 sem sessão", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/ground-truth", {
      method: "POST",
      body: JSON.stringify({
        user_query: "Q",
        expected_response: "R",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("POST retorna 401 sem usuário autenticado", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth", {
      method: "POST",
      body: JSON.stringify({
        user_query: "Q",
        expected_response: "R",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("POST retorna 400 para payload inválido", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth", {
      method: "POST",
      body: JSON.stringify({ user_query: "" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("POST cria entrada com embedding", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(1536).fill(0.2),
    });

    const insertQuery = createAwaitableQuery({
      data: { id: "gt-1" },
      error: null,
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => insertQuery),
    });

    const request = new NextRequest("http://localhost/api/ground-truth", {
      method: "POST",
      body: JSON.stringify({
        user_query: "Qual o horário?",
        expected_response: "Das 9h às 18h.",
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

  it("POST retorna 500 para embedding com dimensão inválida", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(8).fill(0.2),
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth", {
      method: "POST",
      body: JSON.stringify({
        user_query: "Q",
        expected_response: "R",
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("invalid_embedding_dimensions");
  });

  it("POST retorna 500 em erro inesperado do insert", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(1536).fill(0.2),
    });

    const insertQuery = createAwaitableQuery({
      data: null,
      error: { message: "insert failed" },
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => insertQuery),
    });

    const request = new NextRequest("http://localhost/api/ground-truth", {
      method: "POST",
      body: JSON.stringify({
        user_query: "Q",
        expected_response: "R",
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("internal_server_error");
    errorSpy.mockRestore();
  });
});
