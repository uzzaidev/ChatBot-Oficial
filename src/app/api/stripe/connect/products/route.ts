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
import {
  createProductOnConnectedAccount,
  getStripeAccountForClient,
  listProductsFromConnectedAccount,
  type StripeProductInterval,
  type StripeProductType,
} from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

const isValidType = (value: string): value is StripeProductType =>
  value === "one_time" || value === "subscription";

const isValidInterval = (value: string): value is StripeProductInterval =>
  value === "month" || value === "year";

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const account = await getStripeAccountForClient(clientId);
    if (!account?.stripe_account_id) {
      return NextResponse.json(
        { error: "No connected account found. Complete onboarding first." },
        { status: 404 }
      );
    }

    // Sempre busca da API Stripe para refletir estado atual (e sincroniza no DB).
    await listProductsFromConnectedAccount(account.stripe_account_id);

    const supabase = createServiceClient() as any;
    const { data: products } = await supabase
      .from("stripe_products")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ products: products ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch products from connected account",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const account = await getStripeAccountForClient(clientId);
    if (!account?.stripe_account_id) {
      return NextResponse.json(
        { error: "No connected account found. Complete onboarding first." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(body.amountCentavos) || body.amountCentavos <= 0) {
      return NextResponse.json(
        { error: "amountCentavos must be a positive integer." },
        { status: 400 }
      );
    }

    const type: StripeProductType = isValidType(body.type) ? body.type : "one_time";
    const interval: StripeProductInterval | undefined = isValidInterval(body.interval)
      ? body.interval
      : undefined;

    if (type === "subscription" && !interval) {
      return NextResponse.json(
        {
          error:
            "Subscription products require `interval` set to `month` or `year`.",
        },
        { status: 400 }
      );
    }

    const product = await createProductOnConnectedAccount({
      stripeAccountId: account.stripe_account_id,
      name: body.name,
      description: typeof body.description === "string" ? body.description : undefined,
      amountCentavos: Math.round(body.amountCentavos),
      currency: typeof body.currency === "string" ? body.currency : "usd",
      type,
      interval,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to create product on connected account",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}

