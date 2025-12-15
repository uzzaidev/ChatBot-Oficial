import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/clients
 * Lista todos os clientes/tenants (apenas para super admin)
 *
 * Query params:
 * - status: filtrar por status (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    console.log("[Admin Clients] Starting request...");

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log(
      "[Admin Clients] User:",
      user?.id,
      "Auth Error:",
      authError?.message,
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 },
      );
    }

    // Buscar perfil do usuário autenticado
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, is_active, client_id")
      .eq("id", user.id)
      .single();

    console.log(
      "[Admin Clients] User Profile:",
      currentUserProfile,
      "Profile Error:",
      profileError?.message,
    );

    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: "Perfil de usuário não encontrado" },
        { status: 404 },
      );
    }

    if (!currentUserProfile.is_active) {
      return NextResponse.json(
        { error: "Usuário inativo" },
        { status: 403 },
      );
    }

    // Apenas super admin pode listar todos os clients
    // Client admin pode ver apenas o próprio client
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    console.log("[Admin Clients] User role:", currentUserProfile.role);
    console.log(
      "[Admin Clients] User client_id:",
      currentUserProfile.client_id,
    );

    let query = (supabase.from("clients") as any)
      .select("id, name, slug, status, created_at")
      .order("name", { ascending: true });

    if (currentUserProfile.role === "admin") {
      console.log("[Admin Clients] Fetching ALL clients (admin mode)");
    } else if (currentUserProfile.role === "client_admin") {
      console.log(
        "[Admin Clients] Filtering by client_id (client_admin mode):",
        currentUserProfile.client_id,
      );
      query = query.eq("id", currentUserProfile.client_id);
    } else {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 },
      );
    }

    // Aplicar filtro de status se fornecido
    if (statusFilter) {
      console.log("[Admin Clients] Filtering by status:", statusFilter);
      query = query.eq("status", statusFilter);
    }

    const { data: clients, error: clientsError } = await query;

    console.log(
      "[Admin Clients] Query result - Clients:",
      clients?.length || 0,
      "Error:",
      clientsError?.message,
    );

    if (clientsError) {
      return NextResponse.json(
        { error: "Erro ao buscar clientes", details: clientsError.message },
        { status: 500 },
      );
    }

    console.log(
      "[Admin Clients] Returning clients:",
      clients?.map((c) => ({ id: c.id, name: c.name })),
    );

    return NextResponse.json({
      clients: clients || [],
      total: clients?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
