# PADRÕES DE CÓDIGO — ChatBot-Oficial

**Checkpoint:** 2026-04-16

---

## Regras Obrigatórias

1. **NUNCA `pg` em serverless** — usar `createServerClient()` de `@/lib/supabase`
2. **SEMPRE `await` no webhook** — serverless termina após HTTP response; `await processChatbotMessage()` é crítico
3. **SEMPRE `export const dynamic = 'force-dynamic'`** em API routes
4. **SEMPRE filtrar por `client_id`** em todas as queries DB
5. **NUNCA `process.env.OPENAI_API_KEY`** para chamadas AI de clientes — usar `getClientVaultCredentials(clientId)`
6. **SEMPRE migrations** para mudanças de schema — nunca DDL direto

---

## API Route Pattern

```typescript
export const dynamic = 'force-dynamic'  // OBRIGATÓRIO
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()  // service role
    const { data, error } = await supabase.from('table')
      .select('*').eq('client_id', clientId)  // SEMPRE filtrar
    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 })
  }
}
```

## Node Function Pattern

```typescript
export interface MyNodeInput { phone: string; clientId: string }
export const myNode = async (input: MyNodeInput): Promise<string> => {
  const { phone, clientId } = input
  // pure logic, single responsibility
  return result
}
// Registrar em src/flows/chatbotFlow.ts
// Exportar em src/nodes/index.ts
```

## Functional Style
- Apenas `const` (nunca `let`/`var`)
- Arrow functions
- Sem classes
- Dados imutáveis
- Nomes descritivos (self-documenting)
- Zero comentários a não ser que o WHY seja não-óbvio

## shadcn/ui
- **NÃO editar** `src/components/ui/*` diretamente
- Adicionar: `npx shadcn@latest add button`
- Customizações: criar wrapper em `src/components/`

## Strip Tool Calls do Texto

```typescript
const removeToolCalls = (text: string): string =>
  text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, '').trim()
```

## Gotchas Conhecidos

- `clientes_whatsapp.telefone` é NUMERIC → cast `::TEXT` para comparações string
- `n8n_chat_histories.message` é JSONB → filtrar por `message->>'type' = 'ai'`, não `WHERE type = 'ai'`
- Google Calendar OAuth tokens expiram → página de calendar faz refresh no load; se refresh token expirar, cliente reconecta OAuth
- Batching default: 10s (configurável por `bot_configurations`)
- WEBHOOK_BASE_URL deve SEMPRE ser a URL de produção (Meta não alcança localhost)

## Adicionando Novo Node

1. Criar `src/nodes/myNode.ts`
2. Definir interface + implementar função
3. Exportar em `src/nodes/index.ts`
4. Adicionar em `src/flows/chatbotFlow.ts`
5. (opcional) Teste: `src/app/api/test/nodes/my-node/route.ts`

## Adicionando Nova Rota API

1. Criar `src/app/api/my-feature/route.ts`
2. Incluir `export const dynamic = 'force-dynamic'`
3. Usar `createServerClient()` para acesso ao DB
4. SEMPRE filtrar por `client_id`

## Migration Workflow

```bash
supabase migration new add_my_feature
# editar: supabase/migrations/TIMESTAMP_add_my_feature.sql
supabase db push
git add supabase/migrations/ && git commit
```
