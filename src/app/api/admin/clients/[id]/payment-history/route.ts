import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { query } from "@/lib/postgres";
import { buildMonthlySummary } from "@/lib/admin-helpers";

export const dynamic = "force-dynamic";

interface PaymentRow {
  id: string;
  stripe_invoice_id: string;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  invoice_url: string | null;
  invoice_pdf: string | null;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminGuard = await requireAdmin(request);
  if (adminGuard.ok === false) {
    return adminGuard.response;
  }

  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const offset = (page - 1) * limit;

    const paymentsSql = `
      SELECT
        id,
        stripe_invoice_id,
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        period_start,
        period_end,
        paid_at,
        invoice_url,
        invoice_pdf,
        created_at
      FROM public.platform_payment_history
      WHERE client_id = $1
      ORDER BY COALESCE(paid_at, created_at) DESC
      LIMIT $2 OFFSET $3
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM public.platform_payment_history
      WHERE client_id = $1
    `;

    const summarySql = `
      SELECT
        id,
        amount,
        paid_at,
        period_start,
        period_end
      FROM public.platform_payment_history
      WHERE client_id = $1
        AND COALESCE(paid_at, period_end, period_start) >= (DATE_TRUNC('month', NOW()) - INTERVAL '11 months')
    `;

    const [paymentsResult, countResult, summarySource] = await Promise.all([
      query<PaymentRow>(paymentsSql, [clientId, limit, offset]),
      query<{ total: number }>(countSql, [clientId]),
      query<{ id: string; amount: number; paid_at: string | null; period_start: string | null; period_end: string | null }>(
        summarySql,
        [clientId]
      ),
    ]);

    const monthlySummary = buildMonthlySummary(summarySource.rows, 12);

    return NextResponse.json({
      payments: paymentsResult.rows,
      monthly_summary: monthlySummary,
      pagination: {
        page,
        limit,
        total: countResult.rows[0]?.total ?? 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro ao buscar historico de pagamentos",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
