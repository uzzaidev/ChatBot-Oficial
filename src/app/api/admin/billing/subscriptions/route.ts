import {
  mapStripeSubscriptionStatus,
  toClientPlanStatus,
} from "@/lib/admin-helpers";
import { requireAdmin } from "@/lib/auth-helpers";
import { getStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const unixToIso = (value?: number | null): string | null => {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
};

/**
 * GET /api/admin/billing/subscriptions
 * List all platform subscriptions joined with client info
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const supabase = createServiceClient() as any;

    const { data, error } = await supabase
      .from("platform_client_subscriptions")
      .select(
        `
        *,
        clients:client_id (id, name, slug, status)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ subscriptions: data ?? [] });
  } catch (error: any) {
    console.error("[admin:billing:subs] GET error:", error?.message);
    return NextResponse.json(
      { error: "Erro ao listar assinaturas" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/billing/subscriptions
 * Create a new platform subscription for a client
 * Body: { clientId, priceId?, trialPeriodDays?, coupon? }
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

    const trialPeriodDays =
      Number.isFinite(body.trialPeriodDays) && Number(body.trialPeriodDays) >= 0
        ? Number(body.trialPeriodDays)
        : 7;

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

    // Get existing sub or create customer
    const { data: existingSub } = await supabase
      .from("platform_client_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (existingSub?.stripe_subscription_id) {
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

    let stripeCustomerId = existingSub?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: owner?.email ?? undefined,
        name: client.name,
        metadata: { client_id: clientId, client_slug: client.slug ?? "" },
      });
      stripeCustomerId = customer.id;
    }

    const subParams: Record<string, any> = {
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      metadata: { client_id: clientId },
      expand: ["items.data.price"],
    };

    if (trialPeriodDays > 0) {
      subParams.trial_period_days = trialPeriodDays;
    }

    if (typeof body.coupon === "string" && body.coupon.length > 0) {
      subParams.coupon = body.coupon;
    }

    const subscription = await stripe.subscriptions.create(subParams);

    const periodItem = subscription.items.data[0];
    const subStatus = mapStripeSubscriptionStatus(subscription.status);
    const clientPlanStatus = toClientPlanStatus(subscription.status);

    const price = periodItem?.price;
    const planAmount = price?.unit_amount ?? 24900;
    const planCurrency = price?.currency ?? "brl";
    const planInterval = price?.recurring?.interval ?? "month";

    await supabase.from("platform_client_subscriptions").upsert(
      {
        client_id: clientId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        plan_name: "pro",
        plan_amount: planAmount,
        plan_currency: planCurrency,
        plan_interval: planInterval,
        status: subStatus,
        trial_start: unixToIso(subscription.trial_start),
        trial_end: unixToIso(subscription.trial_end),
        current_period_start: unixToIso(
          periodItem?.current_period_start ?? null,
        ),
        current_period_end: unixToIso(periodItem?.current_period_end ?? null),
      },
      { onConflict: "client_id" },
    );

    await supabase
      .from("clients")
      .update({ plan_name: "pro", plan_status: clientPlanStatus })
      .eq("id", clientId);

    return NextResponse.json({
      subscription_id: subscription.id,
      customer_id: stripeCustomerId,
      status: subStatus,
    });
  } catch (error: any) {
    console.error("[admin:billing:subs] POST error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao criar assinatura" },
      { status: 500 },
    );
  }
}
