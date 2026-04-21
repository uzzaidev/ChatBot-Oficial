"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroundTruthFormModal } from "@/components/quality/GroundTruthFormModal";
import { useGroundTruth, type GroundTruthEntry } from "@/hooks/useGroundTruth";

export function GroundTruthManager() {
  const {
    items,
    total,
    loading,
    error,
    filters,
    setFilters,
    createItem,
    updateItem,
    deactivateItem,
    validateItem,
    refetch,
  } = useGroundTruth();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<GroundTruthEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items],
  );

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: GroundTruthEntry) => {
    setModalMode("edit");
    setEditing(item);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: {
    user_query: string;
    expected_response: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    confidence?: number;
  }) => {
    setMessage(null);
    setSaving(true);
    try {
      if (modalMode === "edit" && editing) {
        await updateItem(editing.id, {
          ...payload,
          category: payload.category ?? null,
          subcategory: payload.subcategory ?? null,
        });
        setMessage("Entrada versionada com sucesso.");
      } else {
        await createItem(payload);
        setMessage("Entrada criada com sucesso.");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao salvar entrada.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Ground Truth</h1>
        <Badge variant="outline">Total: {total}</Badge>
        <Badge variant="outline">Ativas: {activeCount}</Badge>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Atualizar
        </Button>
        <Button size="sm" onClick={openCreate}>
          Nova entrada
        </Button>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground break-words">{message}</p>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            placeholder="Buscar por pergunta/resposta"
            value={filters.search ?? ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value || undefined,
              }))
            }
          />
          <Input
            className="max-w-xs"
            placeholder="Filtrar categoria"
            value={filters.category ?? ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                category: e.target.value || undefined,
              }))
            }
          />
          <Button
            size="sm"
            variant={filters.active === "true" ? "default" : "outline"}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                active: prev.active === "true" ? undefined : "true",
              }))
            }
          >
            So ativas
          </Button>
          <Button
            size="sm"
            variant={filters.active === "false" ? "default" : "outline"}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                active: prev.active === "false" ? undefined : "false",
              }))
            }
          >
            So inativas
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500">
            Erro ao carregar entradas: {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrada encontrada.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "ativa" : "inativa"}
                  </Badge>
                  <Badge variant="outline">v{item.version}</Badge>
                  {item.category && <Badge variant="outline">{item.category}</Badge>}
                  <span className="text-xs text-muted-foreground">
                    conf: {Number(item.confidence).toFixed(2)}
                  </span>
                </div>

                <p className="text-sm font-medium">{item.user_query}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {item.expected_response}
                </p>

                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                    Editar (nova versao)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await validateItem(item.id);
                        setMessage("Entrada validada.");
                      } catch (e) {
                        setMessage(
                          e instanceof Error ? e.message : "Erro ao validar entrada.",
                        );
                      }
                    }}
                  >
                    Validar
                  </Button>
                  {item.is_active && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await deactivateItem(item.id);
                          setMessage("Entrada desativada.");
                        } catch (e) {
                          setMessage(
                            e instanceof Error
                              ? e.message
                              : "Erro ao desativar entrada.",
                          );
                        }
                      }}
                    >
                      Desativar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <GroundTruthFormModal
        open={modalOpen}
        mode={modalMode}
        initialItem={editing}
        isSaving={saving}
        onOpenChange={setModalOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
