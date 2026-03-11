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
import { Button } from "@/components/ui/button";
import { StripeOnboardingCard } from "@/components/StripeOnboardingCard";

export default function PaymentsOnboardingPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Onboarding Stripe</h1>
          <p className="text-sm text-muted-foreground">
            Clique em "Onboard to collect payments" para concluir a habilitacao.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/payments">Voltar</Link>
        </Button>
      </div>

      <StripeOnboardingCard />
    </div>
  );
}

