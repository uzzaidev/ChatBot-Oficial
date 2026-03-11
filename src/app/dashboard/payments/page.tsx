// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionsList } from "@/components/SubscriptionsList";

interface SubscriptionRow {
  id: string;
  stripe_subscription_id: string;
  status: string;
  stripe_price_id: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

export default function PaymentsDashboardPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/connect/subscriptions", {
        method: "GET",
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao listar assinaturas.");
      }
      setSubscriptions(json.subscriptions ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar assinaturas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const startSubscriptionCheckout = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/connect/subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao iniciar checkout de assinatura.");
      }
      if (!json.url) {
        throw new Error("A API nao retornou URL de checkout.");
      }
      window.location.href = json.url;
    } catch (err: any) {
      setError(err?.message ?? "Erro ao iniciar assinatura.");
      setBusy(false);
    }
  };

  const openBillingPortal = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao abrir billing portal.");
      }
      if (!json.url) {
        throw new Error("A API nao retornou URL do portal.");
      }
      window.location.href = json.url;
    } catch (err: any) {
      setError(err?.message ?? "Erro ao abrir billing portal.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Stripe Connect, produtos, storefront e ciclo de assinaturas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>Conecte e valide sua conta Stripe Connect.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/payments/onboarding">Abrir onboarding</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalogo</CardTitle>
            <CardDescription>Crie produtos na conta conectada e publique no storefront.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/payments/products">Gerenciar produtos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinatura da plataforma</CardTitle>
            <CardDescription>
              Checkout hospedado para assinar seu plano e billing portal para gestao.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={startSubscriptionCheckout} disabled={busy}>
              Assinar plano
            </Button>
            <Button className="w-full" variant="outline" onClick={openBillingPortal} disabled={busy}>
              Abrir billing portal
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando assinaturas...</p>
      ) : (
        <SubscriptionsList subscriptions={subscriptions} />
      )}
    </div>
  );
}

