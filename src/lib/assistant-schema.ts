/**
 * WhatsApp Assistant — Database Schema Context
 *
 * This module provides the full schema description of the relevant tables
 * that the AI assistant can query. It is injected into the system prompt
 * so the model knows exactly where data lives and how to query it safely.
 *
 * CRITICAL RULE injected everywhere: every SELECT must filter by client_id.
 */

/** Tables the assistant may query (SELECT only — no writes ever). */
export const ASSISTANT_READ_TABLES = [
  "clientes_whatsapp",
  "conversations",
  "messages",
  "n8n_chat_histories",
  "usage_logs",
] as const;

/**
 * Detailed schema descriptions injected into the system prompt.
 * Each entry includes: columns + types, gotchas, relationships, examples.
 */
export const ASSISTANT_TABLE_DESCRIPTIONS: Record<string, string> = {
  clientes_whatsapp: `
Contatos/clientes do WhatsApp cadastrados para este tenant.
Colunas:
  - telefone  NUMERIC NOT NULL (PK) — número do WhatsApp sem formatação. ⚠️ Para usar em JOIN ou comparação de texto use telefone::TEXT
  - nome      TEXT — nome do cliente (pode ser null)
  - status    TEXT — estado atual no bot: 'bot' (respondendo automaticamente) | 'humano' (atendimento humano ativo) | 'transferido' (aguardando humano)
  - created_at TIMESTAMPTZ — quando o contato foi criado
  - client_id  UUID NOT NULL — ⚠️ SEMPRE filtrar por client_id = '<uuid>'
Relacionamentos:
  - telefone::TEXT = conversations.phone
  - telefone::TEXT = messages.phone
  - telefone::TEXT = n8n_chat_histories.session_id
Exemplos úteis:
  -- Total de clientes por status
  SELECT status, COUNT(*) FROM clientes_whatsapp WHERE client_id = '<uuid>' GROUP BY status
  -- Clientes que nunca tiveram mensagem de entrada
  SELECT cw.nome, cw.telefone::TEXT FROM clientes_whatsapp cw
  WHERE cw.client_id = '<uuid>' AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.phone = cw.telefone::TEXT AND m.client_id = '<uuid>'
  )`.trim(),

  conversations: `
Conversas (threads) do WhatsApp. Cada conversa agrupa todas as mensagens de um telefone.
Colunas:
  - id          UUID PK
  - client_id   UUID NOT NULL — ⚠️ SEMPRE filtrar por client_id = '<uuid>'
  - phone       TEXT NOT NULL — número do WhatsApp (igual a clientes_whatsapp.telefone::TEXT)
  - name        TEXT — nome do contato (pode ser null)
  - status      TEXT — 'bot' | 'humano' | 'transferido'
  - assigned_to TEXT — usuário responsável (pode ser null)
  - last_message TEXT — última mensagem (preview)
  - last_update  TIMESTAMPTZ — timestamp da última mensagem recebida/enviada ⚠️ se o mesmo cliente mandar mensagem hoje E ontem, last_update será hoje — use a tabela 'messages' para contar atividade em dias específicos
  - created_at   TIMESTAMPTZ
  - last_read_at TIMESTAMPTZ — quando o usuário viu a conversa pela última vez (null = nunca lido)
Exemplos úteis:
  -- Conversas com mensagens não lidas
  SELECT phone, name, last_message FROM conversations
  WHERE client_id = '<uuid>' AND (last_read_at IS NULL OR last_read_at < last_update)
  -- ⚠️ Para contar conversas com atividade ontem use a tabela messages:
  SELECT COUNT(DISTINCT phone) FROM messages
  WHERE client_id = '<uuid>'
    AND (timestamp AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date - 1`.trim(),

  messages: `
Mensagens individuais trocadas em cada conversa (tabela do novo sistema Next.js).
⚠️ ATENÇÃO: Esta tabela pode estar vazia se os dados ainda não foram migrados.
  → Para histórico de mensagens use preferencialmente 'n8n_chat_histories'.
Colunas:
  - id              UUID PK
  - client_id       UUID NOT NULL — ⚠️ SEMPRE filtrar por client_id = '<uuid>'
  - conversation_id UUID — FK conversations.id
  - phone           TEXT NOT NULL — número do WhatsApp
  - name            TEXT — nome do remetente
  - content         TEXT NOT NULL — conteúdo da mensagem
  - type            TEXT — 'text' | 'audio' | 'image' | 'document' | 'video'
  - direction       TEXT — 'incoming' (cliente → bot) | 'outgoing' (bot → cliente)
  - status          TEXT — 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  - timestamp       TIMESTAMPTZ — quando a mensagem foi enviada/recebida
  - metadata        JSONB — dados extras
Exemplos:
  -- Verificar se há dados
  SELECT COUNT(*) FROM messages WHERE client_id = '<uuid>'
  -- Se COUNT = 0, use n8n_chat_histories para dados históricos`.trim(),

  n8n_chat_histories: `
Histórico completo de mensagens do WhatsApp armazenado pelo n8n.
✅ Esta é a PRINCIPAL tabela para consultas de histórico de mensagens.
⚠️ ATENÇÃO: 'type' NÃO é uma coluna — está DENTRO do JSONB 'message'.
Colunas:
  - id         INTEGER PK
  - session_id VARCHAR(255) NOT NULL — número do telefone do cliente (igual a clientes_whatsapp.telefone::TEXT)
  - message    JSONB NOT NULL — formato: { "type": "human"|"ai", "content": "texto da mensagem" }
  - created_at TIMESTAMPTZ — quando a mensagem foi recebida/enviada ⚠️ use com fuso: (created_at AT TIME ZONE 'America/Sao_Paulo')::date
  - client_id  UUID NOT NULL — ⚠️ SEMPRE filtrar por client_id = '<uuid>'
Como extrair o tipo e conteúdo:
  message->>'type'    → 'human' (mensagem do cliente) ou 'ai' (resposta do bot)
  message->>'content' → texto da mensagem
Exemplos úteis:
  -- ✅ Quantas conversas distintas ontem (use SEMPRE esta query para 'conversas ontem')
  SELECT COUNT(DISTINCT session_id) AS conversas_ontem
  FROM n8n_chat_histories
  WHERE client_id = '<uuid>'
    AND message->>'type' = 'human'
    AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date - 1
  -- Total de mensagens por dia (últimos 7 dias)
  SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date as dia, COUNT(*) as total
  FROM n8n_chat_histories
  WHERE client_id = '<uuid>' AND message->>'type' = 'human'
    AND created_at >= now() - INTERVAL '7 days'
  GROUP BY dia ORDER BY dia DESC
  -- Buscar mensagens por palavra-chave no conteúdo
  SELECT session_id, message->>'content' as texto, created_at
  FROM n8n_chat_histories
  WHERE client_id = '<uuid>' AND message->>'content' ILIKE '%interesse%'
  ORDER BY created_at DESC LIMIT 20
  -- Clientes mais ativos (mais mensagens enviadas)
  SELECT session_id, COUNT(*) as total_mensagens
  FROM n8n_chat_histories
  WHERE client_id = '<uuid>' AND message->>'type' = 'human'
  GROUP BY session_id ORDER BY total_mensagens DESC LIMIT 10
  -- ✅ Lista de clientes de ontem com última mensagem (use DISTINCT ON, NUNCA window fn em FILTER)
  WITH sessoes AS (
    SELECT DISTINCT session_id
    FROM n8n_chat_histories
    WHERE client_id = '<uuid>'
      AND message->>'type' = 'human'
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date - 1
  ),
  ultima AS (
    SELECT DISTINCT ON (h.session_id)
      h.session_id,
      h.message->>'content' AS ultima_msg,
      h.created_at
    FROM n8n_chat_histories h
    JOIN sessoes s ON s.session_id = h.session_id
    WHERE h.client_id = '<uuid>' AND h.message->>'type' = 'human'
    ORDER BY h.session_id, h.created_at DESC
  )
  SELECT
    COALESCE(cw.nome, u.session_id) AS cliente,
    u.session_id AS telefone,
    u.ultima_msg,
    (u.created_at AT TIME ZONE 'America/Sao_Paulo') AS horario
  FROM ultima u
  LEFT JOIN clientes_whatsapp cw
    ON cw.telefone::TEXT = u.session_id AND cw.client_id = '<uuid>'
  ORDER BY u.created_at DESC`.trim(),

  usage_logs: `
Log de uso da API de IA — tokens consumidos e custo estimado por conversa.
Colunas:
  - id                UUID PK
  - client_id         UUID NOT NULL — ⚠️ SEMPRE filtrar por client_id = '<uuid>'
  - conversation_id   UUID — FK conversations.id
  - phone             TEXT NOT NULL — número do WhatsApp
  - source            TEXT — provedor: 'openai' | 'groq'
  - model             TEXT — nome do modelo (ex: 'gpt-4o-mini', 'llama-3.3-70b')
  - prompt_tokens     INTEGER — tokens de entrada
  - completion_tokens INTEGER — tokens de saída
  - total_tokens      INTEGER — total de tokens
  - cost_usd          NUMERIC — custo estimado em USD
  - messages_sent     INTEGER — número de mensagens enviadas ao WhatsApp
  - metadata          JSONB
  - created_at        TIMESTAMPTZ
Exemplos úteis:
  -- Custo total do mês
  SELECT SUM(cost_usd) as custo_usd, SUM(total_tokens) as tokens
  FROM usage_logs
  WHERE client_id = '<uuid>' AND created_at >= date_trunc('month', CURRENT_DATE)
  -- Conversas que mais consumiram tokens
  SELECT phone, SUM(total_tokens) as tokens
  FROM usage_logs WHERE client_id = '<uuid>'
  GROUP BY phone ORDER BY tokens DESC LIMIT 10`.trim(),
};

/**
 * Returns the schema description block with tenant guardrail note.
 * The clientId is used to inject concrete examples.
 */
export function getSchemaDescription(clientId: string): string {
  const tables = Object.entries(ASSISTANT_TABLE_DESCRIPTIONS)
    .map(([table, desc]) => {
      const concreteDesc = desc.replace(/<uuid>/g, clientId);
      return `### ${table}\n${concreteDesc}`;
    })
    .join("\n\n");

  return `
⚠️ REGRA ABSOLUTA DE ISOLAMENTO: Toda consulta SQL deve incluir \`client_id = '${clientId}'\` no WHERE.
Nunca acesse dados de outros tenants. O cliente_id deste tenant é: ${clientId}

${tables}
  `.trim();
}
