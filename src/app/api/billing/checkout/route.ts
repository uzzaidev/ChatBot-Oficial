import { getCurrentUserRole } from "@/lib/auth-helpers";
import { getRequiredAppBaseUrl, getStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/checkout
 * Client-facing: creates a Stripe Checkout Session for the current user's client.
 * Body: { promoCode? }
 */
export async function POST(request: NextRequest) {
  const guard = await getCurrentUserRole(request);
  if (guard.ok === false) return guard.response;

  const { clientId } = guard.context;

  if (!clientId) {
    return NextResponse.json(
      { error: "Nenhum cliente associado ao usuário" },
      { status: 400 },
    );
  }

  try {
    const priceId = process.env.STRIPE_PLATFORM_PRICE_ID;
    if (!priceId || priceId.includes("price_...")) {
      return NextResponse.json(
        { error: "Plano não configurado" },
        { status: 500 },
      );
    }

    const stripe = getStripeClient();
    const supabase = createServiceClient() as any;

    // Fetch client
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, slug")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    // Check existing subscription
    const { data: existingSub } = await supabase
      .from("platform_client_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("client_id", clientId)
      .maybeSingle();

    if (
      existingSub?.stripe_subscription_id &&
      existingSub.status !== "canceled" &&
      existingSub.status !== "suspended"
    ) {
      return NextResponse.json(
        { error: "Você já possui uma assinatura ativa" },
        { status: 409 },
      );
    }

    // Owner email
    const { data: owner } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("client_id", clientId)
      .eq("role", "client_admin")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Reuse or create Stripe customer
    let stripeCustomerId = existingSub?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: owner?.email ?? undefined,
        name: client.name,
        metadata: { client_id: clientId, client_slug: client.slug ?? "" },
      });
      stripeCustomerId = customer.id;

      await supabase.from("platform_client_subscriptions").upsert(
        {
          client_id: clientId,
          stripe_customer_id: stripeCustomerId,
          status: "incomplete",
          plan_name: "pro",
          plan_amount: 0,
          plan_currency: "brl",
        },
        { onConflict: "client_id" },
      );
    }

    const appUrl = getRequiredAppBaseUrl();

    const body = await request
      .clone()
      .json()
      .catch(() => ({}));

    // Support custom return URL for onboarding flow
    const returnUrl =
      typeof body.returnUrl === "string" && body.returnUrl.startsWith("/")
        ? body.returnUrl
        : null;

    const successPath = returnUrl
      ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}checkout=success`
      : "/dashboard/billing?checkout=success";
    const cancelPath = returnUrl
      ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}checkout=canceled`
      : "/dashboard/billing?checkout=canceled";

    const sessionParams: Record<string, any> = {
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${successPath}`,
      cancel_url: `${appUrl}${cancelPath}`,
      metadata: { client_id: clientId },
      allow_promotion_codes: true,
    };

    // Apply promo code if provided
    if (
      typeof body.promoCode === "string" &&
      body.promoCode.trim().length > 0
    ) {
      // Promo codes go as allow_promotion_codes=true (user enters on Stripe page)
      // OR as coupon ID if it's a direct coupon
      const code = body.promoCode.trim();
      // Try to look up as promotion code
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code,
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
          delete sessionParams.allow_promotion_codes;
        } else {
          // Fallback: try as coupon id
          sessionParams.discounts = [{ coupon: code }];
          delete sessionParams.allow_promotion_codes;
        }
      } catch {
        // If lookup fails, try as coupon directly
        sessionParams.discounts = [{ coupon: code }];
        delete sessionParams.allow_promotion_codes;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[billing:checkout] POST error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao criar sessão de checkout" },
      { status: 500 },
    );
  }
}
