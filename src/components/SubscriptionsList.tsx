// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SubscriptionRow {
  id: string;
  stripe_subscription_id: string;
  status: string;
  stripe_price_id: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  customer_email?: string | null;
}

interface SubscriptionsListProps {
  subscriptions: SubscriptionRow[];
}

const getBadgeClassName = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "trialing":
      return "bg-blue-100 text-blue-700";
    case "past_due":
      return "bg-amber-100 text-amber-700";
    case "canceled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export function SubscriptionsList({ subscriptions }: SubscriptionsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinaturas</CardTitle>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma assinatura sincronizada via webhook ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Subscription</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Preco</th>
                  <th className="py-2 pr-4">Periodo atual</th>
                  <th className="py-2 pr-4">Cancelamento</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-mono text-xs">
                      {subscription.stripe_subscription_id}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getBadgeClassName(
                          subscription.status
                        )}`}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {subscription.stripe_price_id}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {subscription.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {subscription.cancel_at_period_end ? "No fim do periodo" : "Sem cancelamento"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

