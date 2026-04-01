import { requireAdmin } from "@/lib/auth-helpers";
import { getRequiredAppBaseUrl, getStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/billing/checkout-session
 * Admin generates a Stripe Checkout link for a client.
 * Body: { clientId, priceId?, coupon? }
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const clientId = typeof body.clientId === "string" ? body.clientId : null;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId é obrigatório" },
        { status: 400 },
      );
    }

    const priceId =
      typeof body.priceId === "string" && body.priceId.startsWith("price_")
        ? body.priceId
        : process.env.STRIPE_PLATFORM_PRICE_ID;

    if (!priceId || priceId.includes("price_...")) {
      return NextResponse.json(
        { error: "STRIPE_PLATFORM_PRICE_ID não configurado" },
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
      existingSub.status !== "canceled"
    ) {
      return NextResponse.json(
        { error: "Cliente já possui assinatura ativa" },
        { status: 409 },
      );
    }

    // Find owner email
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

      // Persist customer id
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

    const sessionParams: Record<string, any> = {
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=canceled`,
      metadata: { client_id: clientId },
      allow_promotion_codes: true,
    };

    // Apply coupon if provided
    if (typeof body.coupon === "string" && body.coupon.trim().length > 0) {
      sessionParams.discounts = [{ coupon: body.coupon.trim() }];
      delete sessionParams.allow_promotion_codes;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update client plan_status to pending_payment
    await supabase
      .from("clients")
      .update({ plan_status: "pending_payment" })
      .eq("id", clientId);

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error("[admin:billing:checkout] POST error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao criar sessão de checkout" },
      { status: 500 },
    );
  }
}
