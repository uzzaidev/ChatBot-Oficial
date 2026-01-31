"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CRMTag } from "@/lib/types";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

interface TagsManagerProps {
  tags: CRMTag[];
  onCreateTag: (data: {
    name: string;
    color?: string;
    description?: string;
  }) => Promise<CRMTag | null>;
  onDeleteTag: (id: string) => Promise<boolean>;
  loading?: boolean;
}

const TAG_COLORS = [
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "red", label: "Vermelho", class: "bg-red-500" },
  { value: "yellow", label: "Amarelo", class: "bg-yellow-500" },
  { value: "purple", label: "Roxo", class: "bg-purple-500" },
  { value: "pink", label: "Rosa", class: "bg-pink-500" },
  { value: "orange", label: "Laranja", class: "bg-orange-500" },
  { value: "cyan", label: "Ciano", class: "bg-cyan-500" },
  { value: "gray", label: "Cinza", class: "bg-gray-500" },
];

const getTagColorClass = (color: string) => {
  const colorDef = TAG_COLORS.find((c) => c.value === color);
  return colorDef?.class || "bg-primary";
};

export const TagsManager = ({
  tags,
  onCreateTag,
  onDeleteTag,
  loading = false,
}: TagsManagerProps) => {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [newTagDescription, setNewTagDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreating(true);
    const result = await onCreateTag({
      name: newTagName.trim(),
      color: newTagColor,
      description: newTagDescription.trim() || undefined,
    });

    if (result) {
      setNewTagName("");
      setNewTagColor("blue");
      setNewTagDescription("");
    }
    setCreating(false);
  };

  const handleDeleteTag = async (id: string) => {
    setDeletingId(id);
    await onDeleteTag(id);
    setDeletingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="h-4 w-4" />
          Gerenciar Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
          <DialogDescription>
            Crie e gerencie tags personalizadas para organizar seus leads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Tag */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <h4 className="font-medium text-sm">Nova Tag</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tag-name" className="text-xs">
                  Nome
                </Label>
                <Input
                  id="tag-name"
                  placeholder="Ex: Interessado"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag-color" className="text-xs">
                  Cor
                </Label>
                <Select value={newTagColor} onValueChange={setNewTagColor}>
                  <SelectTrigger id="tag-color" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${color.class}`}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-description" className="text-xs">
                Descrição (opcional)
              </Label>
              <Input
                id="tag-description"
                placeholder="Descrição da tag..."
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || creating}
              size="sm"
              className="w-full"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Tag
            </Button>
          </div>

          {/* Existing Tags */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Tags Existentes</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma tag criada ainda.
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full ${getTagColorClass(
                            tag.color,
                          )}`}
                        />
                        <div>
                          <p className="font-medium text-sm">{tag.name}</p>
                          {tag.description && (
                            <p className="text-xs text-muted-foreground">
                              {tag.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={deletingId === tag.id}
                      >
                        {deletingId === tag.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
