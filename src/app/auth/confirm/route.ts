import { createRouteHandlerClient } from "@/lib/supabase-server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType;
  const base = process.env.NEXT_PUBLIC_URL ?? "https://uzzapp.uzzai.com.br";

  if (!token_hash || !type) {
    return NextResponse.redirect(`${base}/login?error=missing_token`);
  }

  const supabase = await createRouteHandlerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    return NextResponse.redirect(`${base}/login?error=confirm_failed`);
  }

  // Verificar se o usuário é novo (client com status pending_setup)
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();

      if (profile?.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("status")
          .eq("id", profile.client_id)
          .single();

        if (client?.status === "pending_setup") {
          return NextResponse.redirect(
            `${base}/onboarding?client_id=${profile.client_id}&step=ai-config`,
          );
        }
      }
    }
  } catch {
    // Em caso de erro, redirecionar para dashboard normalmente
  }

  return NextResponse.redirect(`${base}/dashboard`);
}
