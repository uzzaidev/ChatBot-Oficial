"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Bug, CheckCircle2, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type FeedbackKind = "like" | "dislike" | "bug";

interface MessageFeedbackButtonsProps {
  message: Message;
}

const getWamid = (message: Message) => {
  const raw =
    message.metadata && typeof message.metadata === "object"
      ? (message.metadata as Record<string, unknown>).wamid
      : null;
  return typeof raw === "string" ? raw : null;
};

export function MessageFeedbackButtons({ message }: MessageFeedbackButtonsProps) {
  const existingFeedback =
    message.metadata && typeof message.metadata === "object"
      ? ((message.metadata as Record<string, unknown>).feedback as
          | FeedbackKind
          | undefined)
      : undefined;

  const [selected, setSelected] = useState<FeedbackKind | null>(
    existingFeedback ?? null,
  );
  const [pending, setPending] = useState<FeedbackKind | null>(null);
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (pending) textareaRef.current?.focus();
  }, [pending]);

  const submit = async (kind: FeedbackKind, note: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/message-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          wamid: getWamid(message),
          phone: message.phone,
          content: message.content,
          direction: message.direction,
          timestamp: message.timestamp,
          feedback: kind,
          observations: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }

      setSelected(kind);
      setPending(null);
      setObservations("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Nao foi possivel salvar feedback: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const buttons: Array<{
    kind: FeedbackKind;
    label: string;
    Icon: typeof ThumbsUp;
    activeClass: string;
  }> = [
    {
      kind: "like",
      label: "Gostei",
      Icon: ThumbsUp,
      activeClass: "data-[active=true]:text-emerald-500 data-[active=true]:bg-emerald-500/10 hover:text-emerald-500",
    },
    {
      kind: "dislike",
      label: "Nao gostei",
      Icon: ThumbsDown,
      activeClass: "data-[active=true]:text-red-500 data-[active=true]:bg-red-500/10 hover:text-red-500",
    },
    {
      kind: "bug",
      label: "Reportar bug",
      Icon: Bug,
      activeClass: "data-[active=true]:text-orange-500 data-[active=true]:bg-orange-500/10 hover:text-orange-500",
    },
  ];

  return (
    <div className="relative mt-1 flex items-center justify-end gap-1 px-1">
      {selected && (
        <span className="mr-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Revisado
        </span>
      )}

      {buttons.map(({ kind, label, Icon, activeClass }) => (
        <button
          key={kind}
          type="button"
          data-active={selected === kind}
          disabled={loading}
          title={selected && selected !== kind ? `Alterar para: ${label}` : label}
          onClick={() => setPending(kind)}
          className={cn(
            "rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted disabled:opacity-50",
            activeClass,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", selected === kind && "fill-current")} />
        </button>
      ))}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !loading) {
              setPending(null);
              setObservations("");
            }
          }}
        >
          <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
            <button
              type="button"
              onClick={() => {
                if (!loading) {
                  setPending(null);
                  setObservations("");
                }
              }}
              className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-2 pr-8 text-sm font-semibold text-foreground">
              Adicionar feedback
            </h3>
            <textarea
              ref={textareaRef}
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Opcional: descreva o que ficou bom, ruim ou com bug."
              className="min-h-[96px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => submit(pending, "")}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Salvar sem comentario
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => submit(pending, observations)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
