// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, getClientIdFromSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient() as any;
    const { data: subscriptions } = await supabase
      .from("stripe_subscriptions")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false });

    return NextResponse.json({ subscriptions: subscriptions ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to list subscriptions",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}

