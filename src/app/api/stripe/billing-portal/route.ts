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
import { createBillingPortalSession, getStripeAccountForClient } from "@/lib/stripe-connect";
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
        { error: "Connected account not found. Complete onboarding first." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const appUrl = getRequiredAppBaseUrl();
    const returnUrl =
      typeof body.returnUrl === "string" && body.returnUrl.length > 0
        ? body.returnUrl
        : `${appUrl}/dashboard/payments`;

    const session = await createBillingPortalSession({
      stripeAccountId: account.stripe_account_id,
      returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to create billing portal session",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}

