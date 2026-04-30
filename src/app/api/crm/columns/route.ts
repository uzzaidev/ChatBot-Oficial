import { query } from "@/lib/postgres";
import { getClientIdFromSession } from "@/lib/supabase-server";
import type { CRMColumn } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const toBaseSlug = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized || "coluna";
};

const buildUniqueSlug = async (
  clientId: string,
  name: string,
): Promise<string> => {
  const baseSlug = toBaseSlug(name);
  const existingResult = await query<{ slug: string }>(
    `SELECT slug
       FROM crm_columns
      WHERE client_id = $1
        AND slug LIKE $2`,
    [clientId, `${baseSlug}%`],
  );

  const existingSlugs = new Set(existingResult.rows.map((row) => row.slug));
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
};

/**
 * GET /api/crm/columns
 * Fetch all columns for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    // Fetch columns ordered by position
    const result = await query<CRMColumn>(
      `SELECT * FROM crm_columns 
       WHERE client_id = $1 AND is_archived = false
       ORDER BY position ASC`,
      [clientId],
    );

    return NextResponse.json({ columns: result.rows });
  } catch (error) {
    console.error("Error fetching CRM columns:", error);
    return NextResponse.json(
      { error: "Failed to fetch columns" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/crm/columns
 * Create a new column
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 SECURITY: Get client_id from authenticated session
    const clientId = await getClientIdFromSession(request as any);

    if (!clientId) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, color = "default", icon = "users" } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get next position
    const maxPosResult = await query<{ position: number }>(
      `SELECT position FROM crm_columns 
       WHERE client_id = $1 
       ORDER BY position DESC LIMIT 1`,
      [clientId],
    );

    const nextPosition = (maxPosResult.rows[0]?.position ?? -1) + 1;

    // Create unique slug from name to avoid false conflicts (e.g., accents/case)
    const slug = await buildUniqueSlug(clientId, name);

    // Insert column
    const result = await query<CRMColumn>(
      `INSERT INTO crm_columns (client_id, name, slug, color, icon, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clientId, name, slug, color, icon, nextPosition],
    );

    return NextResponse.json({ column: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating CRM column:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma coluna semelhante. Tente outro nome." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 },
    );
  }
}
