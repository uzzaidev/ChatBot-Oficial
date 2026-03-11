// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import { NextRequest, NextResponse } from "next/server";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { createAccountLink, getStripeAccountForClient } from "@/lib/stripe-connect";
import { getRequiredAppBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const account = await getStripeAccountForClient(clientId);
    if (!account?.stripe_account_id) {
      return NextResponse.json(
        { error: "No connected account found for this client." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const appUrl = getRequiredAppBaseUrl();

    const refreshUrl =
      typeof body.refreshUrl === "string" && body.refreshUrl.length > 0
        ? body.refreshUrl
        : `${appUrl}/dashboard/payments/onboarding?refresh=true`;

    const returnUrl =
      typeof body.returnUrl === "string" && body.returnUrl.length > 0
        ? body.returnUrl
        : `${appUrl}/dashboard/payments/onboarding?accountId=${account.stripe_account_id}`;

    const { url } = await createAccountLink({
      stripeAccountId: account.stripe_account_id,
      refreshUrl,
      returnUrl,
    });

    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to create account onboarding link",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}

