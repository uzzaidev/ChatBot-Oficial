// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import Stripe from "stripe";

const getRequiredEnv = (name: string, placeholder: string, docsUrl: string) => {
  const value = process.env[name];

  // Erro explicito para facilitar setup inicial local/producao.
  if (!value || value.includes(placeholder)) {
    throw new Error(
      `${name} is not configured.\n` +
        `Set ${name} in your environment variables.\n` +
        `Expected value format example: ${placeholder}\n` +
        `Get it at ${docsUrl}`
    );
  }

  return value;
};

let stripeClientInstance: Stripe | null = null;

// Singleton Stripe client para reuso em toda a aplicacao.
// A inicializacao e lazy para nao quebrar build se envs Stripe ainda nao estiverem setadas.
export const getStripeClient = (): Stripe => {
  if (!stripeClientInstance) {
    const stripeSecretKey = getRequiredEnv(
      "STRIPE_SECRET_KEY",
      "sk_live_...",
      "https://dashboard.stripe.com/apikeys"
    );
    stripeClientInstance = new Stripe(stripeSecretKey);
  }

  return stripeClientInstance;
};

export const constructWebhookEvent = (
  rawBody: string,
  signature: string,
  webhookSecret: string
): Stripe.Event =>
  getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);

export const parseConnectEventNotification = (
  rawBody: string,
  signature: string,
  webhookSecret: string
) => {
  const clientAny = getStripeClient() as any;

  // Compatibilidade com mudancas de SDK:
  // - parseThinEvent (antigo)
  // - parseEventNotification (atual)
  if (typeof clientAny.parseThinEvent === "function") {
    return clientAny.parseThinEvent(rawBody, signature, webhookSecret);
  }

  if (typeof clientAny.parseEventNotification === "function") {
    return clientAny.parseEventNotification(rawBody, signature, webhookSecret);
  }

  throw new Error(
    "Stripe SDK does not support connect thin-event parsing in this version."
  );
};

export const getRequiredStripeWebhookSecret = (envName: string) =>
  getRequiredEnv(
    envName,
    "whsec_...",
    "https://dashboard.stripe.com/webhooks"
  );

export const getRequiredAppBaseUrl = (): string =>
  getRequiredEnv(
    "NEXT_PUBLIC_APP_URL",
    "https://example.com",
    "https://vercel.com/docs/projects/environment-variables"
  );

export const getApplicationFeePercent = (): number => {
  const raw = process.env.STRIPE_APPLICATION_FEE_PERCENT ?? "10";
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(
      "STRIPE_APPLICATION_FEE_PERCENT must be a valid number between 0 and 100."
    );
  }

  return parsed;
};
