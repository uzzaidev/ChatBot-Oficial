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
import {
  createPlatformSubscriptionCheckoutSession,
  getStripeAccountForClient,
} from "@/lib/stripe-connect";
import { getRequiredAppBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const getPlatformPriceId = (): string => {
  const value =
    process.env.STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID ?? process.env.PRICE_ID;

  if (!value || value.includes("price_...")) {
    throw new Error(
      "Missing subscription price id. Set STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID (or PRICE_ID) in env."
    );
  }

  return value;
};

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

    const appUrl = getRequiredAppBaseUrl();
    const body = await request.json().catch(() => ({}));
    const successUrl =
      typeof body.successUrl === "string" && body.successUrl.length > 0
        ? body.successUrl
        : `${appUrl}/dashboard/payments`;
    const cancelUrl =
      typeof body.cancelUrl === "string" && body.cancelUrl.length > 0
        ? body.cancelUrl
        : `${appUrl}/dashboard/payments`;

    const session = await createPlatformSubscriptionCheckoutSession({
      stripeAccountId: account.stripe_account_id,
      priceId: getPlatformPriceId(),
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to create platform subscription checkout session",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}

