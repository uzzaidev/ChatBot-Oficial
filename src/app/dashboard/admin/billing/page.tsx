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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
  Send,
  Tag,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────

interface ClientRow {
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

interface SubscriptionRow {
  id: string;
  client_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan_name: string;
  plan_amount: number;
  plan_currency: string;
  plan_interval: string | null;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  clients: { id: string; name: string; slug: string; status: string } | null;
}

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  prices: {
    id: string;
    unit_amount: number | null;
    currency: string;
    recurring: { interval: string } | null;
  }[];
}

interface CouponRow {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  duration_in_months: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  valid: boolean;
}

type TabKey = "clients" | "subscriptions" | "plans" | "coupons";

// ─── Helpers ──────────────────────────────────────────────────────────

const formatCurrency = (cents: number, currency = "BRL"): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  active: { label: "Ativo", variant: "default" },
  trial: { label: "Trial", variant: "secondary" },
  past_due: { label: "Pendente", variant: "destructive" },
  canceled: { label: "Cancelado", variant: "outline" },
  suspended: { label: "Suspenso", variant: "destructive" },
  pending_payment: { label: "Aguardando Pgto", variant: "outline" },
  incomplete: { label: "Incompleto", variant: "outline" },
};

// ─── Page Component ───────────────────────────────────────────────────

