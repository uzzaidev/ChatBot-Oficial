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

/** Add N months to a unix-seconds timestamp (month rollover handled by Date). */
const addMonthsUnix = (unixSeconds: number, months: number): number => {
  const d = new Date(unixSeconds * 1000);
  d.setMonth(d.getMonth() + months);
  return Math.floor(d.getTime() / 1000);
};

/**
 * PATCH /api/admin/billing/subscriptions/[id]
 * Give the client extra free month(s) by pushing the next billing date.
 *
 * Implemented as a trial extension: we set `trial_end` to (current period end
 * + N months) with no proration, so no invoice is generated until then and the
 * client effectively gets N more free months. No coupon involved.
 *
 * Body: { action: "extend_free_month", months?: number (default 1, max 12) }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.action !== "extend_free_month") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const months =
      Number.isFinite(body.months) && Number(body.months) > 0
        ? Math.min(12, Math.floor(Number(body.months)))
        : 1;

    const supabase = createServiceClient() as any;

    const { data: sub } = await supabase
      .from("platform_client_subscriptions")
      .select("stripe_subscription_id, client_id")
      .eq("id", id)
      .single();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 },
      );
    }

    const stripe = getStripeClient();

    // Anchor the extension at when the next charge would happen (period end),
    // falling back to the existing trial end or now.
    const current = await stripe.subscriptions.retrieve(
      sub.stripe_subscription_id,
    );
    const item = current.items.data[0] as
      | { current_period_end?: number | null }
      | undefined;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const anchor =
      item?.current_period_end ?? current.trial_end ?? nowSeconds;
    const newTrialEnd = addMonthsUnix(Math.max(anchor, nowSeconds), months);

    const updated = await stripe.subscriptions.update(
      sub.stripe_subscription_id,
      {
        trial_end: newTrialEnd,
        proration_behavior: "none",
      },
    );

    const updatedItem = updated.items.data[0] as
      | {
          current_period_start?: number | null;
          current_period_end?: number | null;
        }
      | undefined;
    const newStatus = mapStripeSubscriptionStatus(updated.status);

    await supabase
      .from("platform_client_subscriptions")
      .update({
        status: newStatus,
        trial_start: unixToIso(updated.trial_start),
        trial_end: unixToIso(updated.trial_end),
        current_period_start: unixToIso(
          updatedItem?.current_period_start ?? null,
        ),
        current_period_end: unixToIso(updatedItem?.current_period_end ?? null),
        cancel_at_period_end: updated.cancel_at_period_end ?? false,
      })
      .eq("id", id);

    await supabase
      .from("clients")
      .update({ plan_status: toClientPlanStatus(updated.status) })
      .eq("id", sub.client_id);

    return NextResponse.json({
      message:
        months === 1
          ? "1 mês grátis adicionado. Próxima cobrança adiada."
          : `${months} meses grátis adicionados. Próxima cobrança adiada.`,
      trial_end: unixToIso(updated.trial_end),
    });
  } catch (error: any) {
    console.error("[admin:billing:subs] PATCH error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao estender período grátis" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/billing/subscriptions/[id]
 * Cancel a platform subscription (at period end by default)
 * Query param: ?immediate=true to cancel immediately
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const immediate = searchParams.get("immediate") === "true";

    const supabase = createServiceClient() as any;

    const { data: sub } = await supabase
      .from("platform_client_subscriptions")
      .select("stripe_subscription_id, client_id")
      .eq("id", id)
      .single();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 },
      );
    }

    const stripe = getStripeClient();

    if (immediate) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } else {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    const newStatus = immediate ? "canceled" : "active";
    const clientStatus = immediate ? "canceled" : toClientPlanStatus("active");

    await supabase
      .from("platform_client_subscriptions")
      .update({
        status: newStatus,
        cancel_at_period_end: !immediate,
        canceled_at: immediate ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (immediate) {
      await supabase
        .from("clients")
        .update({ plan_status: clientStatus })
        .eq("id", sub.client_id);
    }

    return NextResponse.json({
      message: immediate
        ? "Assinatura cancelada imediatamente"
        : "Assinatura será cancelada no final do período",
    });
  } catch (error: any) {
    console.error("[admin:billing:subs] DELETE error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao cancelar assinatura" },
      { status: 500 },
    );
  }
}
