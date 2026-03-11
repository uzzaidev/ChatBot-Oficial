"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentHistoryChart, type MonthlySummaryPoint } from "@/components/admin/PaymentHistoryChart";
import { centsToCurrency } from "@/lib/admin-helpers";
import { apiFetch } from "@/lib/api";
import { ExternalLink, Loader2 } from "lucide-react";

interface ListClient {
  id: string;
  name: string;
}

interface ClientDetailsResponse {
  client: {
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    notes: string | null;
    trial_ends_at: string | null;
    plan_name: string;
    plan_status: string;
  };
  owner: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    is_active: boolean;
    last_sign_in_at: string | null;
  } | null;
  subscription: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    plan_name: string | null;
    status: string;
    plan_amount: number;
    plan_currency: string;
    plan_interval: string | null;
    trial_start: string | null;
    trial_end: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    setup_fee_paid: boolean;
    setup_fee_amount: number | null;
    setup_fee_paid_at: string | null;
    last_payment_at: string | null;
    last_payment_amount: number | null;
    last_payment_status: string | null;
  } | null;
  stripe_connect: {
    stripe_account_id: string;
    account_status: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
  } | null;
}

interface PaymentItem {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  invoice_pdf: string | null;
  invoice_url: string | null;
}

interface PaymentHistoryResponse {
  payments: PaymentItem[];
  monthly_summary: MonthlySummaryPoint[];
}

interface ClientDetailsModalProps {
  client: ListClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDateTime = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
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

const renderStatus = (status?: string | null) => {
  const key = (status ?? "trial").toLowerCase();
  return (
    <Badge variant="outline" className={statusClassName[key] ?? statusClassName.trial}>
      {statusLabel[key] ?? statusLabel.trial}
    </Badge>
  );
};

const paymentStatusClassName: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  open: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  void: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20",
  uncollectible: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  draft: "bg-sky-500/15 text-sky-600 border-sky-500/20",
};

const paymentStatusLabel: Record<string, string> = {
  paid: "Pago",
  open: "Aberta",
  void: "Cancelada",
  uncollectible: "Inadimplente",
  draft: "Rascunho",
};

const renderPaymentStatus = (status?: string | null) => {
  const key = (status ?? "open").toLowerCase();
  return (
    <Badge
      variant="outline"
      className={paymentStatusClassName[key] ?? paymentStatusClassName.open}
    >
      {paymentStatusLabel[key] ?? key}
    </Badge>
  );
};

