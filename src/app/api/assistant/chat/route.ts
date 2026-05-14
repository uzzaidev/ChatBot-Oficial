/**
 * POST /api/assistant/chat
 *
 * Streaming AI assistant endpoint for WhatsApp analytics.
 * Uses OpenAI Responses API (gpt-5.4-mini) with a query_sql tool.
 * All data access is strictly tenant-isolated by client_id.
 *
 * SSE event types:
 *   thinking | token | tool_call | tool_result | usage | error | done
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { buildAssistantSystemPrompt } from "@/lib/assistant-prompt";
import {
  createServiceClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import { getClientOpenAIKey } from "@/lib/vault";

export const runtime = "nodejs";
export const maxDuration = 120;

// ── Model config ─────────────────────────────────────────────
const MODEL = "gpt-5.4-mini";

// ── SSE helper ──────────────────────────────────────────────
const enc = new TextEncoder();
function sseChunk(data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── SQL safety guard ─────────────────────────────────────────
function isReadOnlySql(sql: string): boolean {
  const normalized = sql.trim().replace(/\s+/g, " ").toUpperCase();
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH"))
    return false;
  const banned =
    /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|REPLACE)\b/;
  return !banned.test(normalized);
}

/** Ensures the query contains the tenant's client_id to prevent cross-tenant access. */
function containsClientId(sql: string, clientId: string): boolean {
  return sql.includes(clientId);
}

/**
 * Strips {"query":"..."} JSON artifacts that the model sometimes emits at the
 * start of its text response after a failed tool call (the model echoes its own
 * tool-call argument). Uses brace-depth counting so it works even if the SQL
 * contains nested braces (rare, but safe).
 */
