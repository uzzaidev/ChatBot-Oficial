"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useState } from "react";

interface CreateColumnDialogProps {
  onCreateColumn: (data: {
    name: string;
    color?: string;
    icon?: string;
  }) => Promise<any>;
  disabled?: boolean;
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

export const CreateColumnDialog = ({
  onCreateColumn,
  disabled = false,
}: CreateColumnDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLUMN_COLORS[0].value);
  const [icon, setIcon] = useState(COLUMN_ICONS[0].value);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const result = await onCreateColumn({
        name: name.trim(),
        color,
        icon,
      });

      if (result) {
        setOpen(false);
        setName("");
        setColor(COLUMN_COLORS[0].value);
        setIcon(COLUMN_ICONS[0].value);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="hidden md:flex" disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Coluna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Coluna</DialogTitle>
          <DialogDescription>
            Crie uma nova coluna para organizar seus cards no CRM.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Coluna</Label>
            <Input
              id="name"
              placeholder="Ex: Em Negociação"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleCreate();
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

          {/* Preview */}
          <div className="grid gap-2">
            <Label>Preview</Label>
            <div
              className="flex items-center gap-2 p-3 rounded-lg border"
              style={{ borderLeftColor: color, borderLeftWidth: 4 }}
            >
              <span className="font-medium">{name || "Nome da coluna"}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || loading}>
            {loading ? "Criando..." : "Criar Coluna"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
