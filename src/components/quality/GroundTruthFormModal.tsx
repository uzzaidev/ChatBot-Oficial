"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GroundTruthEntry } from "@/hooks/useGroundTruth";

type FormValues = {
  user_query: string;
  expected_response: string;
  category: string;
  subcategory: string;
  tags: string;
  confidence: string;
};

const initialValues: FormValues = {
  user_query: "",
  expected_response: "",
  category: "",
  subcategory: "",
  tags: "",
  confidence: "0.70",
};

interface GroundTruthFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialItem?: GroundTruthEntry | null;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    user_query: string;
    expected_response: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    confidence?: number;
  }) => Promise<void> | void;
}

export function GroundTruthFormModal({
  open,
  mode,
  initialItem,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: GroundTruthFormModalProps) {
  const [values, setValues] = useState<FormValues>(initialValues);

  useEffect(() => {
    if (!open) return;
    if (initialItem) {
      setValues({
        user_query: initialItem.user_query ?? "",
        expected_response: initialItem.expected_response ?? "",
        category: initialItem.category ?? "",
        subcategory: initialItem.subcategory ?? "",
        tags: (initialItem.tags ?? []).join(", "),
        confidence: String(initialItem.confidence ?? 0.7),
      });
      return;
    }
    setValues(initialValues);
  }, [initialItem, open]);

  const submit = async () => {
    const tags = values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);

    await onSubmit({
      user_query: values.user_query,
      expected_response: values.expected_response,
      category: values.category || undefined,
      subcategory: values.subcategory || undefined,
      tags,
      confidence: Number(values.confidence),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar entrada (nova versão)" : "Nova entrada"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "A edição cria uma nova versão e preserva o histórico."
              : "Crie uma entrada curada de pergunta e resposta esperada."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Pergunta do usuário"
            value={values.user_query}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, user_query: event.target.value }))
            }
          />
          <Textarea
            placeholder="Resposta esperada"
            rows={6}
            value={values.expected_response}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                expected_response: event.target.value,
              }))
            }
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Categoria"
              value={values.category}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, category: event.target.value }))
              }
            />
            <Input
              placeholder="Subcategoria"
              value={values.subcategory}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  subcategory: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Tags separadas por vírgula"
              value={values.tags}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, tags: event.target.value }))
              }
            />
            <Input
              placeholder="Confiança (0 a 1)"
              value={values.confidence}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, confidence: event.target.value }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isSaving}>
            {isSaving ? "Salvando..." : mode === "edit" ? "Salvar versão" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
