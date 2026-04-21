import { NextRequest } from "next/server";
import {
  PATCH,
  DELETE,
} from "@/app/api/ground-truth/[id]/route";
import { POST as validatePOST } from "@/app/api/ground-truth/[id]/validate/route";
import { POST as fromTracePOST } from "@/app/api/ground-truth/from-trace/route";
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

type QueryResult = { data?: any; error?: any };

const createQuery = (awaitResult: QueryResult, singleResult?: QueryResult) => {
  const query: any = {
    eq: jest.fn(() => query),
    select: jest.fn(() => query),
    insert: jest.fn(() => query),
    update: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve(singleResult ?? awaitResult)),
    maybeSingle: jest.fn(() => Promise.resolve(singleResult ?? awaitResult)),
    then: (resolve: (value: QueryResult) => unknown) =>
      Promise.resolve(awaitResult).then(resolve),
  };
  return query;
};

describe("Ground Truth API - /api/ground-truth/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("PATCH cria nova versão e desativa antiga", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const original = {
      id: "gt-1",
      client_id: "client-1",
      user_query: "q antiga",
      expected_response: "r antiga",
      query_embedding: new Array(1536).fill(0.1),
      category: "horarios",
      subcategory: null,
      tags: [],
      confidence: 0.7,
      version: 1,
      metadata: {},
      source_trace_id: null,
    };

    const q1 = createQuery({ data: original, error: null }, { data: original, error: null });
    const q2 = createQuery(
      { data: { id: "gt-2", version: 2 }, error: null },
      { data: { id: "gt-2", version: 2 }, error: null },
    );
    const q3 = createQuery({ data: null, error: null });

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      if (calls === 1) return q1;
      if (calls === 2) return q2;
      return q3;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({ expected_response: "r nova" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("gt-2");
    expect(q2.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_id: "gt-1",
        version: 2,
        expected_response: "r nova",
      }),
    );
    expect(q3.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        superseded_by: "gt-2",
      }),
    );
  });

  it("PATCH recalcula embedding quando user_query muda", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(1536).fill(0.4),
    });

    const original = {
      id: "gt-1",
      client_id: "client-1",
      user_query: "q antiga",
      expected_response: "r antiga",
      query_embedding: new Array(1536).fill(0.1),
      category: "horarios",
      subcategory: null,
      tags: [],
      confidence: 0.7,
      version: 1,
      metadata: {},
      source_trace_id: null,
    };

    const q1 = createQuery({ data: original, error: null }, { data: original, error: null });
    const q2 = createQuery(
      { data: { id: "gt-2", version: 2 }, error: null },
      { data: { id: "gt-2", version: 2 }, error: null },
    );
    const q3 = createQuery({ data: null, error: null });

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      if (calls === 1) return q1;
      if (calls === 2) return q2;
      return q3;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({ user_query: "q nova" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(200);
    expect(generateEmbedding).toHaveBeenCalledWith("q nova", undefined, "client-1");
    expect(q2.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        query_embedding: expect.any(Array),
      }),
    );
  });

  it("PATCH retorna 401 quando não autenticado", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({ expected_response: "r nova" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(401);
  });

  it("PATCH retorna 400 para patch vazio", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("empty_patch");
  });

  it("PATCH retorna 404 quando entrada não existe", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const q1 = createQuery({ data: null, error: { message: "not found" } });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({ expected_response: "nova" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(404);
  });

  it("PATCH retorna 500 para embedding inválido", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(32).fill(0.1),
    });

    const original = {
      id: "gt-1",
      client_id: "client-1",
      user_query: "q antiga",
      expected_response: "r antiga",
      query_embedding: new Array(1536).fill(0.1),
      category: "horarios",
      subcategory: null,
      tags: [],
      confidence: 0.7,
      version: 1,
      metadata: {},
      source_trace_id: null,
    };
    const q1 = createQuery({ data: original, error: null }, { data: original, error: null });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({ user_query: "q nova" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("invalid_embedding_dimensions");
  });

  it("PATCH retorna 500 em erro inesperado", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const original = {
      id: "gt-1",
      client_id: "client-1",
      user_query: "q antiga",
      expected_response: "r antiga",
      query_embedding: new Array(1536).fill(0.1),
      category: "horarios",
      subcategory: null,
      tags: [],
      confidence: 0.7,
      version: 1,
      metadata: {},
      source_trace_id: null,
    };
    const q1 = createQuery({ data: original, error: null }, { data: original, error: null });
    const q2 = createQuery({ data: null, error: { message: "insert failed" } });

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      return calls === 1 ? q1 : q2;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({ expected_response: "nova" }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });

  it("PATCH retorna 400 para body inválido (zod)", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "PATCH",
      body: JSON.stringify({ confidence: 1.5 }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "gt-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_body");
  });

  it("DELETE faz soft delete", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const q1 = createQuery({ data: null, error: null });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "gt-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(q1.update).toHaveBeenCalledWith({ is_active: false });
  });

  it("DELETE retorna 401 sem sessão", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "gt-1" }) });
    expect(response.status).toBe(401);
  });

  it("DELETE retorna 500 em erro inesperado", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const q1 = createQuery({ data: null, error: { message: "update failed" } });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "gt-1" }) });
    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });
});

