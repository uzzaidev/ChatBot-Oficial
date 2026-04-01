// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

"use client";

import { SubscriptionsList } from "@/components/SubscriptionsList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          Stripe Connect, produtos e storefront.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
            <CardDescription>
              Conecte e valide sua conta Stripe Connect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/payments/onboarding">
                Abrir onboarding
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalogo</CardTitle>
            <CardDescription>
              Crie produtos na conta conectada e publique no storefront.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/payments/products">
                Gerenciar produtos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          Carregando assinaturas...
        </p>
      ) : (
        <SubscriptionsList subscriptions={subscriptions} />
      )}
    </div>
  );
}
