"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { centsToCurrency } from "@/lib/admin-helpers";
import { Eye, Loader2, RefreshCw } from "lucide-react";

export interface AdminClientListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  email: string | null;
  plan_name: string;
  plan_status: string;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  last_payment_at: string | null;
  last_payment_amount: number;
  activated: boolean;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

interface ClientsTableProps {
  clients: AdminClientListItem[];
  loading: boolean;
  searchValue: string;
  statusValue: string;
  pagination: PaginationState;
  activatingClientId?: string | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onViewDetails: (client: AdminClientListItem) => void;
  onActivateClient: (client: AdminClientListItem) => void;
}

const formatDate = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
};

const statusLabel: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  past_due: "Atraso",
  canceled: "Cancelado",
  suspended: "Suspenso",
  incomplete: "Incompleto",
};

const statusClassName: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  trial: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  past_due: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  canceled: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  suspended: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20",
  incomplete: "bg-violet-500/15 text-violet-700 border-violet-500/20",
};

const getStatusBadge = (status: string) => {
  const key = (status || "trial").toLowerCase();
  return (
    <Badge variant="outline" className={statusClassName[key] ?? statusClassName.trial}>
      {statusLabel[key] ?? statusLabel.trial}
    </Badge>
  );
};

export function ClientsTable({
  clients,
  loading,
  searchValue,
  statusValue,
  pagination,
  activatingClientId,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onPageChange,
  onViewDetails,
  onActivateClient,
}: ClientsTableProps) {
  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit));
  const canGoPrevious = pagination.page > 1;
  const canGoNext = pagination.page < totalPages;
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = pagination.total === 0
    ? 0
    : Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nome ou email"
            className="w-full sm:w-80"
          />
          <Select value={statusValue} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="past_due">Atraso</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="incomplete">Incompleto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ultimo pagamento</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Carregando clientes...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Nenhum cliente encontrado para os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.email ?? "Sem email"}</p>
                    </div>
                  </TableCell>
                  <TableCell>{client.plan_name || "trial"}</TableCell>
                  <TableCell>{getStatusBadge(client.plan_status)}</TableCell>
                  <TableCell>
                    {client.last_payment_at ? (
                      <div>
                        <p>{formatDate(client.last_payment_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          {centsToCurrency(client.last_payment_amount)}
                        </p>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(client)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>

                      {!client.activated && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onActivateClient(client)}
                          disabled={activatingClientId === client.id}
                        >
                          {activatingClientId === client.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : null}
                          Ativar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {rangeStart}
          {" - "}
          {rangeEnd}
          {" de "}
          {pagination.total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!canGoPrevious || loading}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {pagination.page} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!canGoNext || loading}
          >
            Proxima
          </Button>
        </div>
      </div>
    </div>
  );
}
