import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { query } from "@/lib/postgres";
import { normalizePlanStatus } from "@/lib/admin-helpers";

export const dynamic = "force-dynamic";

interface AdminClientRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plan_name: string | null;
  plan_status: string | null;
  trial_ends_at: string | null;
  owner_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  last_payment_at: string | null;
  last_payment_amount: number | null;
  sub_status: string | null;
  sub_plan_name: string | null;
}

export async function GET(request: NextRequest) {
  const adminGuard = await requireAdmin(request);
  if (adminGuard.ok === false) {
    return adminGuard.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const offset = (page - 1) * limit;

    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    const hasSearch = q.length > 0;
    const hasStatus = status.length > 0 && status !== "all";

    const params: Array<string | number | null> = [];
    let index = 1;

    let whereClause = "WHERE 1=1";

    if (hasSearch) {
      params.push(`%${q}%`);
      whereClause += ` AND (c.name ILIKE $${index} OR COALESCE(owner.owner_email,'') ILIKE $${index})`;
      index += 1;
    }

    if (hasStatus) {
      params.push(status);
      whereClause += ` AND LOWER(COALESCE(ps.status, c.plan_status, 'trial')) = LOWER($${index})`;
      index += 1;
    }

    const baseFrom = `
      FROM public.clients c
      LEFT JOIN public.platform_client_subscriptions ps
        ON ps.client_id = c.id
      LEFT JOIN LATERAL (
        SELECT up.email AS owner_email
        FROM public.user_profiles up
        WHERE up.client_id = c.id
          AND up.role = 'client_admin'
        ORDER BY up.created_at ASC
        LIMIT 1
      ) owner ON TRUE
    `;

    const listSql = `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.status,
        c.created_at,
        c.plan_name,
        c.plan_status,
        c.trial_ends_at,
        owner.owner_email,
        ps.stripe_customer_id,
        ps.stripe_subscription_id,
        ps.last_payment_at,
        ps.last_payment_amount,
        ps.status AS sub_status,
        ps.plan_name AS sub_plan_name
      ${baseFrom}
      ${whereClause}
      ORDER BY COALESCE(ps.last_payment_at, c.created_at) DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      ${baseFrom}
      ${whereClause}
    `;

    const listParams = [...params, limit, offset];

    const [clientsResult, countResult] = await Promise.all([
      query<AdminClientRow>(listSql, listParams),
      query<{ total: number }>(countSql, params),
    ]);

    const clients = clientsResult.rows.map((row) => {
      const resolvedStatus = normalizePlanStatus(
        row.sub_status ?? row.plan_status ?? "trial"
      );

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        created_at: row.created_at,
        email: row.owner_email,
        plan_name: row.sub_plan_name ?? row.plan_name ?? "trial",
        plan_status: resolvedStatus,
        trial_ends_at: row.trial_ends_at,
        stripe_customer_id: row.stripe_customer_id,
        stripe_subscription_id: row.stripe_subscription_id,
        last_payment_at: row.last_payment_at,
        last_payment_amount: row.last_payment_amount ?? 0,
        activated: Boolean(row.stripe_customer_id),
      };
    });

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total: countResult.rows[0]?.total ?? 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro ao buscar clientes admin",
        details: error?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
