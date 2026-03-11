import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase-server";
import { normalizePlanStatus } from "@/lib/admin-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminGuard = await requireAdmin(request);
  if (adminGuard.ok === false) {
    return adminGuard.response;
  }

  try {
    const { id: clientId } = await params;
    const supabase = createServiceClient() as any;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, slug, status, created_at, trial_ends_at, plan_name, plan_status, notes")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
    }

    const { data: owner } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, phone, role, is_active")
      .eq("client_id", clientId)
      .eq("role", "client_admin")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: subscription } = await supabase
      .from("platform_client_subscriptions")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    const { data: stripeConnect } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, account_status, charges_enabled, payouts_enabled, details_submitted")
      .eq("client_id", clientId)
      .maybeSingle();

    let lastSignInAt: string | null = null;
    if (owner?.id) {
      const authUserResponse = await supabase.auth.admin.getUserById(owner.id);
      lastSignInAt = authUserResponse.data?.user?.last_sign_in_at ?? null;
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        slug: client.slug,
        status: client.status,
        created_at: client.created_at,
        notes: client.notes,
        trial_ends_at: client.trial_ends_at,
        plan_name: subscription?.plan_name ?? client.plan_name ?? "trial",
        plan_status: normalizePlanStatus(subscription?.status ?? client.plan_status),
      },
      owner: owner
        ? {
            full_name: owner.full_name,
            email: owner.email,
            phone: owner.phone,
            is_active: owner.is_active,
            last_sign_in_at: lastSignInAt,
          }
        : null,
      subscription: subscription
        ? {
            stripe_customer_id: subscription.stripe_customer_id,
            stripe_subscription_id: subscription.stripe_subscription_id,
            stripe_price_id: subscription.stripe_price_id,
            plan_name: subscription.plan_name,
            status: normalizePlanStatus(subscription.status),
            plan_amount: subscription.plan_amount,
            plan_currency: subscription.plan_currency,
            plan_interval: subscription.plan_interval,
            trial_start: subscription.trial_start,
            trial_end: subscription.trial_end,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            setup_fee_paid: subscription.setup_fee_paid,
            setup_fee_amount: subscription.setup_fee_amount,
            setup_fee_paid_at: subscription.setup_fee_paid_at,
            last_payment_at: subscription.last_payment_at,
            last_payment_amount: subscription.last_payment_amount,
            last_payment_status: subscription.last_payment_status,
          }
        : null,
      stripe_connect: stripeConnect
        ? {
            stripe_account_id: stripeConnect.stripe_account_id,
            account_status: stripeConnect.account_status,
            charges_enabled: stripeConnect.charges_enabled,
            payouts_enabled: stripeConnect.payouts_enabled,
            details_submitted: stripeConnect.details_submitted,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro ao buscar detalhes do cliente",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
