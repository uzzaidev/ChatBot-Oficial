"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Subscription {
  id: string;
  client_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_name: string;
  plan_amount: number;
  plan_currency: string;
  plan_interval: string | null;
  status: string;
  formatted_amount: string | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  last_payment_at: string | null;
  last_payment_amount: number | null;
  last_payment_status: string | null;
}

interface Payment {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  invoice_url: string | null;
  invoice_pdf: string | null;
  created_at: string;
}

interface BillingData {
  subscription: Subscription | null;
  payments: Payment[];
  role: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
  }
> = {
  active: {
    label: "Ativo",
    variant: "default",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  trial: {
    label: "Período de Teste",
    variant: "secondary",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  past_due: {
    label: "Pagamento Pendente",
    variant: "destructive",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  canceled: {
    label: "Cancelado",
    variant: "outline",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  suspended: {
    label: "Suspenso",
    variant: "destructive",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  incomplete: {
    label: "Incompleto",
    variant: "outline",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (cents: number, currency = "BRL"): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

const INTERVAL_LABELS: Record<string, string> = {
  month: "mês",
  year: "ano",
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await fetch("/api/billing");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erro ao carregar dados");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao abrir portal");
      }
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const sub = data?.subscription;
  const payments = data?.payments ?? [];
  const statusConfig =
    STATUS_CONFIG[sub?.status ?? ""] ?? STATUS_CONFIG.incomplete;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Faturamento</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie sua assinatura e histórico de pagamentos
        </p>
      </div>

      {/* Past Due Alert */}
      {sub?.status === "past_due" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Seu pagamento está pendente. Atualize seu método de pagamento para
            evitar a suspensão do serviço.
          </AlertDescription>
        </Alert>
      )}

      {/* Canceled but active until period end */}
      {sub?.cancel_at_period_end && sub?.status !== "canceled" && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Sua assinatura será cancelada em{" "}
            <strong>{formatDate(sub.current_period_end)}</strong>. Você pode
            reativá-la a qualquer momento.
          </AlertDescription>
        </Alert>
      )}

      {/* Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {sub
                  ? `Plano ${
                      sub.plan_name.charAt(0).toUpperCase() +
                      sub.plan_name.slice(1)
                    }`
                  : "Sem Plano"}
              </CardTitle>
              <CardDescription>
                {sub
                  ? `${sub.formatted_amount}/${
                      INTERVAL_LABELS[sub.plan_interval ?? "month"] ??
                      sub.plan_interval
                    }`
                  : "Nenhuma assinatura ativa"}
              </CardDescription>
            </div>
            <Badge
              variant={statusConfig.variant}
              className="flex items-center gap-1.5"
            >
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sub && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {sub.status === "trial" && sub.trial_end && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Teste termina em{" "}
                    <strong>{formatDate(sub.trial_end)}</strong>
                  </span>
                </div>
              )}
              {sub.current_period_end && sub.status !== "trial" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Próxima cobrança:{" "}
                    <strong>{formatDate(sub.current_period_end)}</strong>
                  </span>
                </div>
              )}
              {sub.last_payment_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Receipt className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Último pagamento:{" "}
                    <strong>
                      {sub.last_payment_amount
                        ? formatCurrency(
                            sub.last_payment_amount,
                            sub.plan_currency,
                          )
                        : "—"}{" "}
                      em {formatDate(sub.last_payment_at)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {sub?.stripe_customer_id && (
            <Button
              onClick={openPortal}
              disabled={portalLoading}
              className="mt-2"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Gerenciar Assinatura
            </Button>
          )}

          {!sub && (
            <p className="text-sm text-muted-foreground">
              Você ainda não possui uma assinatura. Entre em contato com o
              administrador.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Seus últimos pagamentos e faturas</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Valor</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Período</th>
                    <th className="pb-2 font-medium text-right">Fatura</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p) => (
                    <tr key={p.id} className="text-foreground">
                      <td className="py-2.5">
                        {formatDate(p.paid_at ?? p.created_at)}
                      </td>
                      <td className="py-2.5 font-medium">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={p.status === "paid" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {p.status === "paid" ? "Pago" : p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {formatDate(p.period_start)} —{" "}
                        {formatDate(p.period_end)}
                      </td>
                      <td className="py-2.5 text-right">
                        {p.invoice_pdf ? (
                          <a
                            href={p.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            PDF <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : p.invoice_url ? (
                          <a
                            href={p.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Ver <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