describe("Ground Truth API - validate/from-trace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /validate adiciona usuário em validated_by", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");

    const current = {
      id: "gt-1",
      validated_by: ["u0"],
      confidence: 0.7,
    };
    const q1 = createQuery({ data: current, error: null }, { data: current, error: null });
    const q2 = createQuery(
      { data: { id: "gt-1", validated_by: ["u0", "u1"] }, error: null },
      { data: { id: "gt-1", validated_by: ["u0", "u1"] }, error: null },
    );

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      return calls === 1 ? q1 : q2;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1/validate", {
      method: "POST",
      body: JSON.stringify({ confidence: 0.9 }),
    });

    const response = await validatePOST(request, { params: Promise.resolve({ id: "gt-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.validated_by).toContain("u1");
    expect(q2.update).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: 0.9,
      }),
    );
  });

  it("POST /validate retorna 401 sem autenticação", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1/validate", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await validatePOST(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(401);
  });

  it("POST /validate retorna 404 quando não encontra registro", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const q1 = createQuery({ data: null, error: { message: "not found" } });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1/validate", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await validatePOST(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(404);
  });

  it("POST /validate retorna 400 para body inválido", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1/validate", {
      method: "POST",
      body: JSON.stringify({ confidence: 2 }),
    });
    const response = await validatePOST(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(400);
  });

  it("POST /validate retorna 500 em erro inesperado", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const current = { id: "gt-1", validated_by: [], confidence: 0.7 };
    const q1 = createQuery({ data: current, error: null }, { data: current, error: null });
    const q2 = createQuery({ data: null, error: { message: "update failed" } });
    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      return calls === 1 ? q1 : q2;
    });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const request = new NextRequest("http://localhost/api/ground-truth/gt-1/validate", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await validatePOST(request, { params: Promise.resolve({ id: "gt-1" }) });

    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });

  it("POST /from-trace cria GT a partir de trace", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(1536).fill(0.3),
    });

    const trace = {
      id: "trace-1",
      user_message: "Quais horarios?",
      client_id: "client-1",
    };
    const q1 = createQuery({ data: trace, error: null }, { data: trace, error: null });
    const q2 = createQuery(
      { data: { id: "gt-99", source_trace_id: "trace-1" }, error: null },
      { data: { id: "gt-99", source_trace_id: "trace-1" }, error: null },
    );

    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      return calls === 1 ? q1 : q2;
    });

    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const request = new NextRequest("http://localhost/api/ground-truth/from-trace", {
      method: "POST",
      body: JSON.stringify({
        trace_id: "2ab57a30-e245-4b86-987b-e40e2f9ecf4e",
        expected_response: "Temos aulas de segunda a sabado.",
      }),
    });

    const response = await fromTracePOST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("gt-99");
    expect(q2.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-1",
        source: "operator_correction",
      }),
    );
  });

  it("POST /from-trace retorna 401 sem autenticação", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue(null);
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth/from-trace", {
      method: "POST",
      body: JSON.stringify({
        trace_id: "2ab57a30-e245-4b86-987b-e40e2f9ecf4e",
        expected_response: "x",
      }),
    });
    const response = await fromTracePOST(request);

    expect(response.status).toBe(401);
  });

  it("POST /from-trace retorna 404 quando trace não existe", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const q1 = createQuery({ data: null, error: { message: "not found" } });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/from-trace", {
      method: "POST",
      body: JSON.stringify({
        trace_id: "2ab57a30-e245-4b86-987b-e40e2f9ecf4e",
        expected_response: "x",
      }),
    });
    const response = await fromTracePOST(request);

    expect(response.status).toBe(404);
  });

  it("POST /from-trace retorna 400 quando trace não tem user_message", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    const trace = { id: "trace-1", user_message: "   ", client_id: "client-1" };
    const q1 = createQuery({ data: trace, error: null }, { data: trace, error: null });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/from-trace", {
      method: "POST",
      body: JSON.stringify({
        trace_id: "2ab57a30-e245-4b86-987b-e40e2f9ecf4e",
        expected_response: "x",
      }),
    });
    const response = await fromTracePOST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("trace_has_no_user_message");
  });

  it("POST /from-trace retorna 500 para embedding inválido", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(5).fill(0.1),
    });
    const trace = { id: "trace-1", user_message: "q", client_id: "client-1" };
    const q1 = createQuery({ data: trace, error: null }, { data: trace, error: null });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn(() => q1),
    });

    const request = new NextRequest("http://localhost/api/ground-truth/from-trace", {
      method: "POST",
      body: JSON.stringify({
        trace_id: "2ab57a30-e245-4b86-987b-e40e2f9ecf4e",
        expected_response: "x",
      }),
    });
    const response = await fromTracePOST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("invalid_embedding_dimensions");
  });

  it("POST /from-trace retorna 400 para body inválido", async () => {
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    });

    const request = new NextRequest("http://localhost/api/ground-truth/from-trace", {
      method: "POST",
      body: JSON.stringify({
        trace_id: "not-uuid",
        expected_response: "x",
      }),
    });
    const response = await fromTracePOST(request);

    expect(response.status).toBe(400);
  });

  it("POST /from-trace retorna 500 em erro inesperado", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getClientIdFromSession as jest.Mock).mockResolvedValue("client-1");
    (generateEmbedding as jest.Mock).mockResolvedValue({
      embedding: new Array(1536).fill(0.1),
    });
    const trace = { id: "trace-1", user_message: "q", client_id: "client-1" };
    const q1 = createQuery({ data: trace, error: null }, { data: trace, error: null });
    const q2 = createQuery({ data: null, error: { message: "insert failed" } });
    let calls = 0;
    const fromMock = jest.fn(() => {
      calls += 1;
      return calls === 1 ? q1 : q2;
    });
    (createRouteHandlerClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: fromMock,
    });

    const request = new NextRequest("http://localhost/api/ground-truth/from-trace", {
      method: "POST",
      body: JSON.stringify({
        trace_id: "2ab57a30-e245-4b86-987b-e40e2f9ecf4e",
        expected_response: "x",
      }),
    });
    const response = await fromTracePOST(request);

    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });
});
