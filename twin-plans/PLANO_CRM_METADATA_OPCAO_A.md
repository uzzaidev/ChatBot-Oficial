# Plano – CRM Metadata (Opção A): JSONB em clientes_whatsapp
**Data:** 2026-04-15
**Escopo:** Multi-tenant (afeta todos os clientes da plataforma)
**Objetivo:** Salvar dados coletados pelo bot (CPF, email, como conheceu, indicado_por, objetivo) diretamente no contato, evitando redundância de perguntas em conversas futuras.

---

## Contexto

Atualmente, quando o bot coleta CPF, e-mail, como o prospect conheceu a escola e seu objetivo com o Yōga, essas informações ficam apenas no histórico de chat (`n8n_chat_histories`). Na próxima conversa, o bot não sabe que já coletou esses dados e pede novamente.

A solução é adicionar uma coluna `metadata JSONB` na tabela `clientes_whatsapp` e salvar cada dado coletado ali, persistindo entre conversas.

---

## Arquitetura da Solução

```
Bot coleta dado via chat
    ↓
chatbotFlow.ts detecta dado coletado
    ↓
Chama upsertContactMetadata(phone, clientId, { campo: valor })
    ↓
UPDATE clientes_whatsapp SET metadata = metadata || '{"campo": "valor"}' 
WHERE telefone = phone AND client_id = clientId
    ↓
Na próxima conversa:
getClientConfig() ou checkOrCreateCustomer() retorna metadata
    ↓
generateAIResponse() injeta dados já coletados no contexto do sistema
    ↓
Bot NÃO pergunta o que já sabe
```

---

## Campos a armazenar (por enquanto — Umåna)

```json
{
  "cpf": "123.456.789-00",
  "email": "contato@email.com",
  "como_conheceu": "Instagram",
  "indicado_por": "Maria Silva",
  "objetivo": "Reduzir estresse e ganhar flexibilidade"
}
```

Esses campos são genéricos o suficiente para outros clientes também usarem. Novos campos no futuro são adicionados sem migration — basta salvar a chave nova no JSON.

---

## Checklist de Implementação

### ETAPA 1 — Migration do banco

- [ ] Criar migration: `supabase migration new add_metadata_to_clientes_whatsapp`
- [ ] Conteúdo da migration:

```sql
-- Adiciona coluna metadata JSONB em clientes_whatsapp
ALTER TABLE clientes_whatsapp 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index GIN para buscas dentro do JSON (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp_metadata 
ON clientes_whatsapp USING GIN (metadata);

-- Comentário da coluna
COMMENT ON COLUMN clientes_whatsapp.metadata IS 
'Dados cadastrais coletados pelo bot: cpf, email, como_conheceu, indicado_por, objetivo. Estrutura livre JSONB por cliente.';
```

- [ ] Aplicar: `supabase db push`
- [ ] Verificar no dashboard do Supabase que a coluna foi criada

---

### ETAPA 2 — Função de upsert do metadata

- [ ] Criar ou atualizar `src/nodes/updateContactMetadata.ts`:

```typescript
import { createServerClient } from '@/lib/supabase-server'

export interface ContactMetadataInput {
  phone: string        // telefone do contato (como string — converter para NUMERIC)
  clientId: string
  fields: Record<string, string | boolean | null>
}

/**
 * Atualiza campos de metadata do contato de forma não-destrutiva.
 * Faz merge (||) com o JSON existente — não sobrescreve campos anteriores.
 */
export const updateContactMetadata = async (
  input: ContactMetadataInput
): Promise<void> => {
  const { phone, clientId, fields } = input

  const supabase = createServerClient()
  const supabaseAny = supabase as any

  // Usa operador || do JSONB para merge não-destrutivo
  const { error } = await supabaseAny.rpc('merge_contact_metadata', {
    p_telefone: Number(phone),
    p_client_id: clientId,
    p_metadata: fields,
  })

  if (error) {
    console.error('[updateContactMetadata] Erro:', error.message)
    // Não lança erro — operação não crítica, fluxo continua
  }
}
```

- [ ] Criar RPC no banco para o merge seguro. Adicionar na migration:

```sql
CREATE OR REPLACE FUNCTION merge_contact_metadata(
  p_telefone NUMERIC,
  p_client_id UUID,
  p_metadata JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE clientes_whatsapp
  SET metadata = COALESCE(metadata, '{}') || p_metadata
  WHERE telefone = p_telefone AND client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### ETAPA 3 — Leitura do metadata no início da conversa

- [ ] Em `src/nodes/checkOrCreateCustomer.ts`, incluir `metadata` no SELECT do contato:

```typescript
const { data: customer } = await supabaseAny
  .from('clientes_whatsapp')
  .select('telefone, nome, status, metadata')  // adicionar metadata aqui
  .eq('telefone', Number(phone))
  .eq('client_id', clientId)
  .single()
