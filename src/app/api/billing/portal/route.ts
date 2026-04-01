import { getCurrentUserRole } from "@/lib/auth-helpers";
import { getRequiredAppBaseUrl, getStripeClient } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    const supabase = createServiceClient() as any;

    const { data: subscription } = await supabase
      .from("platform_client_subscriptions")
      .select("stripe_customer_id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "Nenhuma assinatura encontrada. Entre em contato com o suporte.",
        },
        { status: 404 },
      );
    }

    const stripe = getStripeClient();
    const appUrl = getRequiredAppBaseUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[billing:portal] Error:", error?.message);
    return NextResponse.json(
      { error: "Erro ao criar sessão do portal de faturamento" },
      { status: 500 },
    );
  }
}
