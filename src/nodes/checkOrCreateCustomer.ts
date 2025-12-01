import { ConversationStatus, CustomerRecord } from "@/lib/types";
import { createServiceRoleClient } from "@/lib/supabase";

export interface CheckOrCreateCustomerInput {
  phone: string;
  name: string;
  clientId: string; // 🔐 Multi-tenant: ID do cliente (obrigatório - não mais opcional)
}

/**
 * Interface para dados do cliente
 */
interface ClienteWhatsAppData {
  telefone: string;
  nome: string;
  status: string;
  created_at?: string;
}

/**
 * Helper function para buscar ou criar cliente na tabela
 *
 * NOTA: Usa tabela clientes_whatsapp (sem espaço) após migration 004
 * Se a migration ainda não foi rodada, a VIEW "Clientes WhatsApp" vai redirecionar
 *
 * 🔧 FIX: Preserva status 'humano' ou 'transferido' existentes
 * O status só deve mudar para 'bot' quando o usuário explicitamente selecionar 'bot'
 * Nunca deve voltar automaticamente para 'bot' quando humano responde
 */
const upsertClienteWhatsApp = async (
  supabase: ReturnType<typeof createServiceRoleClient>,
  phone: string,
  name: string,
  clientId: string, // 🔐 Multi-tenant: ID do cliente (obrigatório após migration 005)
): Promise<{ data: ClienteWhatsAppData | null; error: any }> => {
  // Usa tabela SEM espaço (após migration 004)
  // Precisa do cast explícito porque TypeScript não conhece a tabela ainda
  const supabaseAny = supabase as any;

  // 🔧 FIX: Primeiro, verificar se o cliente já existe
  const { data: existingCustomer, error: selectError } = await supabaseAny
    .from("clientes_whatsapp")
    .select("*")
    .eq("telefone", phone)
    .eq("client_id", clientId)
    .single();

  // Se o cliente já existe
  if (existingCustomer && !selectError) {
    const currentStatus = existingCustomer.status?.toLowerCase() || "";

    // 🔧 FIX: Se status é 'humano' ou 'transferido', preservar e NÃO atualizar
    // O status só deve mudar quando o usuário explicitamente selecionar 'bot'
    if (currentStatus === "humano" || currentStatus === "transferido") {
      // Apenas atualiza o nome se necessário, mas NUNCA muda o status
      if (existingCustomer.nome !== name && name) {
        await supabaseAny
          .from("clientes_whatsapp")
          .update({ nome: name })
          .eq("telefone", phone)
          .eq("client_id", clientId);

        return {
          data: { ...existingCustomer, nome: name },
          error: null,
        };
      }

      // Retorna o cliente existente sem modificar
      return { data: existingCustomer, error: null };
    }

    // Se status é 'bot' ou outro, pode atualizar o nome
    if (existingCustomer.nome !== name && name) {
      const { data: updatedData, error: updateError } = await supabaseAny
        .from("clientes_whatsapp")
        .update({ nome: name })
        .eq("telefone", phone)
        .eq("client_id", clientId)
        .select()
        .single();

      return { data: updatedData || existingCustomer, error: updateError };
    }

    // Retorna o cliente existente
    return { data: existingCustomer, error: null };
  }

  // Cliente não existe, criar novo com status 'bot'
  const result = await supabaseAny
    .from("clientes_whatsapp")
    .insert({
      telefone: phone,
      nome: name,
      status: "bot",
      client_id: clientId, // 🔐 Multi-tenant: Associa customer ao cliente
    })
    .select()
    .single();

  return result;
};

/**
 * VERSÃO OTIMIZADA: Usa Supabase client em vez de pg direto
 *
 * Vantagens:
 * - Connection pooling automático do Supabase (mais rápido)
 * - Funciona perfeitamente em serverless (sem problemas de cold start)
 * - Sem necessidade de gerenciar pool manualmente
 * - Retry automático em caso de falha temporária
 */
export const checkOrCreateCustomer = async (
  input: CheckOrCreateCustomerInput,
): Promise<CustomerRecord> => {
  const startTime = Date.now();

  try {
    const { phone, name, clientId } = input;

    if (!clientId) {
      throw new Error(
        "clientId is required - DEFAULT_CLIENT_ID is no longer used",
      );
    }

    // Cria cliente Supabase com SERVICE ROLE (bypassa RLS - fix VULN-007)
    const supabase = createServiceRoleClient();

    // UPSERT usando helper function (bypass de tipos do TypeScript)

    const { data, error } = await upsertClienteWhatsApp(
      supabase,
      phone,
      name,
      clientId,
    );

    const duration = Date.now() - startTime;

    if (error) {
      console.error(
        `[checkOrCreateCustomer] 💥 Erro do Supabase after ${duration}ms:`,
        error,
      );
      throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
    }

    if (!data) {
      throw new Error("No data returned from upsert");
    }

    return {
      id: String(data.telefone),
      client_id: clientId, // 🔐 Usa clientId recebido (não mais DEFAULT_CLIENT_ID hardcoded)
      phone: String(data.telefone),
      name: data.nome,
      status: data.status as ConversationStatus,
      created_at: data.created_at,
      updated_at: data.created_at,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[checkOrCreateCustomer] 💥💥💥 ERRO CRÍTICO after ${duration}ms 💥💥💥`,
    );
    console.error(
      `[checkOrCreateCustomer] Error type:`,
      error instanceof Error ? error.constructor.name : typeof error,
    );
    console.error(
      `[checkOrCreateCustomer] Error message:`,
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      `[checkOrCreateCustomer] Error stack:`,
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error(`[checkOrCreateCustomer] Input data:`, {
      phone: input.phone,
      name: input.name,
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check or create customer: ${errorMessage}`);
  }
};
