"use client";

import { cn } from "@/lib/utils";
import {
  BarChart2,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Table2,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import remarkGfm from "remark-gfm";

export interface AssistantMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    model?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    generation_ms?: number;
    sql_queries?: Array<{
      sql: string;
      executionMs?: number;
      rowCount?: number;
      rows?: Record<string, unknown>[];
    }>;
  };
  createdAt?: string;
}

interface AssistantMessageProps {
  message: AssistantMessageData;
  isStreaming?: boolean;
  /** The user question that triggered this assistant response (for feedback). */
  question?: string;
  /** Current conversation id (for feedback). */
  conversationId?: string;
}

function SqlPanel({
  queries,
}: {
  queries: NonNullable<AssistantMessageData["metadata"]>["sql_queries"];
}) {
  const [open, setOpen] = useState(false);
  if (!queries || queries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 text-xs overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Database className="h-3 w-3 flex-shrink-0" />
        <span className="font-medium">
          {queries.length} consulta{queries.length > 1 ? "s" : ""} SQL
        </span>
        {open ? (
          <ChevronDown className="ml-auto h-3 w-3" />
        ) : (
          <ChevronRight className="ml-auto h-3 w-3" />
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/30 p-3">
          {queries.map((q, i) => (
            <div key={i} className="space-y-1">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background/60 px-3 py-2 font-mono text-[11px] text-foreground">
                {q.sql}
              </pre>
              {(q.rowCount !== undefined || q.executionMs !== undefined) && (
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  {q.rowCount !== undefined && (
                    <span>
                      {q.rowCount} linha{q.rowCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {q.executionMs !== undefined && (
                    <span>{q.executionMs}ms</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Query result panel (table + chart) ───────────────────────────────────────

type ResultRow = Record<string, unknown>;
type ViewMode = "table" | "bar" | "line";

/** Detect numeric columns (suitable for chart Y-axis) */
function numericKeys(rows: ResultRow[]): string[] {
  if (rows.length === 0) return [];
  const first = rows[0];
  return Object.keys(first).filter((k) => typeof first[k] === "number");
}

/** Pick the first non-numeric column as X-axis label */
function labelKey(rows: ResultRow[], numKeys: string[]): string {
  if (rows.length === 0) return "";
  return (
    Object.keys(rows[0]).find((k) => !numKeys.includes(k)) ??
    Object.keys(rows[0])[0]
  );
}

const CHART_COLORS = [
  "#1ABC9C",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
];

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("pt-BR")
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }
  return String(value);
}

function QueryResultPanel({ rows }: { rows: ResultRow[] }) {
  const numCols = numericKeys(rows);
  const xKey = labelKey(rows, numCols);
  const canChart = numCols.length > 0 && rows.length > 0;
  const [view, setView] = useState<ViewMode>("table");

  if (rows.length === 0) return null;

  const columns = Object.keys(rows[0]);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden text-xs">
      {/* Header with toggle */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <span className="text-[10px] font-medium text-muted-foreground">
          {rows.length} linha{rows.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center rounded-md border border-border/50 bg-background/40 p-0.5 gap-0.5">
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors",
              view === "table"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Table2 className="h-3 w-3" /> Tabela
          </button>
          {canChart && (
            <>
              <button
                onClick={() => setView("bar")}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors",
                  view === "bar"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BarChart2 className="h-3 w-3" /> Barras
              </button>
              <button
                onClick={() => setView("line")}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-colors",
                  view === "line"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BarChart2 className="h-3 w-3 -scale-x-100" /> Linha
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table view */}
      {view === "table" && (
        <div className="max-h-72 overflow-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-border/40 px-3 py-2 text-left font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-1.5 text-foreground whitespace-nowrap"
                    >
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart views */}
      {canChart && (view === "bar" || view === "line") && (
        <div className="p-3">
          <ResponsiveContainer width="100%" height={220}>
            {view === "bar" ? (
              <BarChart
                data={rows}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.3)"
                  vertical={false}
                />
                <XAxis
                  dataKey={xKey}
                  tick={{
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 11,
                  }}
                />
                {numCols.map((col, idx) => (
                  <Bar
                    key={col}
                    dataKey={col}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart
                data={rows}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.3)"
                  vertical={false}
                />
                <XAxis
                  dataKey={xKey}
                  tick={{
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 11,
                  }}
                />
                {numCols.map((col, idx) => (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Feedback buttons ─────────────────────────────────────────────────────────
type FeedbackKind = "like" | "dislike" | "bug";

function FeedbackButtons({
  response,
  question,
  sqlQuery,
  conversationId,
}: {
  response: string;
  question?: string;
  sqlQuery?: string;
  conversationId?: string;
}) {
  const [selected, setSelected] = useState<FeedbackKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<FeedbackKind | null>(null); // waiting for obs
  const [obs, setObs] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (pending !== null) textareaRef.current?.focus();
  }, [pending]);

  const doSubmit = async (kind: FeedbackKind, observations: string) => {
    setLoading(true);
    try {
      await fetch("/api/assistant/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          question,
          sqlQuery,
          response,
          feedback: kind,
          observations: observations.trim() || undefined,
        }),
      });
      setSelected(kind);
    } finally {
      setLoading(false);
      setPending(null);
      setObs("");
    }
  };

  const handleButtonClick = (kind: FeedbackKind) => {
    if (loading || selected !== null) return;
    setPending(kind);
  };

  const handleConfirm = () => {
    if (pending) doSubmit(pending, obs);
  };

  const handleSkip = () => {
    if (pending) doSubmit(pending, "");
  };

  const handleClose = () => {
    if (loading) return;
    handleSkip(); // close = save without obs
  };

  const buttons: Array<{
    kind: FeedbackKind;
    Icon: typeof ThumbsUp;
    title: string;
    color: string;
  }> = [
    {
      kind: "like",
      Icon: ThumbsUp,
      title: "Gostei",
      color:
        "hover:text-emerald-500 data-[active=true]:text-emerald-500 data-[active=true]:bg-emerald-500/10",
    },
    {
      kind: "dislike",
      Icon: ThumbsDown,
      title: "Não gostei",
      color:
        "hover:text-red-500 data-[active=true]:text-red-500 data-[active=true]:bg-red-500/10",
    },
    {
      kind: "bug",
      Icon: Bug,
      title: "Reportar bug",
      color:
        "hover:text-orange-400 data-[active=true]:text-orange-400 data-[active=true]:bg-orange-400/10",
    },
  ];

  const LABELS: Record<FeedbackKind, string> = {
    like: "Gostei 👍",
    dislike: "Não gostei 👎",
    bug: "Reportar bug 🐛",
  };

  return (
    <div className="relative flex items-center gap-0.5 px-1">
      {/* Saved indicator */}
      {selected !== null && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Salvo
        </span>
      )}

      {/* Feedback buttons */}
      {buttons.map(({ kind, Icon, title, color }) => (
        <button
          key={kind}
          data-active={selected === kind}
          onClick={() => handleButtonClick(kind)}
          disabled={loading || selected !== null}
          title={title}
          className={cn(
            "rounded p-1 text-muted-foreground/40 transition-colors disabled:cursor-default",
            selected === null && "hover:bg-muted",
            color,
          )}
        >
          <Icon
            className={cn("h-3 w-3", selected === kind && "fill-current")}
          />
        </button>
      ))}

      {/* Observation modal */}
      {pending !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-sm font-semibold text-foreground">
              {LABELS[pending]}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Adicione uma observação (opcional) para nos ajudar a melhorar.
            </p>

            <textarea
              ref={textareaRef}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                  handleConfirm();
              }}
              placeholder="Descreva o problema ou sugestão…"
              rows={3}
              className="mt-3 w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={handleSkip}
                disabled={loading}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Não quero
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg bg-uzz-mint px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-uzz-mint/90 disabled:opacity-50"
              >
                {loading ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main message component ────────────────────────────────────────────────────
export function AssistantMessage({
  message,
  isStreaming,
  question,
  conversationId,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const { metadata } = message;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-3 py-2", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
          isUser
            ? "bg-gradient-to-r from-uzz-mint to-emerald-500"
            : "bg-muted border border-border",
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Content bubble */}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1.5",
          isUser ? "max-w-[78%] items-end" : "max-w-full flex-1",
        )}
      >
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-uzz-mint to-emerald-500 px-4 py-2.5 text-[13px] leading-relaxed text-white shadow">
            {message.content}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {/* SQL queries above the text */}
            {metadata?.sql_queries && metadata.sql_queries.length > 0 && (
              <SqlPanel queries={metadata.sql_queries} />
            )}

            {/* Query result panels (table + chart) */}
            {metadata?.sql_queries
              ?.filter((q) => q.rows && q.rows.length > 0)
              .map((q, i) => (
                <QueryResultPanel key={i} rows={q.rows!} />
              ))}

            {/* Text content */}
            {message.content &&
              (() => {
                // If the AI already returned SQL rows shown via QueryResultPanel,
                // suppress duplicate markdown tables from the text response.
                const hasSqlRows = (metadata?.sql_queries ?? []).some(
                  (q) => q.rows && q.rows.length > 0,
                );
                return (
                  <div className="group/bubble relative rounded-2xl rounded-tl-sm border border-border/50 bg-card px-4 py-3 text-[13px] leading-relaxed text-foreground shadow-sm">
                    <div className="prose-assistant">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: hasSqlRows
                            ? () => null
                            : ({ children }) => (
                                <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
                                  <table className="w-full border-collapse text-[12px]">
                                    {children}
                                  </table>
                                </div>
                              ),
                          thead: ({ children }) => (
                            <thead className="bg-muted/60">{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th className="border-b border-border/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border-b border-border/30 px-3 py-2 text-foreground">
                              {children}
                            </td>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className;
                            if (isInline) {
                              return (
                                <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] font-mono text-uzz-mint">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <code className="block overflow-x-auto rounded-lg bg-muted p-3 text-[12px] font-mono leading-relaxed text-foreground">
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[12px]">
                              {children}
                            </pre>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">
                              {children}
                            </strong>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              className="text-uzz-mint underline decoration-uzz-mint/30 hover:decoration-uzz-mint"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-foreground">{children}</li>
                          ),
                          h1: ({ children }) => (
                            <h1 className="mb-2 text-base font-bold text-foreground">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-2 text-sm font-bold text-foreground">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                              {children}
                            </h3>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="my-2 border-l-2 border-uzz-mint pl-3 text-muted-foreground">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {isStreaming && (
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-uzz-mint" />
                    )}

                    {/* Copy button */}
                    {!isStreaming && (
                      <button
                        onClick={handleCopy}
                        className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-hover/bubble:flex"
                        title="Copiar"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-uzz-mint" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

            {/* Footer: model + tokens + feedback */}
            {!isStreaming && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  {metadata?.model && (
                    <span className="text-[10px] text-muted-foreground/50">
                      {metadata.model}
                    </span>
                  )}
                  {metadata?.prompt_tokens || metadata?.completion_tokens ? (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                      <Zap className="h-2.5 w-2.5" />
                      {(metadata.prompt_tokens ?? 0) +
                        (metadata.completion_tokens ?? 0)}{" "}
                      tokens
                    </span>
                  ) : null}
                  {metadata?.generation_ms ? (
                    <span className="text-[10px] text-muted-foreground/50">
                      {metadata.generation_ms < 1000
                        ? `${metadata.generation_ms}ms`
                        : `${(metadata.generation_ms / 1000).toFixed(1)}s`}
                    </span>
                  ) : null}
                </div>

                {/* Feedback buttons — only for completed assistant messages */}
                {message.content && (
                  <FeedbackButtons
                    response={message.content}
                    question={question}
                    sqlQuery={metadata?.sql_queries?.[0]?.sql}
                    conversationId={conversationId}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