```

- [ ] Retornar `metadata` no output do node para que o `chatbotFlow.ts` passe adiante

---

### ETAPA 4 — Injetar metadata no contexto da IA

- [ ] Em `src/nodes/generateAIResponse.ts`, adicionar injeção do metadata como mensagem de sistema:

```typescript
// Se o contato já tiver metadata coletado, injetar antes do histórico
if (contactMetadata && Object.keys(contactMetadata).length > 0) {
  const metaLines = []
  if (contactMetadata.email)        metaLines.push(`E-mail: ${contactMetadata.email}`)
  if (contactMetadata.cpf)          metaLines.push(`CPF: ${contactMetadata.cpf}`)
  if (contactMetadata.como_conheceu) metaLines.push(`Como conheceu: ${contactMetadata.como_conheceu}`)
  if (contactMetadata.indicado_por)  metaLines.push(`Indicado por: ${contactMetadata.indicado_por}`)
  if (contactMetadata.objetivo)      metaLines.push(`Objetivo declarado: ${contactMetadata.objetivo}`)

  if (metaLines.length > 0) {
    messages.push({
      role: 'system',
      content: `DADOS JÁ COLETADOS DESTE CONTATO — NÃO pergunte novamente:\n${metaLines.join('\n')}`,
    })
  }
}
```

---

### ETAPA 5 — Salvar dados no momento da coleta (chatbotFlow)

- [ ] Em `chatbotFlow.ts`, após o bot receber resposta do usuário com dado cadastral, identificar e salvar. Estratégia: o bot retorna a resposta normalmente, mas o fluxo detecta padrões de coleta via análise da conversa.

Abordagem recomendada: adicionar uma tool call leve `registrar_dado_cadastral` para que o bot sinalize explicitamente quando coletou um dado:

```typescript
// Tool definition (em generateAIResponse.ts)
const REGISTER_DATA_TOOL = {
  type: 'function',
  function: {
    name: 'registrar_dado_cadastral',
    description: 'Use quando o usuário fornecer um dado cadastral (CPF, email, como conheceu, objetivo). Registra o dado para evitar perguntar de novo.',
    parameters: {
      type: 'object',
      properties: {
        campo: {
          type: 'string',
          enum: ['cpf', 'email', 'como_conheceu', 'indicado_por', 'objetivo'],
        },
        valor: { type: 'string' },
      },
      required: ['campo', 'valor'],
    },
  },
}
```

- [ ] Adicionar `registrar_dado_cadastral` ao array de tools em `generateAIResponse.ts`
- [ ] Em `chatbotFlow.ts`, tratar o tool call `registrar_dado_cadastral`:
  - Chamar `updateContactMetadata({ phone, clientId, fields: { [campo]: valor } })`
  - Continuar o fluxo normalmente (não interrompe a resposta)
  - Não enviar mensagem extra ao usuário

---

### ETAPA 6 — Instrução no prompt do agente

- [ ] Adicionar no system prompt (seção Coleta de Dados Pré-Agendamento):

```
Antes de pedir qualquer dado cadastral, verifique nos dados já coletados deste contato 
(informados no contexto com o prefixo "DADOS JÁ COLETADOS"). Se o campo já estiver 
preenchido, NÃO peça novamente. Use o valor existente diretamente.

Sempre que o usuário fornecer um dado cadastral (CPF, e-mail, como conheceu, objetivo),
use a ferramenta registrar_dado_cadastral para salvar o dado imediatamente.
```

---

### ETAPA 7 — Testes

- [ ] Teste 1: Primeira conversa — bot coleta todos os dados e salva
  - Verificar no Supabase que `metadata` foi preenchido no contato
- [ ] Teste 2: Segunda conversa — bot NÃO pede dados já coletados
  - Verificar que o contexto contém "DADOS JÁ COLETADOS"
- [ ] Teste 3: Dado parcial — só e-mail coletado → bot pede apenas CPF, objetivo e como conheceu
- [ ] Teste 4: Outro cliente (diferente do Umåna) — não quebra nada, metadata fica vazio `{}`
- [ ] Teste 5: Contato existente sem metadata — coluna retorna `{}`, sem erro

---

## Tipos TypeScript (sugestão)

```typescript
// Em src/lib/types.ts — adicionar:
export interface ContactMetadata {
  cpf?: string
  email?: string
  como_conheceu?: string
  indicado_por?: string
  objetivo?: string
  [key: string]: string | boolean | null | undefined  // extensível para outros clientes
}
```

---

## O que NÃO fazer

- Não criar colunas fixas para cada campo (cpf TEXT, email TEXT...) — perde escalabilidade
- Não fazer parse de texto livre para detectar CPF/email — frágil e impreciso
- Não bloquear o fluxo se o save do metadata falhar — operação não crítica
- Não aplicar RLS separada para metadata — já coberto pela RLS de `clientes_whatsapp`

---

## Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `supabase/migrations/TIMESTAMP_add_metadata.sql` | Nova migration |
| `src/nodes/updateContactMetadata.ts` | Novo node (criar) |
| `src/nodes/checkOrCreateCustomer.ts` | Incluir metadata no SELECT |
| `src/nodes/generateAIResponse.ts` | Injetar metadata + nova tool |
| `src/flows/chatbotFlow.ts` | Tratar tool call registrar_dado_cadastral |
| `src/lib/types.ts` | Tipo ContactMetadata |
| Prompt do agente (dashboard) | Instrução sobre dados já coletados |

---

*Gerado em: 2026-04-15*
*Parte do plano maior: twin-plans/PLANO_UMANA_MELHORIAS_2026-04.md*
