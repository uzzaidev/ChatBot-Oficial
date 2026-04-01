import { requireAdmin } from "@/lib/auth-helpers";
import { getStripeClient } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/billing/coupons
 * List all Stripe coupons
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const stripe = getStripeClient();

    const coupons = await stripe.coupons.list({ limit: 50 });

    // Filter to UzzApp coupons only (exclude Convoca, etc.)
    const uzzappCoupons = coupons.data.filter(
      (c) => c.metadata?.app === "uzzapp",
    );

    const formatted = uzzappCoupons.map((c) => ({
      id: c.id,
      name: c.name,
      percent_off: c.percent_off,
      amount_off: c.amount_off,
      currency: c.currency,
      duration: c.duration,
      duration_in_months: c.duration_in_months,
      max_redemptions: c.max_redemptions,
      times_redeemed: c.times_redeemed,
      valid: c.valid,
      created: c.created,
    }));

    return NextResponse.json({ coupons: formatted });
  } catch (error: any) {
    console.error("[admin:billing:coupons] GET error:", error?.message);
    return NextResponse.json(
      { error: "Erro ao listar cupons" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/billing/coupons
 * Create a new Stripe coupon
 * Body: { name, percent_off?, amount_off?, currency?, duration, duration_in_months?, max_redemptions? }
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard.ok === false) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const duration = ["once", "repeating", "forever"].includes(body.duration)
      ? body.duration
      : "once";

    if (!name) {
      return NextResponse.json(
        { error: "Nome do cupom é obrigatório" },
        { status: 400 },
      );
    }

    const hasPercent =
      body.percent_off !== undefined &&
      body.percent_off !== null &&
      Number(body.percent_off) > 0;
    const hasAmount =
      body.amount_off !== undefined &&
      body.amount_off !== null &&
      Number(body.amount_off) > 0;

    if (!hasPercent && !hasAmount) {
      return NextResponse.json(
        { error: "Informe percent_off ou amount_off" },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();

    const params: Record<string, any> = { name, duration };

    if (hasPercent) {
      params.percent_off = Math.min(100, Math.max(1, Number(body.percent_off)));
    } else {
      params.amount_off = Number(body.amount_off);
      params.currency =
        typeof body.currency === "string" ? body.currency : "brl";
    }

    if (duration === "repeating" && Number.isFinite(body.duration_in_months)) {
      params.duration_in_months = Math.max(1, Number(body.duration_in_months));
    }

    if (
      Number.isFinite(body.max_redemptions) &&
      Number(body.max_redemptions) > 0
    ) {
      params.max_redemptions = Number(body.max_redemptions);
    }

    params.metadata = { app: "uzzapp" };

    const coupon = await stripe.coupons.create(params);

    return NextResponse.json({
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        duration: coupon.duration,
        valid: coupon.valid,
      },
    });
  } catch (error: any) {
    console.error("[admin:billing:coupons] POST error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao criar cupom" },
      { status: 500 },
    );
  }
}
