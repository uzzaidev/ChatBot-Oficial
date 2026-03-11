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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    amount: number;
    currency: string;
    type: "one_time" | "subscription";
    interval?: "month" | "year" | null;
    active: boolean;
  };
  clientSlug?: string;
  showDashboardActions?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
}

const formatMoney = (amountInCents: number, currency: string) => {
  const amount = amountInCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
};

export function ProductCard({
  product,
  clientSlug,
  showDashboardActions = false,
  onEdit,
  onArchive,
}: ProductCardProps) {
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    if (!clientSlug) return;

    setBuying(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          clientSlug,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao criar checkout.");
      }

      if (!json.url) {
        throw new Error("A API nao retornou URL de checkout.");
      }

      window.location.href = json.url;
    } catch (err: any) {
      setError(err?.message ?? "Erro ao iniciar checkout.");
      setBuying(false);
    }
  };

  return (
    <Card className={product.active ? "" : "opacity-70"}>
      <CardHeader>
        <CardTitle className="text-lg">{product.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {product.description || "Sem descricao"}
        </p>
        <p className="text-base font-semibold">
          {formatMoney(product.amount, product.currency)}
          {product.type === "subscription" && (
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {product.interval === "year" ? "ano" : "mes"}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Tipo: {product.type === "subscription" ? "Assinatura" : "Pagamento unico"}
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        {clientSlug && (
          <>
            <Button onClick={startCheckout} disabled={buying || !product.active}>
              {buying ? "Redirecionando..." : "Comprar"}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/store/${clientSlug}/${product.id}`}>Detalhes</Link>
            </Button>
          </>
        )}

        {showDashboardActions && (
          <>
            <Button variant="outline" onClick={onEdit}>
              Editar
            </Button>
            <Button variant="destructive" onClick={onArchive}>
              Arquivar
            </Button>
          </>
        )}
      </CardFooter>

      {error && <p className="px-6 pb-6 text-sm text-red-600">{error}</p>}
    </Card>
  );
}

