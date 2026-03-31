// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { createStorefrontCheckoutSession } from "@/lib/stripe-connect";
import { getRequiredAppBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const productId = typeof body.productId === "string" ? body.productId : null;
    const clientSlug = typeof body.clientSlug === "string" ? body.clientSlug : null;
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
    const contactPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const customerEmail =
      typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";

    if (!productId || !clientSlug) {
      return NextResponse.json(
        { error: "Missing required fields: productId and clientSlug." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient() as any;
    const { data: product } = await supabase
      .from("stripe_products")
      .select("*, clients!inner(slug)")
      .eq("id", productId)
      .eq("clients.slug", clientSlug)
      .eq("active", true)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found for this storefront." },
        { status: 404 }
      );
    }

    if (!product.stripe_price_id) {
      return NextResponse.json(
        {
          error:
            "This product is missing a Stripe price id. Update the product and try again.",
        },
        { status: 400 }
      );
    }

    const appUrl = getRequiredAppBaseUrl();
    const checkoutMetadata: Record<string, string> = {};
    if (cardId) checkoutMetadata.card_id = cardId;
    if (contactPhone) checkoutMetadata.phone = contactPhone;
    if (customerEmail) checkoutMetadata.customer_email = customerEmail;

    const session = await createStorefrontCheckoutSession({
      stripeAccountId: product.stripe_account_id,
      stripePriceId: product.stripe_price_id,
      productId: product.id,
      productType: product.type,
      amount: product.amount,
      successUrl: `${appUrl}/store/${clientSlug}/success`,
      cancelUrl: `${appUrl}/store/${clientSlug}/cancel`,
      metadata: checkoutMetadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
