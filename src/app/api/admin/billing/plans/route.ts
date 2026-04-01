import { requireAdmin } from "@/lib/auth-helpers";
import { getStripeClient } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/billing/plans
 * List active Stripe products with their prices (UzzApp plans only)
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const stripe = getStripeClient();

    const products = await stripe.products.list({
      active: true,
      limit: 20,
      expand: ["data.default_price"],
    });

    // Filter to UzzApp products only (exclude Convoca, etc.)
    const uzzappProducts = products.data.filter(
      (p) =>
        p.metadata?.plan_type?.startsWith("uzzapp") ||
        p.name.toLowerCase().includes("uzzapp"),
    );

    const plans = await Promise.all(
      uzzappProducts.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 10,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          prices: prices.data.map((price) => ({
            id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
            active: price.active,
          })),
        };
      }),
    );

    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error("[admin:billing:plans] GET error:", error?.message);
    return NextResponse.json(
      { error: "Erro ao listar planos" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/billing/plans
 * Create a new Stripe product + price
 * Body: { name, description?, amount (cents), currency?, interval? }
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const amount = Number(body.amount);
    const currency = typeof body.currency === "string" ? body.currency : "brl";
    const interval = body.interval === "year" ? "year" : "month";

    if (!name) {
      return NextResponse.json(
        { error: "Nome do plano é obrigatório" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { error: "Valor mínimo é R$1,00 (100 centavos)" },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();

    const product = await stripe.products.create({
      name,
      description:
        typeof body.description === "string" ? body.description : undefined,
      metadata: {
        plan_type: `uzzapp_${name.toLowerCase().replace(/\s+/g, "_")}`,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency,
      recurring: { interval },
      metadata: {
        plan_type: product.metadata.plan_type,
        trial_days: "7",
      },
    });

    return NextResponse.json({
      product: { id: product.id, name: product.name },
      price: {
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
      },
    });
  } catch (error: any) {
    console.error("[admin:billing:plans] POST error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao criar plano" },
      { status: 500 },
    );
  }
}
