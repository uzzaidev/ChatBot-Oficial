"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HumanFeedbackPayload } from "@/hooks/useHumanFeedback";
import { useEffect, useMemo, useState } from "react";

type FeedbackVerdict = HumanFeedbackPayload["verdict"];
type ErrorCategory = NonNullable<HumanFeedbackPayload["error_category"]>;

const errorCategoryOptions: Array<{ value: ErrorCategory; label: string }> = [
  { value: "wrong_chunk", label: "Chunk incorreto" },
  { value: "bad_generation", label: "Geração incorreta" },
  { value: "missing_info", label: "Faltou informação" },
  { value: "hallucination", label: "Alucinação" },
  { value: "gt_outdated", label: "Ground truth desatualizado" },
  { value: "other", label: "Outro" },
];

interface HumanFeedbackModalProps {
  open: boolean;
  initialVerdict: FeedbackVerdict;
  traceId: string;
  score?: number;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: HumanFeedbackPayload) => Promise<void> | void;
}

export function HumanFeedbackModal({
  open,
  initialVerdict,
  traceId,
  score,
  submitting = false,
  onClose,
  onConfirm,
}: HumanFeedbackModalProps) {
  const [verdict, setVerdict] = useState<FeedbackVerdict>(initialVerdict);
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | "">("");
  const [reason, setReason] = useState("");
  const [correctionText, setCorrectionText] = useState("");
  const [promoteToGroundTruth, setPromoteToGroundTruth] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVerdict(initialVerdict);
    setErrorCategory("");
    setReason("");
    setCorrectionText("");
    setPromoteToGroundTruth(false);
    setValidationError(null);
  }, [open, initialVerdict]);

  const requiresErrorCategory = useMemo(
    () => verdict === "incorrect" || verdict === "partial",
    [verdict],
  );

  const handleConfirm = async () => {
    if (requiresErrorCategory && !errorCategory) {
      setValidationError("Selecione um motivo para continuar.");
      return;
    }
    if (promoteToGroundTruth && !correctionText.trim()) {
      setValidationError(
        "Preencha a correção antes de promover para Ground Truth.",
      );
      return;
    }

    setValidationError(null);
    await onConfirm({
      verdict,
      correction_text: correctionText.trim() || undefined,
      reason: reason.trim() || undefined,
      error_category: errorCategory || undefined,
      promote_to_ground_truth: promoteToGroundTruth,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisão humana</DialogTitle>
          <DialogDescription>
            Trace: {traceId.slice(0, 8)}...
            {score != null ? ` · score atual ${score.toFixed(2)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Veredito</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={verdict === "correct" ? "default" : "outline"}
                onClick={() => setVerdict("correct")}
              >
                Correto
              </Button>
              <Button
                type="button"
                size="sm"
                variant={verdict === "incorrect" ? "default" : "outline"}
                onClick={() => setVerdict("incorrect")}
              >
                Incorreto
              </Button>
              <Button
                type="button"
                size="sm"
                variant={verdict === "partial" ? "default" : "outline"}
                onClick={() => setVerdict("partial")}
              >
                Parcial
              </Button>
            </div>
          </div>

          {requiresErrorCategory && (
            <div className="space-y-2">
              <Label>Categoria do erro</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {errorCategoryOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={errorCategory === option.value ? "default" : "outline"}
                    onClick={() => setErrorCategory(option.value)}
                    className="justify-start"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="hf-reason">Motivo (opcional)</Label>
            <Textarea
              id="hf-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva por que marcou esse veredito"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hf-correction">Texto corrigido (opcional)</Label>
            <Textarea
              id="hf-correction"
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              placeholder="Resposta corrigida que deveria ser enviada ao usuário"
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="hf-promote-gt"
              checked={promoteToGroundTruth}
              onCheckedChange={(checked) => setPromoteToGroundTruth(Boolean(checked))}
            />
            <Label htmlFor="hf-promote-gt">
              Promover correção para Ground Truth
            </Label>
          </div>

          {validationError && (
            <p className="text-sm text-red-500">{validationError}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
