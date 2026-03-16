import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-server";

export type AppUserRole = "admin" | "client_admin" | "user";

export interface AuthContext {
  userId: string;
  email: string | null;
  role: AppUserRole;
  clientId: string | null;
  isActive: boolean;
}

export type AuthGuardResult =
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse };

const unauthorized = (message = "Unauthorized") =>
  NextResponse.json({ error: message }, { status: 401 });

const forbidden = (message = "Forbidden") =>
  NextResponse.json({ error: message }, { status: 403 });

const notFound = (message = "User profile not found") =>
  NextResponse.json({ error: message }, { status: 404 });

export const getCurrentUserRole = async (
  request: NextRequest
): Promise<AuthGuardResult> => {
  const supabase = await createRouteHandlerClient(request as any);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, response: unauthorized("Nao autenticado") };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, client_id, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, response: notFound("Perfil de usuario nao encontrado") };
  }

  if (!profile.is_active) {
    return { ok: false, response: forbidden("Conta desativada") };
  }

  return {
    ok: true,
    context: {
      userId: user.id,
      email: user.email ?? null,
      role: (profile.role ?? "user") as AppUserRole,
      clientId: profile.client_id ?? null,
      isActive: Boolean(profile.is_active),
    },
  };
};

export const requireAdmin = async (
  request: NextRequest
): Promise<AuthGuardResult> => {
  const result = await getCurrentUserRole(request);
  if (!result.ok) return result;

  if (result.context.role !== "admin") {
    return {
      ok: false,
      response: forbidden("Acesso admin obrigatorio"),
    };
  }

  return result;
};

export const requireAdminOrClientAdmin = async (
  request: NextRequest
): Promise<AuthGuardResult> => {
  const result = await getCurrentUserRole(request);
  if (!result.ok) return result;

  if (!["admin", "client_admin"].includes(result.context.role)) {
    return {
      ok: false,
      response: forbidden("Apenas admin e client_admin podem acessar"),
    };
  }

  return result;
};

