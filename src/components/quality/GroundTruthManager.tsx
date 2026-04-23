"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { GroundTruthFormModal } from "@/components/quality/GroundTruthFormModal";
import {
  useGroundTruth,
  type GroundTruthBootstrapCandidate,
  type GroundTruthEntry,
} from "@/hooks/useGroundTruth";

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
    createFromTraceBulk,
    fetchBootstrapCandidates,
    refetch,
  } = useGroundTruth();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<GroundTruthEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<GroundTruthBootstrapCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [promotingCandidates, setPromotingCandidates] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, boolean>>({});

  const activeCount = useMemo(
    () => items.filter((item) => item.is_active).length,
    [items],
  );
  const selectedCandidateIds = useMemo(
    () =>
      Object.entries(selectedCandidates)
        .filter(([, checked]) => checked)
        .map(([traceId]) => traceId),
    [selectedCandidates],
  );
  const allCandidatesSelected =
    candidates.length > 0 && selectedCandidateIds.length === candidates.length;

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

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    setMessage(null);
    try {
      const data = await fetchBootstrapCandidates({ limit: 30, lookbackDays: 30 });
      setCandidates(data);
      setSelectedCandidates({});
      setMessage(
        data.length > 0
          ? `${data.length} candidatos carregados para bootstrap de GT.`
          : "Nenhum candidato novo encontrado no periodo.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao buscar candidatos.");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const promoteSelectedCandidates = async () => {
    if (selectedCandidateIds.length === 0) {
      setMessage("Selecione ao menos 1 candidato para promover.");
      return;
    }

    setPromotingCandidates(true);
    setMessage(null);
    try {
      const selectedSet = new Set(selectedCandidateIds);
      const payload = candidates
        .filter((candidate) => selectedSet.has(candidate.trace_id))
        .map((candidate) => ({
          trace_id: candidate.trace_id,
          expected_response: candidate.expected_response,
        }));

      const result = await createFromTraceBulk(payload);
      const createdSet = new Set(result.created.map((item) => item.trace_id));

      setCandidates((prev) =>
        prev.filter((candidate) => !createdSet.has(candidate.trace_id)),
      );
      setSelectedCandidates((prev) => {
        const next = { ...prev };
        for (const traceId of selectedCandidateIds) delete next[traceId];
        return next;
      });
      setMessage(
        `Lote concluido: ${result.summary.created} criados, ${result.summary.skipped} pulados, ${result.summary.failed} falhas.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Erro ao promover candidatos em lote.",
      );
    } finally {
      setPromotingCandidates(false);
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
        <div className="rounded-md border border-border/70 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Bootstrap S2 (candidatos de traces)</p>
            <Badge variant="outline">Disponiveis: {candidates.length}</Badge>
            <Badge variant="outline">Selecionados: {selectedCandidateIds.length}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={loadCandidates}
              disabled={loadingCandidates}
            >
              {loadingCandidates ? "Carregando..." : "Carregar candidatos"}
            </Button>
            <Button
              size="sm"
              onClick={promoteSelectedCandidates}
              disabled={promotingCandidates || selectedCandidateIds.length === 0}
            >
              {promotingCandidates ? "Promovendo..." : "Promover selecionados"}
            </Button>
            {candidates.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedCandidates(
                    allCandidatesSelected
                      ? {}
                      : Object.fromEntries(
                          candidates.map((candidate) => [candidate.trace_id, true]),
                        ),
                  )
                }
              >
                {allCandidatesSelected ? "Limpar selecao" : "Selecionar todos"}
              </Button>
            )}
          </div>

          {candidates.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {candidates.map((candidate) => (
                <div
                  key={candidate.trace_id}
                  className="rounded border border-border/60 p-2 flex gap-2"
                >
                  <Checkbox
                    checked={Boolean(selectedCandidates[candidate.trace_id])}
                    onCheckedChange={(checked) =>
                      setSelectedCandidates((prev) => ({
                        ...prev,
                        [candidate.trace_id]: Boolean(checked),
                      }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{candidate.user_query}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {candidate.expected_response}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      trace {candidate.trace_id.slice(0, 8)}... •{" "}
                      {new Date(candidate.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
