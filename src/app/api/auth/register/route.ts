import { sendConfirmationEmail } from "@/lib/resend";
import { createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 *
 * Registra novo usuário e cria novo cliente (tenant) isolado
 *
 * Flow:
 * 1. Cria novo client na tabela clients com UUID gerado
 * 2. Cria secrets vazios no Vault (serão preenchidos depois)
 * 3. Cria usuário no Supabase Auth com client_id no metadata
 * 4. Trigger handle_new_user() cria automaticamente user_profile
 *
 * Body:
 * {
 *   fullName: string,
 *   email: string,
 *   phone?: string,
 *   companyName: string,
 *   password: string
 * }
 *
 * IMPORTANTE: Cada novo usuário = novo cliente (tenant) isolado
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, companyName, password } = body;

    // Validação
    if (!fullName || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 8 caracteres" },
        { status: 400 },
      );
    }

    // Usar Service Role Key para operações administrativas (criar usuários e vault secrets)
    const supabase = createServiceRoleClient();

    // ========================================
    // 0. Pré-checar se email já existe (evita criar vault/client sem necessidade)
    // ========================================
    const { data: existingProfile } = await (supabase as any)
      .from("user_profiles")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile?.id) {
      // Email encontrado na tabela user_profiles — verificar se o auth user está confirmado
      const { data: existingAuthUser } = await supabase.auth.admin.getUserById(
        existingProfile.id,
      );
      const isConfirmed = !!existingAuthUser?.user?.email_confirmed_at;

      if (isConfirmed) {
        return NextResponse.json(
          {
            error:
              "Este email já está cadastrado. Faça login ou use outro email.",
          },
          { status: 409 },
        );
      } else {
        return NextResponse.json(
          {
            error:
              "Você já tentou criar uma conta com este email mas não confirmou. Reenvie o email de confirmação.",
            unconfirmedExists: true,
            email,
          },
          { status: 409 },
        );
      }
    }

    // ========================================
    // 1. Gerar slug único para o cliente
    // ========================================
    const baseSlug = companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]+/g, "-") // Substitui caracteres especiais por -
      .replace(/^-|-$/g, ""); // Remove - do início e fim

    let slug = baseSlug;
    let slugSuffix = 1;

    // Verificar se slug já existe (loop até encontrar um único)
    while (true) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existingClient) break;
      slug = `${baseSlug}-${slugSuffix++}`;
    }

    // ========================================
    // 2. Criar secrets no Vault (apenas IA — Meta vem via Embedded Signup)
    // ========================================
    // Meta credentials (access_token, verify_token) NÃO são mais criados aqui.
    // Novos clientes se conectam via Embedded Signup que configura tudo automaticamente.
    const [openaiResult, groqResult] = await Promise.all([
      (supabase as any).rpc("create_vault_secret", {
        p_secret: "CONFIGURE_IN_SETTINGS",
        p_name: `${slug}_openai_api_key`,
        p_description: `OpenAI API Key for ${companyName}`,
      }),
      (supabase as any).rpc("create_vault_secret", {
        p_secret: "CONFIGURE_IN_SETTINGS",
        p_name: `${slug}_groq_api_key`,
        p_description: `Groq API Key for ${companyName}`,
      }),
    ]);

    const vaultResults = [
      { name: "openai_api_key", result: openaiResult },
      { name: "groq_api_key", result: groqResult },
    ];
    const vaultFailed = vaultResults.find((r) => r.result.error);
    if (vaultFailed) {
      const vaultError = vaultFailed.result.error;
      console.error(
        `[Register] Erro ao criar secret '${vaultFailed.name}' no Vault:`,
        vaultError,
      );
      return NextResponse.json(
        {
          error: `Erro ao configurar credencial '${vaultFailed.name}': ${
            vaultError?.message ?? "erro desconhecido"
          }`,
        },
        { status: 500 },
      );
    }

    const openaiApiKeySecretData = openaiResult.data;
    const groqApiKeySecretData = groqResult.data;

    // ========================================
    // 3. Criar client na tabela clients
    // ========================================
    const { data: newClient, error: clientError } = await (supabase as any)
      .from("clients")
      .insert({
        name: companyName,
        slug,
        status: "pending_setup", // Requires WhatsApp connection via Embedded Signup
        plan: "free",

        // Meta fields — will be populated by Embedded Signup OAuth callback
        // meta_access_token_secret_id, meta_waba_id, etc. are set during OAuth flow

        // AI provider secrets (placeholders until user configures)
        openai_api_key_secret_id: openaiApiKeySecretData,
        openai_model: "gpt-4o",
        groq_api_key_secret_id: groqApiKeySecretData,
        groq_model: "llama-3.3-70b-versatile",
        system_prompt: `Você é um assistente virtual para ${companyName}. Seja prestativo, educado e profissional.`,
        formatter_prompt: null,
        notification_email: email,
      })
      .select("id")
      .single();

    if (clientError || !newClient) {
      // Rollback: limpar secrets do Vault
      for (const secretId of [openaiApiKeySecretData, groqApiKeySecretData]) {
        if (secretId) {
          try {
            await (supabase as any).rpc("delete_vault_secret", {
              p_id: secretId,
            });
          } catch (_) {}
        }
      }
      console.error("[Register] Erro ao criar cliente:", clientError);
      return NextResponse.json(
        {
          error: `Erro ao criar registro de cliente: ${
            clientError?.message ?? "erro desconhecido"
          }`,
        },
        { status: 500 },
      );
    }

    const clientId = newClient.id;

    // ========================================
    // 4. Criar usuário no Supabase Auth
    // ========================================
    const createUserPayload = {
      email,
      password: `[${password?.length} chars]`,
      email_confirm: false,
      user_metadata: {
        client_id: clientId,
        full_name: fullName,
      },
    };
    console.log(
      "[Register] createUser payload:",
      JSON.stringify(createUserPayload, null, 2),
    );
    console.log(
      "[Register] email type:",
      typeof email,
      "| value repr:",
      JSON.stringify(email),
    );
    console.log("[Register] password length:", password?.length);
    console.log("[Register] clientId:", clientId);
    console.log("[Register] fullName:", fullName);

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          client_id: clientId,
          full_name: fullName,
        },
      });

    console.log("[Register] createUser result:", {
      userId: authData?.user?.id ?? null,
      userEmail: authData?.user?.email ?? null,
      errorMessage: authError?.message ?? null,
      errorCode: authError?.code ?? null,
      errorStatus: authError?.status ?? null,
    });

    if (authError || !authData.user) {
      // Rollback: deletar client e secrets do Vault criados
      await (supabase as any).from("clients").delete().eq("id", clientId);
      // Limpar secrets do Vault (best-effort)
      for (const secretId of [openaiApiKeySecretData, groqApiKeySecretData]) {
        if (secretId) {
          try {
            await (supabase as any).rpc("delete_vault_secret", {
              p_id: secretId,
            });
          } catch (_) {
            /* best-effort, ignorar erro de limpeza */
          }
        }
      }

      // Apenas tratar como email duplicado quando o Supabase confirma explicitamente
      const isEmailTaken =
        authError?.message?.includes("User already registered") ||
        authError?.message?.includes("already been registered") ||
        authError?.code === "email_exists";

      if (isEmailTaken) {
        // Verificar se é usuário não-confirmado (conta incompleta) ou conta ativa
        const { data: orphanCheck } = await (supabase as any)
          .from("user_profiles")
          .select("id")
          .eq("email", email.toLowerCase().trim())
          .maybeSingle();

        if (orphanCheck?.id) {
          const { data: orphanAuthUser } =
            await supabase.auth.admin.getUserById(orphanCheck.id);
          const isConfirmed = !!orphanAuthUser?.user?.email_confirmed_at;
          if (!isConfirmed) {
            return NextResponse.json(
              {
                error:
                  "Você já tentou criar uma conta com este email mas não confirmou. Reenvie o email de confirmação.",
                unconfirmedExists: true,
                email,
              },
              { status: 409 },
            );
          }
        } else {
          // Auth user existe mas sem perfil (caso raro de rollback falho anterior)
          // Trata como não-confirmado para o usuário conseguir tentar novamente
          return NextResponse.json(
            {
              error:
                "Você já tentou criar uma conta com este email mas não confirmou. Reenvie o email de confirmação.",
              unconfirmedExists: true,
              email,
            },
            { status: 409 },
          );
        }

        return NextResponse.json(
          {
            error:
              "Este email já está cadastrado. Faça login ou use outro email.",
          },
          { status: 409 },
        );
      }

      console.error("[Register] Erro ao criar usuário:", authError);
      return NextResponse.json(
        {
          error: `Erro ao criar usuário: ${
            authError?.message ?? "erro desconhecido"
          } (code: ${authError?.code ?? "unknown"})`,
        },
        { status: 500 },
      );
    }

    // ========================================
    // 5. Garantir user_profile (trigger já pode ter criado)
    // ========================================
    // O trigger on_auth_user_created pode já ter criado o perfil.
    // Usamos upsert para ser idempontente e garantir os dados corretos.
    const { error: manualProfileError } = await (supabase as any)
      .from("user_profiles")
      .upsert(
        {
          id: authData.user.id,
          client_id: clientId,
          email,
          full_name: fullName,
        },
        { onConflict: "id" },
      );

    if (manualProfileError) {
      // Rollback completo: auth user + client + secrets
      await supabase.auth.admin.deleteUser(authData.user.id);
      await (supabase as any).from("clients").delete().eq("id", clientId);
      for (const secretId of [openaiApiKeySecretData, groqApiKeySecretData]) {
        if (secretId) {
          try {
            await (supabase as any).rpc("delete_vault_secret", {
              p_id: secretId,
            });
          } catch (_) {}
        }
      }
      console.error(
        "[Register] Erro ao criar user_profile:",
        manualProfileError,
      );
      return NextResponse.json(
        {
          error: `Erro ao criar perfil de usuário: ${
            manualProfileError?.message ?? "erro desconhecido"
          }`,
        },
        { status: 500 },
      );
    }

    // ========================================
    // 6. Email de confirmação via Resend
    // ========================================
    const base = process.env.NEXT_PUBLIC_URL ?? "https://uzzapp.uzzai.com.br";

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: { redirectTo: `${base}/auth/confirm` },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[Register] Erro ao gerar link de confirmação:", linkError);
      // Conta foi criada mas email falhou — retornar sucesso parcial
      return NextResponse.json({
        success: true,
        requiresConfirmation: true,
        user_id: authData.user.id,
        client_id: clientId,
        email,
        slug,
        message:
          "Conta criada, mas houve erro ao enviar o email. Use 'Reenviar email' na tela de login.",
        emailSent: false,
      });
    }

    const confirmUrl = `${base}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup`;

    try {
      await sendConfirmationEmail(email, confirmUrl);
    } catch (emailErr) {
      console.error("[Register] Erro Resend:", emailErr);
      return NextResponse.json({
        success: true,
        requiresConfirmation: true,
        user_id: authData.user.id,
        client_id: clientId,
        email,
        slug,
        message:
          "Conta criada, mas houve erro ao enviar o email. Use 'Reenviar email' na tela de login.",
        emailSent: false,
      });
    }

    return NextResponse.json({
      success: true,
      requiresConfirmation: true,
      user_id: authData.user.id,
      client_id: clientId,
      email,
      slug,
      message: "Conta criada! Verifique seu email para ativar a conta.",
      emailSent: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "erro desconhecido";
    console.error("[Register] Erro inesperado:", error);
    return NextResponse.json(
      { error: `Erro interno ao criar conta: ${msg}` },
      { status: 500 },
    );
  }
}
