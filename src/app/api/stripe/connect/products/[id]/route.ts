// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import { NextRequest, NextResponse } from "next/server";
import { getClientIdFromSession } from "@/lib/supabase-server";
import {
  archiveProductOnConnectedAccount,
  updateProductOnConnectedAccount,
  type StripeProductInterval,
  type StripeProductType,
} from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

const isValidType = (value: string): value is StripeProductType =>
  value === "one_time" || value === "subscription";

const isValidInterval = (value: string): value is StripeProductInterval =>
  value === "month" || value === "year";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const type = isValidType(body.type) ? body.type : undefined;
    const interval = isValidInterval(body.interval) ? body.interval : undefined;

    if (type === "subscription" && !interval && body.interval !== undefined) {
      return NextResponse.json(
        { error: "Invalid interval. Use `month` or `year` for subscriptions." },
        { status: 400 }
      );
    }

    const updatedProduct = await updateProductOnConnectedAccount({
      clientId,
      productId: id,
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        typeof body.description === "string" ? body.description : body.description === null ? null : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      amountCentavos:
        body.amountCentavos !== undefined && Number.isFinite(body.amountCentavos)
          ? Math.round(body.amountCentavos)
          : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      type,
      interval,
    });

    return NextResponse.json({ product: updatedProduct });
  } catch (error: any) {
    const statusCode =
      typeof error?.message === "string" && error.message.includes("not found")
        ? 404
        : 500;

    return NextResponse.json(
      {
        error: "Failed to update connected product",
        details: error?.message ?? "unknown_error",
      },
      { status: statusCode }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    await archiveProductOnConnectedAccount({ clientId, productId: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const statusCode =
      typeof error?.message === "string" && error.message.includes("not found")
        ? 404
        : 500;

    return NextResponse.json(
      {
        error: "Failed to archive connected product",
        details: error?.message ?? "unknown_error",
      },
      { status: statusCode }
    );
  }
}

