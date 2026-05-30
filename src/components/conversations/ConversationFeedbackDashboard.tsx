"use client";

import { cn } from "@/lib/utils";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FeedbackKind = "like" | "dislike" | "bug";
type FilterKind = "all" | FeedbackKind;

interface ConversationFeedbackRow {
  id: string;
  client_id: string;
  trace_id: string | null;
  phone: string;
  message_id: string | null;
  wamid: string | null;
  message_content: string | null;
  message_direction: "incoming" | "outgoing" | null;
  feedback: FeedbackKind;
  observations: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string | null; // superadmin only
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BADGE: Record<
  FeedbackKind,
  { label: string; className: string; Icon: typeof ThumbsUp }
> = {
  like: {
    label: "Gostei",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Icon: ThumbsUp,
  },
  dislike: {
    label: "Não gostei",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
    Icon: ThumbsDown,
  },
  bug: {
    label: "Bug",
    className: "bg-orange-400/10 text-orange-500 border-orange-400/20",
    Icon: Bug,
  },
};

function FeedbackBadge({ kind }: { kind: FeedbackKind }) {
  const { label, className, Icon } = BADGE[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function DirectionBadge({ dir }: { dir: "incoming" | "outgoing" | null }) {
  if (!dir) return <span className="text-muted-foreground/40">—</span>;
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
        dir === "outgoing"
          ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
          : "border-slate-500/20 bg-slate-500/10 text-slate-400",
      )}
    >
      {dir === "outgoing" ? "Bot" : "Usuário"}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Expandable cell ───────────────────────────────────────────────────────────

function ExpandableText({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className="text-muted-foreground/50">—</span>;
  const short = text.length > 120;
  return (
    <div>
      <span className="whitespace-pre-wrap break-words">
        {open || !short ? text : text.slice(0, 120) + "…"}
      </span>
      {short && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-uzz-mint hover:underline"
        >
          {open ? (
            <>
              <ChevronUp className="h-3 w-3" /> Menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Mais
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function ConversationFeedbackDashboard() {
  const [rows, setRows] = useState<ConversationFeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [page, setPage] = useState(1);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: filter,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/message-feedback?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar feedbacks de conversas");
      const json = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      setIsSuperAdmin(json.is_super_admin === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilter = (f: FilterKind) => {
    setFilter(f);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const FILTERS: Array<{ value: FilterKind; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "like", label: "👍 Gostei" },
    { value: "dislike", label: "👎 Não gostei" },
    { value: "bug", label: "🐛 Bug" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills + refresh */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-uzz-mint bg-uzz-mint/10 text-uzz-mint"
                : "border-border bg-card text-muted-foreground hover:border-uzz-mint/40 hover:text-foreground",
            )}
          >
            {f.label}
            {f.value === filter && total > 0 && (
              <span className="ml-1 text-[10px] opacity-70">{total}</span>
            )}
          </button>
        ))}

        <button
          onClick={load}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && rows.length === 0 && (
        <div className="rounded-lg border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Nenhum feedback de conversa encontrado.
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-muted/60">
                <tr>
                  <th className="whitespace-nowrap border-b border-border/60 px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground">
                    Data
                  </th>
                  <th className="whitespace-nowrap border-b border-border/60 px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground">
                    Tipo
                  </th>
                  {isSuperAdmin && (
                    <th className="whitespace-nowrap border-b border-border/60 px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground">
                      Cliente
                    </th>
                  )}
                  <th className="whitespace-nowrap border-b border-border/60 px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground">
                    Telefone
                  </th>
                  <th className="whitespace-nowrap border-b border-border/60 px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground">
                    Direção
                  </th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground">
                    Mensagem
                  </th>
                  <th className="border-b border-border/60 px-4 py-2.5 text-left font-medium uppercase tracking-wide text-muted-foreground">
                    Observação
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/20 last:border-0 align-top transition-colors hover:bg-muted/20",
                      i % 2 === 0 ? "bg-background" : "bg-muted/10",
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <FeedbackBadge kind={row.feedback} />
                    </td>
                    {isSuperAdmin && (
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-foreground">
                        {row.client_name ?? (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {row.phone || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <DirectionBadge dir={row.message_direction} />
                    </td>
                    <td className="max-w-[320px] px-4 py-2.5 text-foreground">
                      <ExpandableText text={row.message_content} />
                    </td>
                    <td className="max-w-[200px] px-4 py-2.5">
                      <ExpandableText text={row.observations} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-border px-2.5 py-1 transition-colors hover:bg-muted disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-border px-2.5 py-1 transition-colors hover:bg-muted disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
