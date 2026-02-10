"use client";

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
import { Label } from "@/components/ui/label";
import type { CRMColumn } from "@/lib/types";
import { useEffect, useState } from "react";

interface EditColumnDialogProps {
  column: CRMColumn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    color?: string;
    icon?: string;
  }) => Promise<any>;
}

const COLUMN_COLORS = [
  { name: "Cinza", value: "#6B7280" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Laranja", value: "#F97316" },
  { name: "Amarelo", value: "#EAB308" },
  { name: "Verde", value: "#22C55E" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Rosa", value: "#EC4899" },
];

const COLUMN_ICONS = [
  { name: "Inbox", value: "inbox" },
  { name: "Clock", value: "clock" },
  { name: "Phone", value: "phone" },
  { name: "MessageCircle", value: "message-circle" },
  { name: "CheckCircle", value: "check-circle" },
  { name: "XCircle", value: "x-circle" },
  { name: "Star", value: "star" },
  { name: "Heart", value: "heart" },
  { name: "Flag", value: "flag" },
  { name: "Zap", value: "zap" },
];

export const EditColumnDialog = ({
  column,
  open,
  onOpenChange,
  onSave,
}: EditColumnDialogProps) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLUMN_COLORS[0].value);
  const [icon, setIcon] = useState(COLUMN_ICONS[0].value);
  const [loading, setLoading] = useState(false);

  // Update form when column changes
  useEffect(() => {
    if (column) {
      console.log("[EditColumnDialog] Column loaded:", column);
      setName(column.name);
      setColor(column.color);
      setIcon(column.icon);
    }
  }, [column]);

  const handleSave = async () => {
    if (!name.trim() || !column) {
      console.log("[EditColumnDialog] Cannot save, missing name or column");
      return;
    }

    console.log("[EditColumnDialog] Saving column:", { name, color, icon });
    setLoading(true);
    try {
      const result = await onSave({
        name: name.trim(),
        color,
        icon,
      });

      if (result) {
        console.log("[EditColumnDialog] Save successful");
        onOpenChange(false);
      } else {
        console.log("[EditColumnDialog] Save failed");
      }
    } catch (error) {
      console.error("[EditColumnDialog] Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Coluna</DialogTitle>
          <DialogDescription>
            Altere o nome, cor e ícone da coluna.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nome da Coluna</Label>
            <Input
              id="edit-name"
              placeholder="Ex: Em Negociação"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleSave();
                }
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_ICONS.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  className={`w-10 h-10 rounded-lg border text-xs flex items-center justify-center transition-all ${
                    icon === i.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setIcon(i.value)}
                  title={i.name}
                >
                  {i.name.slice(0, 2)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