export function ClientDetailsModal({ client, open, onOpenChange }: ClientDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ClientDetailsResponse | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryPoint[]>([]);

  const loadClientData = useCallback(async () => {
    if (!client?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [detailsResponse, historyResponse] = await Promise.all([
        apiFetch(`/api/admin/clients/${client.id}`, {
          method: "GET",
          cache: "no-store",
        }),
        apiFetch(`/api/admin/clients/${client.id}/payment-history?limit=20&page=1`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const detailsJson = (await detailsResponse.json()) as ClientDetailsResponse & {
        error?: string;
      };
      const historyJson = (await historyResponse.json()) as PaymentHistoryResponse & {
        error?: string;
      };

      if (!detailsResponse.ok) {
        throw new Error(detailsJson.error ?? "Falha ao carregar detalhes do cliente.");
      }

      if (!historyResponse.ok) {
        throw new Error(historyJson.error ?? "Falha ao carregar historico de pagamentos.");
      }

      setDetails(detailsJson);
      setPayments(historyJson.payments ?? []);
      setMonthlySummary(historyJson.monthly_summary ?? []);
    } catch (requestError: any) {
      setError(requestError?.message ?? "Erro inesperado ao carregar detalhes.");
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    if (!open || !client?.id) {
      return;
    }

    loadClientData();
  }, [open, client?.id, loadClientData]);

  const planAmountLabel = useMemo(() => {
    if (!details?.subscription) return "-";
    return centsToCurrency(
      details.subscription.plan_amount ?? 0,
      details.subscription.plan_currency ?? "BRL"
    );
  }, [details?.subscription]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client?.name ?? "Cliente"}</DialogTitle>
          <DialogDescription>
            Visao consolidada do cliente no billing da plataforma e no Stripe Connect.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="h-52 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Carregando detalhes do cliente...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : !details ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Nenhum dado encontrado para este cliente.
          </div>
        ) : (
          <Tabs defaultValue="dados" className="space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="pagamentos">Historico de pagamentos</TabsTrigger>
              <TabsTrigger value="plano">Plano</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="font-medium">Dados do cliente</h3>
                  <p className="text-sm text-muted-foreground">Empresa: {details.client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Status da conta: {details.client.status || "active"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cliente desde: {formatDateTime(details.client.created_at)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Trial ate: {formatDateTime(details.client.trial_ends_at)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Plano:</span>
                    {renderStatus(details.client.plan_status)}
                  </div>
                  {details.client.notes ? (
                    <p className="text-sm text-muted-foreground">Notas: {details.client.notes}</p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="font-medium">Responsavel (client_admin)</h3>
                  <p className="text-sm text-muted-foreground">
                    Nome: {details.owner?.full_name ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Email: {details.owner?.email ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Telefone: {details.owner?.phone ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ultimo login: {formatDateTime(details.owner?.last_sign_in_at ?? null)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Conta ativa: {details.owner?.is_active ? "Sim" : "Nao"}
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2 md:col-span-2">
                  <h3 className="font-medium">Stripe Connect</h3>
                  {details.stripe_connect ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <p className="text-sm text-muted-foreground">
                        Account ID: {details.stripe_connect.stripe_account_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: {details.stripe_connect.account_status}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Charges enabled: {details.stripe_connect.charges_enabled ? "Sim" : "Nao"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Payouts enabled: {details.stripe_connect.payouts_enabled ? "Sim" : "Nao"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Details submitted: {details.stripe_connect.details_submitted ? "Sim" : "Nao"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Cliente ainda nao iniciou onboarding de Connect.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pagamentos" className="space-y-4">
              <PaymentHistoryChart data={monthlySummary} />

              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fatura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum pagamento registrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDateTime(payment.paid_at || payment.period_end)}</TableCell>
                          <TableCell>{centsToCurrency(payment.amount, payment.currency)}</TableCell>
                          <TableCell>{renderPaymentStatus(payment.status)}</TableCell>
                          <TableCell>
                            {payment.invoice_pdf || payment.invoice_url ? (
                              <Button asChild variant="outline" size="sm">
                                <a
                                  href={payment.invoice_pdf || payment.invoice_url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="plano" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="font-medium">Assinatura da plataforma</h3>
                  {details.subscription ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Plano: {details.subscription.plan_name ?? details.client.plan_name}
                      </p>
                      <p className="text-sm text-muted-foreground">Valor: {planAmountLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        Intervalo: {details.subscription.plan_interval ?? "month"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Stripe customer: {details.subscription.stripe_customer_id ?? "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Stripe subscription: {details.subscription.stripe_subscription_id ?? "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Proxima cobranca: {formatDateTime(details.subscription.current_period_end)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ultimo pagamento: {formatDateTime(details.subscription.last_payment_at)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        {renderStatus(details.subscription.status)}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Cliente sem assinatura da plataforma.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="font-medium">Setup fee</h3>
                  {details.subscription ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Setup pago: {details.subscription.setup_fee_paid ? "Sim" : "Nao"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valor setup:{" "}
                        {details.subscription.setup_fee_amount
                          ? centsToCurrency(
                              details.subscription.setup_fee_amount,
                              details.subscription.plan_currency
                            )
                          : "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pago em: {formatDateTime(details.subscription.setup_fee_paid_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Trial inicio: {formatDateTime(details.subscription.trial_start)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Trial fim: {formatDateTime(details.subscription.trial_end)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cancelar no fim do periodo:{" "}
                        {details.subscription.cancel_at_period_end ? "Sim" : "Nao"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem setup fee registrado para este cliente.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
