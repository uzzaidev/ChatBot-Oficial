import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/billing/override
 * Grant or revoke free manual access for a client, bypassing Stripe.
 * Body: { clientId, action: 'grant' | 'revoke' }
 *
 * grant → sets plan_status = 'active' in clients + upserts a manual
 *          platform_client_subscriptions row (no Stripe IDs).
 * revoke → marks the override row as 'canceled' and resets plan_status.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const clientId = typeof body.clientId === "string" ? body.clientId : null;
    const action = body.action === "revoke" ? "revoke" : "grant";

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId é obrigatório" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient() as any;

    // Verify client exists
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (clientErr || !client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    if (action === "grant") {
      // Upsert a manual subscription row (no Stripe IDs)
      await supabase.from("platform_client_subscriptions").upsert(
        {
          client_id: clientId,
          plan_name: "manual_override",
          plan_amount: 0,
          plan_currency: "brl",
          plan_interval: null,
          status: "active",
          cancel_at_period_end: false,
          // Explicitly null Stripe fields so a real subscription can be created later
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_price_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" },
      );

      await supabase
        .from("clients")
        .update({ plan_status: "active" })
        .eq("id", clientId);

      return NextResponse.json({
        message: `Acesso liberado manualmente para ${client.name}`,
        clientId,
        action: "grant",
      });
    }

    // revoke — mark as canceled
    await supabase
      .from("platform_client_subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId)
      .is("stripe_subscription_id", null); // only touch manual override rows

    await supabase
      .from("clients")
      .update({ plan_status: "canceled" })
      .eq("id", clientId);

    return NextResponse.json({
      message: `Acesso manual revogado para ${client.name}`,
      clientId,
      action: "revoke",
    });
  } catch (error: any) {
    console.error("[admin:billing:override] POST error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao processar override de acesso" },
      { status: 500 },
    );
  }
}
