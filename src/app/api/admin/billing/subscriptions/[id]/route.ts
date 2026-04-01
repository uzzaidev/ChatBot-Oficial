import { toClientPlanStatus } from "@/lib/admin-helpers";
import { requireAdmin } from "@/lib/auth-helpers";
import { getStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
