"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClientDetailsModal } from "@/components/admin/ClientDetailsModal";
import { ClientsTable, type AdminClientListItem } from "@/components/admin/ClientsTable";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface ClientsListResponse {
  clients: AdminClientListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  error?: string;
}

const DEFAULT_LIMIT = 20;

export default function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
  });

  const [selectedClient, setSelectedClient] = useState<AdminClientListItem | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activatingClientId, setActivatingClientId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(DEFAULT_LIMIT),
      });

      if (search.trim()) {
        params.set("q", search.trim());
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await apiFetch(`/api/admin/clients?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = (await response.json()) as ClientsListResponse;

      if (!response.ok) {
        throw new Error(json.error ?? "Falha ao carregar clientes.");
      }

      setClients(json.clients ?? []);
      setPagination({
        page: json.pagination?.page ?? page,
        limit: json.pagination?.limit ?? DEFAULT_LIMIT,
        total: json.pagination?.total ?? 0,
      });
    } catch (loadError: any) {
      setError(loadError?.message ?? "Erro inesperado ao buscar clientes.");
      setClients([]);
      setPagination({
        page: 1,
        limit: DEFAULT_LIMIT,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const openDetails = (client: AdminClientListItem) => {
    setSelectedClient(client);
    setDetailsModalOpen(true);
  };

  const activateClient = async (client: AdminClientListItem) => {
    setActivatingClientId(client.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiFetch("/api/stripe/platform/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          trialPeriodDays: 14,
        }),
      });

      const json = (await response.json()) as {
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(json.details ?? json.error ?? "Falha ao ativar cliente.");
      }

      setSuccess(`Cliente ${client.name} ativado com assinatura de plataforma.`);
      await loadClients();
    } catch (activateError: any) {
      setError(activateError?.message ?? "Erro ao ativar cliente.");
    } finally {
      setActivatingClientId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Clientes da plataforma</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visao admin do billing da UzzAI (Contexto A) com status de plano e cobranca.
          </p>
        </div>
        <Button variant="outline" onClick={loadClients} disabled={loading}>
          Atualizar lista
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <ClientsTable
        clients={clients}
        loading={loading}
        searchValue={searchInput}
        statusValue={statusFilter}
        pagination={pagination}
        activatingClientId={activatingClientId}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onRefresh={loadClients}
        onPageChange={setPage}
        onViewDetails={openDetails}
        onActivateClient={activateClient}
      />

      <ClientDetailsModal
        client={selectedClient}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />
    </div>
  );
}

