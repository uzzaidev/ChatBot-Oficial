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
    // 0. Verificar se email já existe (antes de qualquer outra operação)
    // ========================================
    // Verificação direto via admin API — sem RPC que pode ter permissão bloqueada
    const { data: listData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const userList = (listData?.users ?? []) as Array<{
      email?: string | null;
    }>;
    const emailAlreadyExists = userList.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    console.log("[Register] email check:", {
      email,
      emailAlreadyExists,
      total: userList.length,
    });
    if (emailAlreadyExists) {
      return NextResponse.json(
        {
          error:
            "Este email já está cadastrado. Faça login ou use outro email.",
        },
        { status: 409 },
      );
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
    // 2. Criar secrets vazios no Vault
    // ========================================
    // NOTA: Secrets são criados vazios e serão preenchidos nas configurações
    // Usando create_vault_secret que trata duplicatas (retorna ID existente se já existir)
    const [metaAccessResult, metaVerifyResult, openaiResult, groqResult] =
      await Promise.all([
        (supabase as any).rpc("create_vault_secret", {
          p_secret: "CONFIGURE_IN_SETTINGS",
          p_name: `${slug}_meta_access_token`,
          p_description: `Meta Access Token for ${companyName}`,
        }),
        (supabase as any).rpc("create_vault_secret", {
          p_secret: "CONFIGURE_IN_SETTINGS",
          p_name: `${slug}_meta_verify_token`,
          p_description: `Meta Verify Token for ${companyName}`,
        }),
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
      { name: "meta_access_token", result: metaAccessResult },
      { name: "meta_verify_token", result: metaVerifyResult },
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

    const metaAccessTokenSecretData = metaAccessResult.data;
    const metaVerifyTokenSecretData = metaVerifyResult.data;
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
        status: "active",
        plan: "free",
        meta_access_token_secret_id: metaAccessTokenSecretData,
        meta_verify_token_secret_id: metaVerifyTokenSecretData,
        meta_phone_number_id: "CONFIGURE_IN_SETTINGS",
        meta_display_phone: phone || null,
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
      for (const secretId of [
        metaAccessTokenSecretData,
        metaVerifyTokenSecretData,
        openaiApiKeySecretData,
        groqApiKeySecretData,
      ]) {
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

    if (authError || !authData.user) {
      // Rollback: deletar client e secrets do Vault criados
      await (supabase as any).from("clients").delete().eq("id", clientId);
      // Limpar secrets do Vault (best-effort)
      for (const secretId of [
        metaAccessTokenSecretData,
        metaVerifyTokenSecretData,
        openaiApiKeySecretData,
        groqApiKeySecretData,
      ]) {
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

      const isEmailTaken =
        authError?.message?.includes("User already registered") ||
        authError?.message?.includes("Database error creating new user") ||
        authError?.message?.includes("already been registered") ||
        authError?.message?.toLowerCase().includes("duplicate") ||
        authError?.message?.toLowerCase().includes("unique");

      if (isEmailTaken) {
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
          }`,
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
      for (const secretId of [
        metaAccessTokenSecretData,
        metaVerifyTokenSecretData,
        openaiApiKeySecretData,
        groqApiKeySecretData,
      ]) {
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
    // 6. Enviar email de confirmação
    // ========================================
    const baseUrl =
      process.env.NEXT_PUBLIC_URL ?? "https://uzzapp.uzzai.com.br";

    // Use anon client to trigger Supabase's built-in confirmation email
    const { createClient: createAnonClient } = await import(
      "@supabase/supabase-js"
    );
    const anonClient = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await anonClient.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${baseUrl}/auth/confirm` },
    });

    return NextResponse.json({
      success: true,
      requiresConfirmation: true,
      user_id: authData.user.id,
      client_id: clientId,
      email,
      slug,
      message: "Conta criada! Verifique seu email para ativar a conta.",
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
