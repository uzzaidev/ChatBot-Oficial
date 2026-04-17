"use client";

import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ContactNameEditorProps {
  phone: string | number;
  initialName?: string | null;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  editButtonClassName?: string;
  disabled?: boolean;
  onSaved?: (name: string) => void | Promise<void>;
}

const normalizeName = (value?: string | null): string => value?.trim() || "";

export function ContactNameEditor({
  phone,
  initialName,
  className,
  textClassName,
  inputClassName,
  editButtonClassName,
  disabled = false,
  onSaved,
}: ContactNameEditorProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentName, setCurrentName] = useState(normalizeName(initialName));
  const [draftName, setDraftName] = useState(normalizeName(initialName));

  useEffect(() => {
    const normalized = normalizeName(initialName);
    setCurrentName(normalized);
    if (!isEditing) {
      setDraftName(normalized);
    }
  }, [initialName, isEditing]);

  const handleStartEditing = () => {
    if (disabled || isSaving) return;
    setDraftName(currentName);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isSaving) return;
    setDraftName(currentName);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedName = draftName.trim();
    const normalizedCurrent = currentName.trim();

    if (!trimmedName) {
      toast({
        title: "Nome inválido",
        description: "O nome do contato não pode ficar vazio.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName === normalizedCurrent) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch(`/api/contacts/${String(phone)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        let errorMessage = "Não foi possível atualizar o nome do contato.";
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore JSON parse failure and keep default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const updatedName = normalizeName(data?.contact?.name) || trimmedName;

      setCurrentName(updatedName);
      setDraftName(updatedName);
      setIsEditing(false);
      await onSaved?.(updatedName);

      toast({
        title: "Nome atualizado",
        description: "O nome do contato foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar nome",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o nome do contato.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSave();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }
          }}
          placeholder="Nome do contato"
          autoFocus
          disabled={isSaving}
          className={cn("h-9", inputClassName)}
          maxLength={120}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className={cn("h-8 w-8", editButtonClassName)}
          aria-label="Salvar nome"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={isSaving}
          className={cn("h-8 w-8", editButtonClassName)}
          aria-label="Cancelar edição"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className={cn("truncate", textClassName)}>
        {currentName || "Sem nome"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleStartEditing}
        disabled={disabled || isSaving}
        className={cn(
          "h-7 w-7 text-muted-foreground hover:text-foreground",
          editButtonClassName,
        )}
        aria-label="Editar nome"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
