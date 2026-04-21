"use client";

import { Button } from "@/components/ui/button";
import { EvaluationDetailPayload } from "./EvaluationDetails";

interface ConversationReviewProps {
  detail: EvaluationDetailPayload | null;
  onQuickReview: (verdict: "correct" | "incorrect" | "partial") => void;
}

export function ConversationReview({
  detail,
  onQuickReview,
}: ConversationReviewProps) {
  return (
    <div className="rounded-lg border p-4 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Conversa</p>
        <p className="text-xs text-muted-foreground">Atalhos 1/2/3</p>
      </div>

      {!detail?.trace ? (
        <p className="text-sm text-muted-foreground">
          Selecione uma avaliação para revisar a conversa.
        </p>
      ) : (
        <>
          <div className="space-y-2 overflow-auto flex-1">
            <div className="rounded-md border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Usuário</p>
              <p className="text-sm whitespace-pre-wrap">{detail.trace.user_message}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground mb-1">Agente</p>
              <p className="text-sm whitespace-pre-wrap">{detail.trace.agent_response}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onQuickReview("correct")}
            >
              1 · Correto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onQuickReview("incorrect")}
            >
              2 · Incorreto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onQuickReview("partial")}
            >
              3 · Parcial
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