function stripQueryJsonArtifact(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('{"query":')) return text;
  let depth = 0;
  let end = -1;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === "{") depth++;
    else if (trimmed[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return text; // no closing brace found, don't strip
  return trimmed.slice(end).trimStart();
}

// ── query_sql tool definition ────────────────────────────────
const QUERY_SQL_TOOL = {
  type: "function" as const,
  name: "query_sql",
  description:
    "Executa uma consulta SQL SELECT (somente leitura) no banco PostgreSQL do WhatsApp. " +
    "Apenas SELECT é permitido. OBRIGATÓRIO: toda query deve filtrar por client_id.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Consulta SQL SELECT válida em PostgreSQL. Deve conter client_id no WHERE.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  strict: true,
};

// ── Execute SQL via Supabase service role ────────────────────
async function executeSql(
  sql: string,
): Promise<{ rows: unknown[]; rowCount: number; executionMs: number }> {
  const supabase = createServiceClient();
  const t0 = Date.now();
  // Strip trailing semicolons: execute_readonly_query wraps the query in
  // "SELECT ... FROM (sql) t", so a trailing ";" breaks the subquery syntax.
  const cleanSql = sql.trim().replace(/;+\s*$/, "");
  // Use rpc to execute raw SQL (read-only, service role).
  // Cast to `any` because the generated Supabase types don't include this
  // custom RPC yet — the function was added via migration after type gen.
  const supabaseAny = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = (await supabaseAny.rpc("execute_readonly_query", {
    query_text: cleanSql,
  })) as { data: unknown | null; error: { message: string } | null };

  if (error) {
    throw new Error(`SQL error: ${error.message}`);
  }
  // RPC returns JSONB → Supabase deserializes to JS value (array or null)
  const rows = Array.isArray(data) ? data : [];
  return { rows, rowCount: rows.length, executionMs: Date.now() - t0 };
}

// ── Load conversation history ────────────────────────────────
async function loadHistory(
  conversationId: string,
  clientId: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const supabase = createServiceClient();
  const supabaseAny = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabaseAny
    .from("assistant_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as Array<{ role: string; content: string }>).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

// ── GET client name ──────────────────────────────────────────
async function getClientName(clientId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();
  const record = data as { name?: string } | null;
  return record?.name ?? "Cliente";
}

// ── POST handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 1. Auth — extract tenant
  const clientId = await getClientIdFromSession(request);
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { message?: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { message, conversationId } = body;
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId é obrigatório." },
      { status: 400 },
    );
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  // 3. Verify conversation belongs to this tenant
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  const { data: conv } = await supabaseAny
    .from("assistant_conversations")
    .select("id, title, client_id")
    .eq("id", conversationId)
    .eq("client_id", clientId)
    .single();

  if (!conv) {
    return NextResponse.json(
      { error: "Conversa não encontrada." },
      { status: 404 },
    );
  }

  // 4. Get OpenAI API key from Vault
  const apiKey = await getClientOpenAIKey(clientId);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Chave OpenAI não configurada para este cliente. Configure em Configurações.",
      },
      { status: 422 },
    );
  }

  // 5. Get client name for system prompt
  const clientName = await getClientName(clientId);

  // 6. Persist user message
  await supabaseAny.from("assistant_messages").insert({
    conversation_id: conversationId,
    client_id: clientId,
    role: "user",
    content: message.trim(),
  });

  // Auto-title: if still "Nova conversa", use first 60 chars of message
  if (conv.title === "Nova conversa") {
    await supabaseAny
      .from("assistant_conversations")
      .update({
        title: message.trim().slice(0, 60),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("client_id", clientId);
  }

  // 7. Load history for context
  const history = await loadHistory(conversationId, clientId);

  // 8. Build OpenAI client with tenant key
  const openai = new OpenAI({ apiKey });

  // 9. Stream response via Responses API
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sseChunk(data));

      try {
        send({ type: "thinking", status: "Analisando sua pergunta…" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseStream = await (openai as any).responses.create({
          model: MODEL,
          instructions: buildAssistantSystemPrompt(clientId, clientName),
          input: history,
          tools: [QUERY_SQL_TOOL],
          reasoning: { effort: "medium", summary: "auto" },
          text: { verbosity: "low" },
          stream: true,
        });

        let finalText = "";
        let responseId: string | null = null;
        let usage: { input_tokens: number; output_tokens: number } | null =
          null;
        const pendingFunctionCalls: Array<{
          call_id: string;
          name: string;
          arguments: string;
        }> = [];
        const toolStartTimes = new Map<string, number>();
        let answerStartSent = false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const event of responseStream as AsyncIterable<any>) {
          const t = event?.type as string | undefined;
          if (!t) continue;

          if (t === "response.created" || t === "response.in_progress") {
            if (event.response?.id) responseId = event.response.id;
          }

          if (t === "response.output_text.delta") {
            const delta = event.delta ?? "";
            if (delta) {
              if (!answerStartSent) {
                answerStartSent = true;
              }
              finalText += delta;
              send({ type: "token", token: delta });
            }
            continue;
          }

          if (t === "response.output_item.added") {
            const item = event.item;
            if (!item) continue;
            if (item.type === "function_call" && item.name === "query_sql") {
              toolStartTimes.set(item.id, Date.now());
              send({ type: "tool_call", tool: "query_sql" });
              send({ type: "thinking", status: "Consultando banco de dados…" });
            }
            continue;
          }

          if (t === "response.output_item.done") {
            const item = event.item;
            if (!item) continue;
            if (item.type === "function_call" && item.name === "query_sql") {
              pendingFunctionCalls.push({
                call_id: item.call_id ?? item.id,
                name: item.name,
                arguments: item.arguments ?? "{}",
              });
            }
            continue;
          }

          if (t === "response.completed") {
            if (event.response?.id) responseId = event.response.id;
            const u = event.response?.usage;
            if (u) {
              usage = {
                input_tokens: u.input_tokens ?? 0,
                output_tokens: u.output_tokens ?? 0,
              };
            }
            continue;
          }

          if (t === "response.failed" || t === "error") {
            const msg =
              event.response?.error?.message ??
              event.error?.message ??
              "Erro no modelo";
            throw new Error(msg);
          }
        }

        // 10. Execute any pending query_sql calls
        for (const call of pendingFunctionCalls) {
          let sqlOutput: string;
          let sqlForDisplay = "";
          let rowCount = 0;
          let executionMs = 0;

          try {
            const args = JSON.parse(call.arguments || "{}");
            const sqlText = String(args.query ?? "");
            sqlForDisplay = sqlText;

            if (!isReadOnlySql(sqlText)) {
              sqlOutput = JSON.stringify({
                error: "Apenas SELECT é permitido. Use a consulta correta.",
              });
            } else if (!containsClientId(sqlText, clientId)) {
              sqlOutput = JSON.stringify({
                error: `Segurança: a query deve conter client_id = '${clientId}'.`,
              });
            } else {
              const result = await executeSql(sqlText);
              sqlOutput = JSON.stringify({
                rows: result.rows,
                rowCount: result.rowCount,
              });
              rowCount = result.rowCount;
              executionMs = result.executionMs;
              send({
                type: "tool_result",
                tool: "query_sql",
                sql: sqlText,
                executionMs,
                rowCount,
                rows: result.rows.slice(0, 200),
              });
            }
          } catch (err) {
            sqlOutput = JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            });
            send({
              type: "tool_result",
              tool: "query_sql",
              sql: sqlForDisplay,
              executionMs: 0,
              rowCount: 0,
              error: sqlOutput,
            });
          }

          // Submit tool output and get follow-up response
          if (responseId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const followup = await (openai as any).responses.create({
              model: MODEL,
              previous_response_id: responseId,
              instructions: buildAssistantSystemPrompt(clientId, clientName),
              input: [
                {
                  type: "function_call_output",
                  call_id: call.call_id,
                  output: sqlOutput,
                },
              ],
              // No tools here — force the model to generate text explanation
              // instead of making another SQL call in a loop.
              stream: true,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for await (const event of followup as AsyncIterable<any>) {
              const t = event?.type as string | undefined;
              if (!t) continue;

              if (t === "response.output_text.delta") {
                const delta = event.delta ?? "";
                if (delta) {
                  finalText += delta;
                  send({ type: "token", token: delta });
                }
              }

              if (t === "response.completed") {
                if (event.response?.id) responseId = event.response.id;
                const u = event.response?.usage;
                if (u) {
                  usage = {
                    input_tokens:
                      (usage?.input_tokens ?? 0) + (u.input_tokens ?? 0),
                    output_tokens:
                      (usage?.output_tokens ?? 0) + (u.output_tokens ?? 0),
                  };
                }
              }
            }
          }
        }

        // 11. Persist assistant response
        // Strip {"query":"..."} JSON artifacts the model may emit when echoing a failed tool call.
        finalText = stripQueryJsonArtifact(finalText);

        if (finalText.trim()) {
          await supabaseAny.from("assistant_messages").insert({
            conversation_id: conversationId,
            client_id: clientId,
            role: "assistant",
            content: finalText,
            metadata: {
              model: MODEL,
              prompt_tokens: usage?.input_tokens ?? 0,
              completion_tokens: usage?.output_tokens ?? 0,
            },
          });

          // Touch updated_at on conversation
          await supabaseAny
            .from("assistant_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .eq("client_id", clientId);
        }

        // 12. Emit usage and done
        send({
          type: "usage",
          model: MODEL,
          prompt_tokens: usage?.input_tokens ?? 0,
          completion_tokens: usage?.output_tokens ?? 0,
        });
        // Include the clean finalText so the frontend can correct any streaming
        // artifacts (e.g. {"query":"..."} JSON prefix echoed by the model).
        send({ type: "done", content: finalText });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro interno";
        send({ type: "error", message: msg });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
