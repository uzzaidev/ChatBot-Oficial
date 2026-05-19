"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AssistantInput } from "./AssistantInput";
import {
  AssistantMessage,
  type AssistantMessageData,
} from "./AssistantMessage";
import { ConversationTabs, type ConversationTab } from "./ConversationTabs";

interface StreamingState {
  text: string;
  sqlQueries: Array<{
    sql: string;
    executionMs?: number;
    rowCount?: number;
    rows?: Record<string, unknown>[];
  }>;
  thinkingStatus: string;
}

const EMPTY_STREAMING: StreamingState = {
  text: "",
  sqlQueries: [],
  thinkingStatus: "",
};

export function AssistantInterface() {
  const [conversations, setConversations] = useState<ConversationTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessageData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streaming, setStreaming] = useState<StreamingState>(EMPTY_STREAMING);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming.text, scrollToBottom]);

  // ── Load conversations on mount ───────────────────────────────────────────
  useEffect(() => {
    fetch("/api/assistant/conversations")
      .then((r) => r.json())
      .then((data: ConversationTab[]) => {
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        if (list.length > 0) {
          loadMessages(list[0].id);
          setActiveId(list[0].id);
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      const data = await res.json();
      const list: Array<AssistantMessageData & { created_at?: string }> =
        Array.isArray(data) ? data : data.messages ?? [];
      setMessages(
        list.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata ?? undefined,
          createdAt: m.createdAt ?? m.created_at,
        })),
      );
    } catch {
      setMessages([]);
    }
  }, []);

  // ── New conversation ──────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    const res = await fetch("/api/assistant/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nova conversa" }),
    });
    const conv: ConversationTab = await res.json();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
  }, []);

  // ── Rename / delete ───────────────────────────────────────────────────────
  const handleRename = useCallback(async (id: string, title: string) => {
    await fetch(`/api/assistant/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          if (remaining.length > 0) {
            loadMessages(remaining[0].id);
          } else {
            setActiveId(null);
            setMessages([]);
          }
        }
        return remaining;
      });
    },
    [activeId, loadMessages],
  );

  const handleSelectTab = useCallback(
    (id: string) => {
      if (id === activeId || isStreaming) return;
      loadMessages(id);
    },
    [activeId, isStreaming, loadMessages],
  );

  // ── SSE streaming ─────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      // Auto-create conversation if none active
      let convId = activeId;
      if (!convId) {
        const res = await fetch("/api/assistant/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Nova conversa" }),
        });
        const conv: ConversationTab = await res.json();
        convId = conv.id;
        setConversations((prev) => [conv, ...prev]);
        setActiveId(convId);
      }

      // Optimistic user message
      const userMsg: AssistantMessageData = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreaming({
        text: "",
        sqlQueries: [],
        thinkingStatus: "Analisando sua mensagem…",
      });

      const controller = new AbortController();
      abortRef.current = controller;
      const requestStartMs = Date.now();

      let accText = "";
      let accSqlQueries: StreamingState["sqlQueries"] = [];

      try {
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, conversationId: convId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = await res
            .json()
            .catch(() => ({ error: "Erro desconhecido" }));
          appendError(err.error ?? "Erro na requisição");
          setIsStreaming(false);
          setStreaming(EMPTY_STREAMING);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accUsage: AssistantMessageData["metadata"] | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            switch (event.type) {
              case "thinking":
                setStreaming((s) => ({
                  ...s,
                  thinkingStatus: (event.status as string) ?? "",
                }));
                break;

              case "token":
                accText += event.token as string;
                setStreaming((s) => ({
                  ...s,
                  text: accText,
                  thinkingStatus: "",
                }));
                break;

              case "tool_call":
                setStreaming((s) => ({
                  ...s,
                  thinkingStatus: "Consultando banco de dados…",
                }));
                break;

              case "tool_result": {
                const sql = (event.sql as string) ?? "";
                const executionMs = (event.executionMs as number) ?? undefined;
                const rowCount = (event.rowCount as number) ?? undefined;
                const rows = Array.isArray(event.rows)
                  ? (event.rows as Record<string, unknown>[])
                  : undefined;
                if (sql) {
                  accSqlQueries = [
                    ...accSqlQueries,
                    { sql, executionMs, rowCount, rows },
                  ];
                  setStreaming((s) => ({
                    ...s,
                    sqlQueries: accSqlQueries,
                    thinkingStatus: "Elaborando resposta…",
                  }));
                }
                break;
              }

              case "usage":
                accUsage = {
                  model: (event.model as string) ?? undefined,
                  prompt_tokens: (event.prompt_tokens as number) ?? undefined,
                  completion_tokens:
                    (event.completion_tokens as number) ?? undefined,
                  generation_ms: Date.now() - requestStartMs,
                  sql_queries:
                    accSqlQueries.length > 0 ? accSqlQueries : undefined,
                };
                break;

              case "done": {
                // Prefer server-cleaned content (strips JSON echo artifacts) over raw accText
                const finalContent =
                  typeof event.content === "string" ? event.content : accText;
                const assistantMsg: AssistantMessageData = {
                  id: `assist-${Date.now()}`,
                  role: "assistant",
                  content: finalContent,
                  metadata: accUsage ?? {
                    generation_ms: Date.now() - requestStartMs,
                    sql_queries:
                      accSqlQueries.length > 0 ? accSqlQueries : undefined,
                  },
                  createdAt: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMsg]);

                // Update the conversation title in the tab list (auto-titled server-side)
                if (convId) {
                  fetch(`/api/assistant/conversations/${convId}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (data?.title) {
                        setConversations((prev) =>
                          prev.map((c) =>
                            c.id === convId ? { ...c, title: data.title } : c,
                          ),
                        );
                      }
                    })
                    .catch(() => {
                      /* ignore */
                    });
                }

                setIsStreaming(false);
                setStreaming(EMPTY_STREAMING);
                break;
              }

              case "error":
                appendError((event.message as string) ?? "Erro desconhecido");
                setIsStreaming(false);
                setStreaming(EMPTY_STREAMING);
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // User stopped streaming — commit whatever we have so far
          if (accText.trim()) {
            setMessages((prev) => [
              ...prev,
              {
                id: `assist-${Date.now()}`,
                role: "assistant",
                content: accText + "\n\n*(resposta interrompida)*",
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        } else {
          appendError(err instanceof Error ? err.message : "Falha na conexão");
        }
        setIsStreaming(false);
        setStreaming(EMPTY_STREAMING);
      }

      // capture accText in closure
      function appendError(msg: string) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${msg}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    },
    [activeId, isStreaming],
  );

  // ── Derived streaming message (shown while streaming) ─────────────────────
  const streamingMessage: AssistantMessageData | null =
    isStreaming && streaming.text
      ? {
          id: "streaming",
          role: "assistant",
          content: streaming.text,
          createdAt: new Date().toISOString(),
          metadata:
            streaming.sqlQueries.length > 0
              ? { sql_queries: streaming.sqlQueries }
              : undefined,
        }
      : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <ConversationTabs
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectTab}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-uzz-mint/10 text-uzz-mint">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Assistente IA
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Faça perguntas sobre seus clientes, conversas e métricas.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-uzz-mint/50 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <AssistantMessage
            key={msg.id}
            message={msg}
            question={
              msg.role === "assistant" && messages[i - 1]?.role === "user"
                ? messages[i - 1].content
                : undefined
            }
            conversationId={activeId ?? undefined}
          />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <>
            {streaming.thinkingStatus && !streaming.text && (
              <div className="flex gap-3 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-uzz-mint" />
                </div>
                <div className="flex items-center rounded-2xl rounded-tl-sm border border-border/50 bg-card px-4 py-2.5">
                  <span className="text-[13px] text-muted-foreground">
                    {streaming.thinkingStatus}
                  </span>
                  <span className="ml-2 inline-flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            {streamingMessage && (
              <AssistantMessage message={streamingMessage} isStreaming />
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <AssistantInput
        onSend={sendMessage}
        onStop={handleStop}
        isStreaming={isStreaming}
        disabled={false}
      />
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  "Quantos clientes ativos tenho?",
  "Quais foram as últimas 5 conversas?",
  "Resumo do uso de tokens esta semana",
  'Clientes com status "humano" agora',
];