export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("clients");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);

  // Forms
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showNewCoupon, setShowNewCoupon] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Checkout
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [checkoutCoupon, setCheckoutCoupon] = useState<string>("");

  const fetchData = async (tab: TabKey) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "clients") {
        const res = await fetch("/api/admin/clients?limit=100");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setClients(json.clients);
      } else if (tab === "subscriptions") {
        const res = await fetch("/api/admin/billing/subscriptions");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setSubscriptions(json.subscriptions);
      } else if (tab === "plans") {
        const res = await fetch("/api/admin/billing/plans");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPlans(json.plans);
      } else if (tab === "coupons") {
        const res = await fetch("/api/admin/billing/coupons");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setCoupons(json.coupons);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const handleCancelSub = async (subId: string, immediate: boolean) => {
    if (
      !confirm(
        immediate ? "Cancelar IMEDIATAMENTE?" : "Cancelar no final do período?",
      )
    ) {
      return;
    }
    try {
      const url = `/api/admin/billing/subscriptions/${subId}${
        immediate ? "?immediate=true" : ""
      }`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      fetchData("subscriptions");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/admin/billing/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description") || undefined,
          amount: Number(form.get("amount")),
          interval: form.get("interval") || "month",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShowNewPlan(false);
      fetchData("plans");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const percentOff = form.get("percent_off");
      const amountOff = form.get("amount_off");
      const res = await fetch("/api/admin/billing/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          percent_off: percentOff ? Number(percentOff) : undefined,
          amount_off: amountOff ? Number(amountOff) : undefined,
          duration: form.get("duration") || "once",
          duration_in_months: form.get("duration_in_months")
            ? Number(form.get("duration_in_months"))
            : undefined,
          max_redemptions: form.get("max_redemptions")
            ? Number(form.get("max_redemptions"))
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShowNewCoupon(false);
      fetchData("coupons");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCheckout = async (clientId: string) => {
    setCheckoutLoading(clientId);
    setCheckoutUrl(null);
    setCopiedUrl(false);
    try {
      const res = await fetch("/api/admin/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          coupon: checkoutCoupon || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCheckoutUrl(json.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const copyCheckoutUrl = async () => {
    if (!checkoutUrl) return;
    await navigator.clipboard.writeText(checkoutUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "clients",
      label: "Clientes",
      icon: <Users className="h-4 w-4" />,
    },
    {
      key: "subscriptions",
      label: "Assinaturas",
      icon: <CreditCard className="h-4 w-4" />,
    },
    { key: "plans", label: "Planos", icon: <Tag className="h-4 w-4" /> },
    { key: "coupons", label: "Cupons", icon: <Ticket className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Billing Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerenciamento de assinaturas, planos e cupons da plataforma
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ─── Clients Tab ───────────────────────────────────── */}
          {activeTab === "clients" && (
            <div className="space-y-4">
              {/* Checkout URL banner */}
              {checkoutUrl && (
                <Alert>
                  <Send className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-sm font-medium">
                      Link de pagamento gerado!
                    </span>
                    <code className="text-xs bg-muted px-2 py-1 rounded break-all max-w-[400px] truncate">
                      {checkoutUrl}
                    </code>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyCheckoutUrl}
                      >
                        {copiedUrl ? (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 mr-1" />
                        )}
                        {copiedUrl ? "Copiado!" : "Copiar"}
                      </Button>
                      <Button size="sm" asChild>
                        <a
                          href={checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Abrir
                        </a>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Coupon input for checkout */}
              <div className="flex gap-2 items-end">
                <div>
                  <Label
                    htmlFor="checkout-coupon"
                    className="text-xs text-muted-foreground"
                  >
                    Cupom (opcional) — aplicado ao gerar link
                  </Label>
                  <Input
                    id="checkout-coupon"
                    value={checkoutCoupon}
                    onChange={(e) => setCheckoutCoupon(e.target.value)}
                    placeholder="Ex: LANCAMENTO50"
                    className="w-48"
                  />
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Todos os Clientes</CardTitle>
                  <CardDescription>
                    Visão geral de clientes e status Stripe. Use &quot;Cobrar
                    Cliente&quot; para gerar link de pagamento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {clients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum cliente encontrado.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Cliente</th>
                            <th className="pb-2 font-medium">E-mail</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Stripe</th>
                            <th className="pb-2 font-medium">Último Pgto</th>
                            <th className="pb-2 font-medium text-right">
                              Ação
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {clients.map((c) => {
                            const badge = STATUS_BADGE[c.plan_status] ??
                              STATUS_BADGE.incomplete ?? {
                                label: c.plan_status,
                                variant: "outline" as const,
                              };
                            const canCharge =
                              !c.stripe_subscription_id ||
                              c.plan_status === "canceled" ||
                              c.plan_status === "suspended";
                            return (
                              <tr key={c.id}>
                                <td className="py-2.5">
                                  <div className="font-medium">{c.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {c.slug}
                                  </div>
                                </td>
                                <td className="py-2.5 text-muted-foreground">
                                  {c.email ?? "—"}
                                </td>
                                <td className="py-2.5">
                                  <Badge variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
                                </td>
                                <td className="py-2.5">
                                  {c.activated ? (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Stripe
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      Sem Stripe
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-muted-foreground">
                                  {c.last_payment_at ? (
                                    <span>
                                      {formatCurrency(c.last_payment_amount)}{" "}
                                      <span className="text-xs">
                                        em {formatDate(c.last_payment_at)}
                                      </span>
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="py-2.5 text-right">
                                  {canCharge ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleCheckout(c.id)}
                                      disabled={checkoutLoading === c.id}
                                    >
                                      {checkoutLoading === c.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                      ) : (
                                        <Send className="h-3.5 w-3.5 mr-1" />
                                      )}
                                      Cobrar Cliente
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-green-600 font-medium">
                                      Assinatura ativa
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── Subscriptions Tab ─────────────────────────────── */}
          {activeTab === "subscriptions" && (
            <Card>
              <CardHeader>
                <CardTitle>Assinaturas Ativas</CardTitle>
                <CardDescription>
                  Todas as assinaturas de clientes na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhuma assinatura encontrada.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Cliente</th>
                          <th className="pb-2 font-medium">Plano</th>
                          <th className="pb-2 font-medium">Valor</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Período</th>
                          <th className="pb-2 font-medium text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {subscriptions.map((s) => {
                          const badge =
                            STATUS_BADGE[s.status] ?? STATUS_BADGE.active;
                          return (
                            <tr key={s.id}>
                              <td className="py-2.5 font-medium">
                                {s.clients?.name ?? "—"}
                              </td>
                              <td className="py-2.5 capitalize">
                                {s.plan_name}
                              </td>
                              <td className="py-2.5">
                                {formatCurrency(s.plan_amount, s.plan_currency)}
                                /{s.plan_interval === "year" ? "ano" : "mês"}
                              </td>
                              <td className="py-2.5">
                                <Badge variant={badge.variant}>
                                  {badge.label}
                                </Badge>
                                {s.cancel_at_period_end && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    (cancela no fim)
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-muted-foreground">
                                {s.status === "trial"
                                  ? `Trial até ${formatDate(s.trial_end)}`
                                  : `Até ${formatDate(s.current_period_end)}`}
                              </td>
                              <td className="py-2.5 text-right">
                                {s.status !== "canceled" && (
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleCancelSub(s.id, false)
                                      }
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        handleCancelSub(s.id, true)
                                      }
                                    >
                                      Imediato
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── Plans Tab ─────────────────────────────────────── */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Planos Stripe</h3>
                <Button onClick={() => setShowNewPlan(!showNewPlan)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Plano
                </Button>
              </div>

              {showNewPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Criar Plano</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleCreatePlan}
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      <div>
                        <Label htmlFor="plan-name">Nome</Label>
                        <Input
                          id="plan-name"
                          name="name"
                          placeholder="Ex: UzzApp Enterprise"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="plan-desc">Descrição</Label>
                        <Input
                          id="plan-desc"
                          name="description"
                          placeholder="Descrição opcional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="plan-amount">Valor (centavos)</Label>
                        <Input
                          id="plan-amount"
                          name="amount"
                          type="number"
                          min={100}
                          placeholder="24900 = R$249,00"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="plan-interval">Intervalo</Label>
                        <select
                          id="plan-interval"
                          name="interval"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          defaultValue="month"
                        >
                          <option value="month">Mensal</option>
                          <option value="year">Anual</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 flex gap-2">
                        <Button type="submit" disabled={formLoading}>
                          {formLoading && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          Criar Plano
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewPlan(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {plans.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum plano UzzApp encontrado no Stripe.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {plans.map((p) => (
                    <Card key={p.id}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {p.name}
                        </CardTitle>
                        {p.description && (
                          <CardDescription>{p.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {p.prices.map((price) => (
                          <div
                            key={price.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-medium">
                              {formatCurrency(
                                price.unit_amount ?? 0,
                                price.currency,
                              )}
                              /
                              {price.recurring?.interval === "year"
                                ? "ano"
                                : "mês"}
                            </span>
                            <code className="text-xs text-muted-foreground">
                              {price.id}
                            </code>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Coupons Tab ───────────────────────────────────── */}
          {activeTab === "coupons" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Cupons</h3>
                <Button
                  onClick={() => setShowNewCoupon(!showNewCoupon)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Cupom
                </Button>
              </div>

              {showNewCoupon && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Criar Cupom</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleCreateCoupon}
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      <div>
                        <Label htmlFor="coupon-name">Nome</Label>
                        <Input
                          id="coupon-name"
                          name="name"
                          placeholder="Ex: LANCAMENTO50"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="coupon-percent">% Desconto</Label>
                        <Input
                          id="coupon-percent"
                          name="percent_off"
                          type="number"
                          min={1}
                          max={100}
                          placeholder="50 = 50%"
                        />
                      </div>
                      <div>
                        <Label htmlFor="coupon-amount">
                          Valor fixo (centavos)
                        </Label>
                        <Input
                          id="coupon-amount"
                          name="amount_off"
                          type="number"
                          min={100}
                          placeholder="Alternativa ao %"
                        />
                      </div>
                      <div>
                        <Label htmlFor="coupon-duration">Duração</Label>
                        <select
                          id="coupon-duration"
                          name="duration"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          defaultValue="once"
                        >
                          <option value="once">Uma vez</option>
                          <option value="repeating">Repetir (meses)</option>
                          <option value="forever">Para sempre</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="coupon-months">
                          Meses (se repetir)
                        </Label>
                        <Input
                          id="coupon-months"
                          name="duration_in_months"
                          type="number"
                          min={1}
                          placeholder="3"
                        />
                      </div>
                      <div>
                        <Label htmlFor="coupon-max">Máx. usos</Label>
                        <Input
                          id="coupon-max"
                          name="max_redemptions"
                          type="number"
                          min={1}
                          placeholder="Ilimitado se vazio"
                        />
                      </div>
                      <div className="sm:col-span-2 flex gap-2">
                        <Button type="submit" disabled={formLoading}>
                          {formLoading && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          Criar Cupom
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewCoupon(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {coupons.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum cupom encontrado.
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Nome</th>
                        <th className="pb-2 font-medium">Desconto</th>
                        <th className="pb-2 font-medium">Duração</th>
                        <th className="pb-2 font-medium">Usos</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {coupons.map((c) => (
                        <tr key={c.id}>
                          <td className="py-2.5 font-medium">
                            {c.name ?? c.id}
                          </td>
                          <td className="py-2.5">
                            {c.percent_off
                              ? `${c.percent_off}%`
                              : c.amount_off
                              ? formatCurrency(
                                  c.amount_off,
                                  c.currency ?? "brl",
                                )
                              : "—"}
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {c.duration === "once"
                              ? "Uma vez"
                              : c.duration === "forever"
                              ? "Sempre"
                              : `${c.duration_in_months ?? "?"} meses`}
                          </td>
                          <td className="py-2.5">
                            {c.times_redeemed}
                            {c.max_redemptions ? `/${c.max_redemptions}` : ""}
                          </td>
                          <td className="py-2.5">
                            <Badge variant={c.valid ? "default" : "outline"}>
                              {c.valid ? "Ativo" : "Expirado"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
