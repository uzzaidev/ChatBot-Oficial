import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { mapStripeSubscriptionStatus, toClientPlanStatus } from "@/lib/admin-helpers";
import { createServiceClient } from "@/lib/supabase-server";
import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const getRequiredEnv = (name: string, placeholder?: string): string => {
  const value = process.env[name];
  if (!value || (placeholder && value.includes(placeholder))) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const unixToIso = (value?: number | null): string | null => {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
};

const parseSubscriptionInterval = (subscription: any): "month" | "year" => {
  const recurring = subscription?.items?.data?.[0]?.price?.recurring;
  return recurring?.interval === "year" ? "year" : "month";
};

const resolveClientOwnerEmail = async (supabase: any, clientId: string): Promise<string | null> => {
  const { data } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("client_id", clientId)
    .eq("role", "client_admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.email ?? null;
};

export async function POST(request: NextRequest) {
  const adminGuard = await requireAdmin(request);
  if (adminGuard.ok === false) {
    return adminGuard.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const clientId = typeof body.clientId === "string" ? body.clientId : null;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const trialPeriodDays =
      Number.isFinite(body.trialPeriodDays) && Number(body.trialPeriodDays) >= 0
        ? Number(body.trialPeriodDays)
        : 14;

    const stripePriceId = getRequiredEnv("STRIPE_PLATFORM_PRICE_ID", "price_...");
    const setupFeePriceId =
      process.env.STRIPE_PLATFORM_SETUP_FEE_PRICE_ID &&
      !process.env.STRIPE_PLATFORM_SETUP_FEE_PRICE_ID.includes("price_...")
        ? process.env.STRIPE_PLATFORM_SETUP_FEE_PRICE_ID
        : null;

    const stripeClient = getStripeClient();
    const supabase = createServiceClient() as any;

    const { data: client } = await supabase
      .from("clients")
      .select("id, name, slug")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const ownerEmail = (await resolveClientOwnerEmail(supabase, clientId)) ?? body.email ?? null;

    const { data: existingSub } = await supabase
      .from("platform_client_subscriptions")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    let stripeCustomerId: string | null = existingSub?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripeClient.customers.create({
        email: ownerEmail ?? undefined,
        name: client.name,
        metadata: {
          client_id: clientId,
          client_slug: client.slug ?? "",
        },
      });
      stripeCustomerId = customer.id;
    }

    const subscription = await stripeClient.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: stripePriceId }],
      trial_period_days: trialPeriodDays > 0 ? trialPeriodDays : undefined,
      payment_behavior: "default_incomplete",
      metadata: {
        client_id: clientId,
      },
      expand: ["items.data.price"],
    });

    const currentPeriodStart = subscription.items.data[0]?.current_period_start ?? null;
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;
    const subscriptionStatus = mapStripeSubscriptionStatus(subscription.status);
    const clientPlanStatus = toClientPlanStatus(subscription.status);

    const upsertPayload = {
      client_id: clientId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: stripePriceId,
      plan_name: "pro",
      plan_amount: subscription.items.data[0]?.price?.unit_amount ?? 24900,
      plan_currency: subscription.currency ?? "brl",
      plan_interval: parseSubscriptionInterval(subscription),
      status: subscriptionStatus,
      trial_start: unixToIso(subscription.trial_start),
      trial_end: unixToIso(subscription.trial_end),
      current_period_start: unixToIso(currentPeriodStart),
      current_period_end: unixToIso(currentPeriodEnd),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      canceled_at: unixToIso(subscription.canceled_at),
      setup_fee_paid: false,
      setup_fee_amount: setupFeePriceId ? null : null,
      metadata: {
        source: "admin_panel_activation",
        setup_fee_price_id: setupFeePriceId,
      },
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("platform_client_subscriptions")
      .upsert(upsertPayload, { onConflict: "client_id" });

    await supabase
      .from("clients")
      .update({
        plan_name: "pro",
        plan_status: clientPlanStatus,
        trial_ends_at: unixToIso(subscription.trial_end),
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    return NextResponse.json({
      success: true,
      subscription: {
        client_id: clientId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        status: subscriptionStatus,
        trial_end: unixToIso(subscription.trial_end),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to activate platform subscription",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
