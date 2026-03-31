// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { getApplicationFeePercent, getStripeClient } from "@/lib/stripe";

export type StripeProductType = "one_time" | "subscription";
export type StripeProductInterval = "month" | "year";

interface StripeAccountRow {
  client_id: string;
  stripe_account_id: string;
}

export interface AccountLiveStatus {
  stripeAccountId: string;
  accountStatus: "pending" | "onboarding" | "active" | "restricted";
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: unknown;
}

const getSupabase = () => createServiceClient() as any;

const getDefaultPriceId = (product: Stripe.Product): string | null => {
  if (!product.default_price) return null;
  return typeof product.default_price === "string"
    ? product.default_price
    : product.default_price.id;
};

const toStripeCurrency = (currency: string) => currency.toLowerCase();

const resolveAccountStatus = (params: {
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
}) => {
  if (params.readyToProcessPayments && params.onboardingComplete) {
    return "active";
  }

  if (!params.onboardingComplete || params.requirementsStatus === "currently_due") {
    return "onboarding";
  }

  return "restricted";
};

const updateConnectedAccountRecord = async (
  stripeAccountId: string,
  liveStatus: AccountLiveStatus
) => {
  const supabase = getSupabase();

  await supabase
    .from("stripe_accounts")
    .update({
      account_status: liveStatus.accountStatus,
      charges_enabled: liveStatus.chargesEnabled,
      payouts_enabled: liveStatus.payoutsEnabled,
      details_submitted: liveStatus.detailsSubmitted,
      requirements: liveStatus.requirements ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", stripeAccountId);
};

const getClientIdByStripeAccountId = async (
  stripeAccountId: string
): Promise<string | null> => {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("stripe_accounts")
    .select("client_id")
    .eq("stripe_account_id", stripeAccountId)
    .single();

  return data?.client_id ?? null;
};

const syncStripeProductsToDatabase = async (
  clientId: string,
  stripeAccountId: string,
  products: Stripe.Product[]
) => {
  const supabase = getSupabase();

  for (const product of products) {
    const defaultPrice =
      typeof product.default_price === "object" && product.default_price
        ? product.default_price
        : null;

    const isSubscription = Boolean(defaultPrice && (defaultPrice as any).recurring);
    const interval =
      isSubscription && (defaultPrice as any).recurring?.interval
        ? (defaultPrice as any).recurring.interval
        : null;

    await supabase.from("stripe_products").upsert(
      {
        client_id: clientId,
        stripe_account_id: stripeAccountId,
        stripe_product_id: product.id,
        stripe_price_id: getDefaultPriceId(product),
        name: product.name,
        description: product.description ?? null,
        type: isSubscription ? "subscription" : "one_time",
        amount: (defaultPrice as any)?.unit_amount ?? 0,
        currency: (defaultPrice as any)?.currency ?? "usd",
        interval,
        active: product.active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_product_id" }
    );
  }
};

export const getStripeAccountForClient = async (
  clientId: string
): Promise<StripeAccountRow | null> => {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("stripe_accounts")
    .select("client_id, stripe_account_id")
    .eq("client_id", clientId)
    .maybeSingle();

  return data ?? null;
};

// Criacao da conta conectada no V2 com o payload solicitado pela Stripe.
export const createConnectedAccount = async (params: {
  clientId: string;
  email: string;
  businessName: string;
}): Promise<{ stripeAccountId: string }> => {
  const stripeClient = getStripeClient();
  const account = await (stripeClient.v2.core.accounts as any).create({
    display_name: params.businessName,
    contact_email: params.email,
    identity: {
      country: "us",
    },
    dashboard: "full",
    defaults: {
      responsibilities: {
        fees_collector: "stripe",
        losses_collector: "stripe",
      },
    },
    configuration: {
      customer: {},
      merchant: {
        capabilities: {
          card_payments: {
            requested: true,
          },
        },
      },
    },
  });

  const supabase = getSupabase();
  await supabase.from("stripe_accounts").upsert(
    {
      client_id: params.clientId,
      stripe_account_id: account.id,
      account_status: "pending",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      requirements: {},
      metadata: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );

  return { stripeAccountId: account.id };
};

export const createAccountLink = async (params: {
  stripeAccountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<{ url: string }> => {
  const stripeClient = getStripeClient();
  const accountLink = await (stripeClient.v2.core.accountLinks as any).create({
    account: params.stripeAccountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant", "customer"],
        refresh_url: params.refreshUrl,
        return_url: params.returnUrl,
      },
    },
  });

  return { url: accountLink.url };
};

export const getAccountStatus = async (
  stripeAccountId: string
): Promise<AccountLiveStatus> => {
  const stripeClient = getStripeClient();
  const account = await (stripeClient.v2.core.accounts as any).retrieve(
    stripeAccountId,
    {
      include: ["configuration.merchant", "requirements"],
    }
  );

  const readyToProcessPayments =
    account?.configuration?.merchant?.capabilities?.card_payments?.status === "active";

  const requirementsStatus =
    account?.requirements?.summary?.minimum_deadline?.status ?? null;

  const onboardingComplete =
    requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

  const accountStatus = resolveAccountStatus({
    readyToProcessPayments,
    onboardingComplete,
    requirementsStatus,
  });

  const liveStatus: AccountLiveStatus = {
    stripeAccountId,
    accountStatus,
    readyToProcessPayments,
    onboardingComplete,
    requirementsStatus,
    chargesEnabled: Boolean(account?.charges_enabled),
    payoutsEnabled: Boolean(account?.payouts_enabled),
    detailsSubmitted: Boolean(account?.details_submitted),
    requirements: account?.requirements ?? {},
  };

  await updateConnectedAccountRecord(stripeAccountId, liveStatus);
  return liveStatus;
};

export const syncAccountFromStripe = async (stripeAccountId: string) =>
  getAccountStatus(stripeAccountId);

export const createProductOnConnectedAccount = async (params: {
  stripeAccountId: string;
  name: string;
  description?: string;
  amountCentavos: number;
  currency: string;
  type: StripeProductType;
  interval?: StripeProductInterval;
}) => {
  const stripeClient = getStripeClient();
  const product = await stripeClient.products.create(
    {
      name: params.name,
      description: params.description,
      default_price_data: {
        unit_amount: params.amountCentavos,
        currency: toStripeCurrency(params.currency),
        ...(params.type === "subscription" && params.interval
          ? { recurring: { interval: params.interval } }
          : {}),
      },
    },
    {
      stripeAccount: params.stripeAccountId,
    }
  );

  const clientId = await getClientIdByStripeAccountId(params.stripeAccountId);
  if (!clientId) {
    throw new Error(
      `No client mapping found for stripe account ${params.stripeAccountId}.`
    );
  }

  await syncStripeProductsToDatabase(clientId, params.stripeAccountId, [product]);
  return product;
};

export const listProductsFromConnectedAccount = async (stripeAccountId: string) => {
  const stripeClient = getStripeClient();
  const products = await stripeClient.products.list(
    {
      limit: 20,
      active: true,
      expand: ["data.default_price"],
    },
    {
      stripeAccount: stripeAccountId,
    }
  );

  const clientId = await getClientIdByStripeAccountId(stripeAccountId);
  if (clientId) {
    await syncStripeProductsToDatabase(clientId, stripeAccountId, products.data);
  }

  return products.data;
};

export const updateProductOnConnectedAccount = async (params: {
  clientId: string;
  productId: string;
  name?: string;
  description?: string | null;
  active?: boolean;
  amountCentavos?: number;
  currency?: string;
  type?: StripeProductType;
  interval?: StripeProductInterval;
}) => {
  const stripeClient = getStripeClient();
  const supabase = getSupabase();
  const { data: localProduct } = await supabase
    .from("stripe_products")
    .select("*")
    .eq("id", params.productId)
    .eq("client_id", params.clientId)
    .single();

  if (!localProduct) {
    throw new Error("Product not found for this client.");
  }

  const stripeAccountId = localProduct.stripe_account_id as string;
  const stripeProductId = localProduct.stripe_product_id as string;

  const updatedProduct = await stripeClient.products.update(
    stripeProductId,
    {
      ...(params.name ? { name: params.name } : {}),
      ...(params.description !== undefined
        ? { description: params.description ?? "" }
        : {}),
      ...(params.active !== undefined ? { active: params.active } : {}),
    },
    {
      stripeAccount: stripeAccountId,
    }
  );

  let nextPriceId = localProduct.stripe_price_id as string | null;
  let nextAmount = localProduct.amount as number;
  let nextCurrency = localProduct.currency as string;
  let nextType = localProduct.type as StripeProductType;
  let nextInterval = localProduct.interval as StripeProductInterval | null;

  const shouldCreateNewPrice =
    params.amountCentavos !== undefined ||
    params.interval !== undefined ||
    params.type !== undefined;

  if (shouldCreateNewPrice) {
    const targetType = params.type ?? nextType;
    const targetCurrency = toStripeCurrency(params.currency ?? nextCurrency);
    const targetAmount = params.amountCentavos ?? nextAmount;
    const targetInterval = params.interval ?? nextInterval ?? undefined;

    const createdPrice = await stripeClient.prices.create(
      {
        product: stripeProductId,
        unit_amount: targetAmount,
        currency: targetCurrency,
        ...(targetType === "subscription" && targetInterval
          ? { recurring: { interval: targetInterval } }
          : {}),
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    await stripeClient.products.update(
      stripeProductId,
      { default_price: createdPrice.id },
      {
        stripeAccount: stripeAccountId,
      }
    );

    nextPriceId = createdPrice.id;
    nextAmount = targetAmount;
    nextCurrency = targetCurrency;
    nextType = targetType;
    nextInterval = targetType === "subscription" ? targetInterval ?? null : null;
  } else {
    if (params.type) nextType = params.type;
    if (params.interval !== undefined) nextInterval = params.interval ?? null;
    if (params.currency) nextCurrency = params.currency;
    if (params.amountCentavos !== undefined) nextAmount = params.amountCentavos;
  }

  await supabase
    .from("stripe_products")
    .update({
      name: updatedProduct.name,
      description: updatedProduct.description ?? null,
      active: updatedProduct.active,
      stripe_price_id: nextPriceId,
      amount: nextAmount,
      currency: nextCurrency,
      type: nextType,
      interval: nextInterval,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.productId)
    .eq("client_id", params.clientId);

  return {
    id: params.productId,
    stripeProductId,
    stripePriceId: nextPriceId,
    name: updatedProduct.name,
    description: updatedProduct.description,
    active: updatedProduct.active,
    type: nextType,
    interval: nextInterval,
    amount: nextAmount,
    currency: nextCurrency,
  };
};

export const archiveProductOnConnectedAccount = async (params: {
  clientId: string;
  productId: string;
}) => {
  const stripeClient = getStripeClient();
  const supabase = getSupabase();
  const { data: localProduct } = await supabase
    .from("stripe_products")
    .select("*")
    .eq("id", params.productId)
    .eq("client_id", params.clientId)
    .single();

  if (!localProduct) {
    throw new Error("Product not found for this client.");
  }

  await stripeClient.products.update(
    localProduct.stripe_product_id,
    { active: false },
    {
      stripeAccount: localProduct.stripe_account_id,
    }
  );

  await supabase
    .from("stripe_products")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.productId)
    .eq("client_id", params.clientId);
};

export const createPlatformSubscriptionCheckoutSession = async (params: {
  stripeAccountId: string;
  successUrl: string;
  cancelUrl: string;
  priceId: string;
}) => {
  const stripeClient = getStripeClient();
  const session = await stripeClient.checkout.sessions.create({
    customer_account: params.stripeAccountId,
    mode: "subscription",
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl,
  } as any);

  return session;
};

export const createBillingPortalSession = async (params: {
  stripeAccountId: string;
  returnUrl: string;
}) => {
  const stripeClient = getStripeClient();
  return stripeClient.billingPortal.sessions.create({
    customer_account: params.stripeAccountId,
    return_url: params.returnUrl,
  } as any);
};

export const createStorefrontCheckoutSession = async (params: {
  stripeAccountId: string;
  stripePriceId: string;
  productId: string;
  productType: StripeProductType;
  amount: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) => {
  const stripeClient = getStripeClient();
  const feePercent = getApplicationFeePercent();
  const feeAmount = Math.floor((params.amount * feePercent) / 100);

  const session = await stripeClient.checkout.sessions.create(
    {
      mode: params.productType === "subscription" ? "subscription" : "payment",
      line_items: [{ price: params.stripePriceId, quantity: 1 }],
      metadata: {
        stripe_price_id: params.stripePriceId,
        local_product_id: params.productId,
        ...(params.metadata || {}),
      },
      payment_intent_data:
        params.productType === "one_time"
          ? {
              application_fee_amount: feeAmount,
            }
          : undefined,
      subscription_data:
        params.productType === "subscription"
          ? {
              application_fee_percent: feePercent,
            }
          : undefined,
      success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl,
    },
    {
      stripeAccount: params.stripeAccountId,
    }
  );

  return session;
};
