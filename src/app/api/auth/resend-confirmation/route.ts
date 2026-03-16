import { sendConfirmationEmail } from "@/lib/resend";
import { createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
    }

    const base = process.env.NEXT_PUBLIC_URL ?? "https://uzzapp.uzzai.com.br";
    const supabase = createServiceRoleClient();

    // Gerar link de confirmação via admin API
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "signup",
        email,
        password: crypto.randomUUID(), // placeholder — generateLink exige mas não altera a senha existente
        options: { redirectTo: `${base}/auth/confirm` },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[Resend-Confirmation] Erro ao gerar link:", linkError);
      return NextResponse.json(
        { error: "Erro ao gerar link de confirmação" },
        { status: 500 },
      );
    }

    const confirmUrl = `${base}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup`;

    await sendConfirmationEmail(email, confirmUrl);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Resend-Confirmation] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
