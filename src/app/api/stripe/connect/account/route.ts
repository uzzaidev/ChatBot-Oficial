// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import { NextRequest, NextResponse } from "next/server";
import {
  createRouteHandlerClient,
  createServiceClient,
  getClientIdFromSession,
} from "@/lib/supabase-server";
import {
  createAccountLink,
  createConnectedAccount,
  getAccountStatus,
  getStripeAccountForClient,
} from "@/lib/stripe-connect";
import { getRequiredAppBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const getClientRow = async (clientId: string) => {
  const serviceClient = createServiceClient() as any;
  const { data } = await serviceClient
    .from("clients")
    .select("name, slug")
    .eq("id", clientId)
    .single();

  return data ?? null;
};

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const clientRow = await getClientRow(clientId);
    const account = await getStripeAccountForClient(clientId);
    if (!account) {
      return NextResponse.json({
        account: null,
        clientSlug: clientRow?.slug ?? null,
      });
    }

    const status = await getAccountStatus(account.stripe_account_id);
    return NextResponse.json({
      account: {
        stripeAccountId: account.stripe_account_id,
        clientSlug: clientRow?.slug ?? null,
        ...status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch Stripe account status",
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

    const clientRow = await getClientRow(clientId);
    const existingAccount = await getStripeAccountForClient(clientId);
    if (existingAccount) {
      const status = await getAccountStatus(existingAccount.stripe_account_id);
      return NextResponse.json(
        {
          account: {
            stripeAccountId: existingAccount.stripe_account_id,
            clientSlug: clientRow?.slug ?? null,
            ...status,
          },
          message: "Connected account already exists for this client.",
        },
        { status: 200 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Busca fallback de email/nome a partir da sessao + tabela clients.
    const routeClient = await createRouteHandlerClient(request as any);
    const { data: authData } = await routeClient.auth.getUser();
    const userEmail = authData.user?.email ?? null;

    const resolvedEmail = body.email ?? body.contact_email ?? userEmail;
    const resolvedBusinessName =
      body.businessName ?? body.display_name ?? clientRow?.name;

    if (!resolvedEmail) {
      return NextResponse.json(
        {
          error:
            "Missing email. Send `email` in request body or ensure authenticated user has an email.",
        },
        { status: 400 }
      );
    }

    if (!resolvedBusinessName) {
      return NextResponse.json(
        {
          error:
            "Missing business name. Send `businessName` in request body or configure client name.",
        },
        { status: 400 }
      );
    }

    const { stripeAccountId } = await createConnectedAccount({
      clientId,
      email: resolvedEmail,
      businessName: resolvedBusinessName,
    });

    const appUrl = getRequiredAppBaseUrl();
    const { url } = await createAccountLink({
      stripeAccountId,
      refreshUrl: `${appUrl}/dashboard/payments/onboarding?refresh=true`,
      returnUrl: `${appUrl}/dashboard/payments/onboarding?accountId=${stripeAccountId}`,
    });

    const status = await getAccountStatus(stripeAccountId);

    return NextResponse.json(
      {
        account: {
          stripeAccountId,
          clientSlug: clientRow?.slug ?? null,
          ...status,
        },
        onboardingUrl: url,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to create connected account",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}

