import { centsToCurrency, normalizePlanStatus } from "@/lib/admin-helpers";
import { getCurrentUserRole } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await getCurrentUserRole(request);
  if (guard.ok === false) return guard.response;

  const { clientId, role } = guard.context;

  if (!clientId) {
    return NextResponse.json(
      { error: "Nenhum cliente associado ao usuário" },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceClient() as any;

    const { data: subscription, error: subError } = await supabase
      .from("platform_client_subscriptions")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (subError) throw subError;

    // Fetch grace_period_ends_at from clients table
    const { data: clientRow } = await supabase
      .from("clients")
      .select("grace_period_ends_at, plan_status")
      .eq("id", clientId)
      .maybeSingle();

    const { data: payments, error: payError } = await supabase
      .from("platform_payment_history")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (payError) throw payError;

    const status = normalizePlanStatus(subscription?.status);
    const formattedAmount = subscription
      ? centsToCurrency(subscription.plan_amount, subscription.plan_currency)
      : null;

    return NextResponse.json({
      subscription: subscription
        ? {
            ...subscription,
            status,
            formatted_amount: formattedAmount,
            grace_period_ends_at: clientRow?.grace_period_ends_at ?? null,
          }
        : null,
      payments: payments ?? [],
      role,
    });
  } catch (error: any) {
    console.error("[billing] Error fetching billing data:", error?.message);
    return NextResponse.json(
      { error: "Erro ao buscar dados de faturamento" },
      { status: 500 },
    );
  }
}
