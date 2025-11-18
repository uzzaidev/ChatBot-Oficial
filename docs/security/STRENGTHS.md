# Pontos Fortes de Segurança - ChatBot Oficial

**Data:** 2025-11-18
**Versão:** 1.0
**Status:** ✅ DOCUMENTAÇÃO DE BOAS PRÁTICAS

---

## Sumário Executivo

O sistema ChatBot Oficial implementa **múltiplas camadas de segurança** que formam uma base sólida para um sistema SaaS multi-tenant. Este documento destaca as **boas práticas já implementadas** que devem ser mantidas e replicadas em futuras funcionalidades.

**Áreas de Excelência:**
- ✅ Gestão de Secrets via Supabase Vault
- ✅ Autenticação robusta com Supabase Auth
- ✅ Multi-tenancy com isolamento de dados
- ✅ RBAC (Role-Based Access Control)
- ✅ Proteção contra SQL Injection
- ✅ Refresh de tokens automático

---

## 1. Gestão de Secrets e Credenciais

### 1.1 Supabase Vault Integration

**Status:** ✅ EXCELENTE
**Arquivo:** `src/lib/vault.ts`

#### Implementação
- Secrets armazenados criptografados com **AES-256** via Supabase Vault
- Descriptografia apenas quando necessário (lazy loading)
- Nunca armazena secrets em variáveis de ambiente para dados de clientes
- Parallel fetching para performance otimizada

#### Código de Exemplo
```typescript
// ✅ BOM: Descriptografia via RPC functions
export const getSecret = async (
  supabase: SupabaseClient,
  secretName: string,
  clientId?: string
): Promise<string | null> => {
  const { data, error } = await supabase.rpc('get_client_secret', {
    secret_name: secretName,
    p_client_id: clientId || null,
  })

  if (error) {
    console.error('[getSecret] Error:', error)
    return null
  }

  return data
}
```

#### Por Que É Bom
- **Criptografia em repouso:** Secrets nunca armazenados em plaintext
- **Auditável:** Todas as leituras podem ser logadas via RPC
- **Isolamento:** Cada cliente tem seus próprios secrets
- **Fallbacks:** Sistema degrada gracefully se secrets faltam

---

### 1.2 Validação de Secrets Obrigatórios

**Status:** ✅ EXCELENTE
**Arquivo:** `src/lib/config.ts:158-184`

#### Implementação
- Valida secrets críticos antes de iniciar processamento
- Lança erro explícito se configuração incompleta
- Previne execução com credenciais inválidas

#### Código de Exemplo
```typescript
// ✅ BOM: Fail-fast se secrets faltando
if (!finalOpenaiKey || !finalGroqKey || !secrets.metaAccessToken) {
  throw new Error(
    `[getClientConfig] Missing required secrets for client ${clientId}. ` +
    `Please configure in Settings page.`
  )
}
```

#### Por Que É Bom
- **Fail-fast:** Detecta problemas antes de processar mensagens
- **Debugging facilitado:** Erro explícito indica o que falta
- **Previne custos:** Não processa sem configuração completa

---

## 2. Autenticação e Autorização

### 2.1 Middleware de Autenticação Robusto

**Status:** ✅ EXCELENTE
**Arquivo:** `middleware.ts`

#### Implementação
- Verificação de sessão em TODAS as rotas do dashboard
- Refresh automático de tokens antes de verificar auth
- Redirecionamento seguro para `/login` se não autenticado
- Injeção de `client_id` nos headers para isolamento

#### Código de Exemplo
```typescript
// ✅ BOM: Refresh session antes de verificar
const supabase = createMiddlewareClient(request)

const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}
```

#### Por Que É Bom
- **Session management:** Refresh automático previne logout inesperado
- **User experience:** Preserva URL de destino via `redirectTo`
- **Security first:** Bloqueia acesso antes de renderizar qualquer conteúdo

---

### 2.2 RBAC (Role-Based Access Control)

**Status:** ✅ EXCELENTE
**Arquivo:** `middleware.ts:118-156`

#### Implementação
- Verificação de role `admin` e `client_admin` para rotas administrativas
- Validação de status ativo (`is_active`) antes de permitir acesso
- Logs detalhados de tentativas de acesso negado

#### Código de Exemplo
```typescript
// ✅ BOM: Verifica role E status ativo
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role, is_active, client_id')
  .eq('id', user.id)
  .single()

if (!profile || !['admin', 'client_admin'].includes(profile.role) || !profile.is_active) {
  console.warn(`[middleware] ⚠️ Acesso negado para ${user.email}`)
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

#### Por Que É Bom
- **Granularidade:** Diferentes níveis de acesso (admin, client_admin, user)
- **Desativação:** Flag `is_active` permite bloquear usuários sem deletar
- **Auditabilidade:** Logs de tentativas de acesso não autorizado

---

### 2.3 Logout Correto em Casos de Erro

**Status:** ✅ EXCELENTE
**Arquivo:** `middleware.ts:94-103`

#### Implementação
- Se profile inválido ou client_id ausente, faz logout automático
- Previne estados inconsistentes (sessão ativa sem profile)

#### Código de Exemplo
```typescript
// ✅ BOM: Cleanup de sessões inconsistentes
if (!profile || !profile.client_id) {
  console.error('[middleware] ❌ Profile inválido, fazendo logout')
  await supabase.auth.signOut()
  return NextResponse.redirect(loginUrl)
}
```

#### Por Que É Bom
- **Consistência:** Não permite sessões órfãs
- **Security:** Previne bypass via manipulação de dados de profile

---

## 3. Multi-Tenancy e Isolamento de Dados

### 3.1 RLS Policies Implementadas Corretamente

**Status:** ✅ EXCELENTE (para tabelas novas)
**Arquivos:** `supabase/migrations/*.sql`, `docs/tables/tabelas.md`

#### Implementação
Tabelas críticas têm RLS policies que isolam dados por `client_id`:

1. **`user_profiles`**: Isolamento por `client_id`
2. **`pricing_config`**: Políticas SELECT/INSERT/UPDATE/DELETE por `client_id`
3. **`bot_configurations`**: Isolamento por `client_id` + defaults globais

#### Código de Exemplo
```sql
-- ✅ BOM: Isolamento via user_profiles
CREATE POLICY "Users can view own client pricing config"
  ON pricing_config FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own client pricing config"
  ON pricing_config FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

#### Por Que É Bom
- **Isolamento nativo:** PostgreSQL garante separação no nível de banco
- **Bypass prevention:** Mesmo queries diretas respeitam RLS
- **Defaults globais:** `bot_configurations` permite configs compartilhadas via `is_default`

---

### 3.2 Validação de client_id em API Routes

**Status:** ✅ EXCELENTE
**Arquivo:** `src/app/api/conversations/route.ts:12-20`

#### Implementação
- Obtém `client_id` da sessão do usuário (não de query params)
- Retorna 401 se `client_id` ausente
- Usa `client_id` em todas as queries subsequentes

#### Código de Exemplo
```typescript
// ✅ BOM: client_id da sessão, não de input do usuário
const clientId = await getClientIdFromSession()

if (!clientId) {
  return NextResponse.json(
    { error: 'Unauthorized: No client_id found' },
    { status: 401 }
  )
}

// Usa em queries
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('client_id', clientId)
```

#### Por Que É Bom
- **Tenant isolation:** Impossível acessar dados de outro cliente
- **Não confia em input:** `client_id` vem da sessão, não de params/body
- **Fail-safe:** Retorna erro se contexto inválido

---

### 3.3 Webhook URLs Segregadas por Cliente

**Status:** ✅ EXCELENTE
**Arquivo:** `src/app/api/webhook/[clientId]/route.ts`

#### Implementação
- URL única por cliente: `/api/webhook/[clientId]`
- Valida `clientId` antes de processar payload
- Verifica status do cliente (`active`)

#### Código de Exemplo
```typescript
// ✅ BOM: Valida clientId da URL
const { clientId } = params

const { data: client } = await supabase
  .from('clients')
  .select('id, name, webhook_secret, active')
  .eq('id', clientId)
  .single()

if (!client || !client.active) {
  return new NextResponse('Client not found or inactive', { status: 404 })
}
```

#### Por Que É Bom
- **Isolamento físico:** Cada cliente tem URL separada
- **Configuração independente:** Secrets e configs por cliente
- **Desativação:** Flag `active` permite pausar clientes

---

## 4. Proteção Contra SQL Injection

### 4.1 Uso de Prepared Statements

**Status:** ✅ EXCELENTE
**Arquivo:** `src/app/api/conversations/route.ts:32-67`

#### Implementação
- TODAS as queries usam parameterized queries
- Nunca concatena input do usuário em SQL
- Usa `$1`, `$2` para placeholders

#### Código de Exemplo
```typescript
// ✅ BOM: Parameterized query
const sqlQuery = `
  SELECT
    telefone,
    nome,
    status,
    created_at
  FROM clientes_whatsapp
  WHERE client_id = $1
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`

const params = [clientId, limit, offset]
const result = await query(sqlQuery, params)
```

#### Por Que É Bom
- **SQL injection impossible:** PostgreSQL escapa automaticamente
- **Performance:** Prepared statements são cacheadas
- **Legibilidade:** Queries claras e auditáveis

---

### 4.2 Supabase Client Queries

**Status:** ✅ EXCELENTE
**Arquivos:** Múltiplos (API routes)

#### Implementação
- Uso de `supabase.from().select()` (query builder)
- Nunca usa raw SQL para queries dinâmicas
- Type-safe via TypeScript

#### Código de Exemplo
```typescript
// ✅ BOM: Query builder (type-safe)
const { data, error } = await supabase
  .from('user_profiles')
  .select('role, is_active, client_id')
  .eq('id', user.id)
  .single()
```

#### Por Que É Bom
- **Type safety:** TypeScript previne erros de schema
- **SQL injection impossible:** Query builder escapa automaticamente
- **Chainable:** Queries compostas de forma legível

---

## 5. Session Management

### 5.1 Refresh Token Automático

**Status:** ✅ EXCELENTE
**Arquivo:** `middleware.ts:72-75`

#### Implementação
- Chama `getUser()` que refresha session automaticamente
- Previne logout por expiração de access token
- Refresh token de longa duração (7 dias default)

#### Código de Exemplo
```typescript
// ✅ BOM: Refresh implícito antes de verificar
const { data: { user } } = await supabase.auth.getUser()
// Se access token expirado, Supabase refresha automaticamente
```

#### Por Que É Bom
- **User experience:** Não força re-login se refresh token válido
- **Seamless:** Refresh acontece em background
- **Security:** Access tokens de curta duração (1 hora)

---

### 5.2 Supabase Auth (Password Hashing)

**Status:** ✅ EXCELENTE
**Arquivo:** `src/app/api/auth/register/route.ts`

#### Implementação
- Usa `supabase.auth.signUp()` nativo
- Passwords hasheadas com bcrypt (Supabase nativo)
- Nunca armazena passwords em plaintext

#### Código de Exemplo
```typescript
// ✅ BOM: Supabase hash automático
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password, // Supabase hasheia automaticamente
  options: {
    emailRedirectTo: `${request.headers.get('origin')}/auth/callback`,
  },
})
```

#### Por Que É Bom
- **Industry standard:** bcrypt com salt
- **Managed:** Supabase gerencia complexity
- **Email verification:** Automática via Supabase

---

## 6. Webhook Security

### 6.1 Validação de Input em Webhooks

**Status:** ✅ EXCELENTE
**Arquivo:** `src/app/api/webhook/[clientId]/route.ts:180-236`

#### Implementação
- Valida `clientId` antes de processar
- Verifica status do cliente (`active`)
- Deduplicação de mensagens via Redis

#### Código de Exemplo
```typescript
// ✅ BOM: Validação em múltiplas camadas
const { clientId } = params

// Layer 1: Client existe e está ativo?
const client = await getClient(clientId)
if (!client?.active) {
  return new NextResponse('Client not found', { status: 404 })
}

// Layer 2: Mensagem já processada?
const dedupeKey = `webhook:${clientId}:${messageId}`
const alreadyProcessed = await redis.get(dedupeKey)
if (alreadyProcessed) {
  return new NextResponse('DUPLICATE_MESSAGE_IGNORED', { status: 200 })
}
```

#### Por Que É Bom
- **Multi-layered:** Várias verificações antes de processar
- **Idempotency:** Deduplicação previne processamento duplicado
- **Cost optimization:** Não processa clientes inativos

---

### 6.2 Await de Processamento Completo

**Status:** ✅ EXCELENTE
**Arquivo:** `src/app/api/webhook/[clientId]/route.ts:290`

#### Implementação
- Webhook **aguarda** processamento completo antes de retornar 200
- Previne término prematuro em serverless functions

#### Código de Exemplo
```typescript
// ✅ BOM: Await completo
await processChatbotMessage(body, config)
return new NextResponse('EVENT_RECEIVED', { status: 200 })
```

#### Por Que É Bom
- **Serverless-safe:** Evita término antes de processar
- **Reliability:** Meta recebe 200 apenas após sucesso
- **Debugging:** Erros acontecem antes de retornar 200

---

## 7. Error Handling

### 7.1 Try-Catch em API Routes

**Status:** ✅ EXCELENTE
**Arquivos:** Múltiplos (API routes)

#### Implementação
- TODAS as API routes têm try-catch
- Retornam erros estruturados com HTTP status correto
- Logs de erros para debugging

#### Código de Exemplo
```typescript
// ✅ BOM: Error handling consistente
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from('table').select('*')

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API Error]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Por Que É Bom
- **Graceful degradation:** Nunca expõe stack traces
- **Monitoring:** Logs centralizados para debugging
- **User experience:** Mensagens de erro claras

---

## 8. Performance e Otimizações

### 8.1 Parallel Fetching de Secrets

**Status:** ✅ EXCELENTE
**Arquivo:** `src/lib/vault.ts:53-74`

#### Implementação
- Usa `Promise.all` para buscar múltiplos secrets em paralelo
- Reduz latência de inicialização

#### Código de Exemplo
```typescript
// ✅ BOM: Parallel fetching
export const getSecretsParallel = async (
  supabase: SupabaseClient,
  secretNames: string[],
  clientId?: string
): Promise<Record<string, string | null>> => {
  const promises = secretNames.map((name) =>
    getSecret(supabase, name, clientId)
  )

  const results = await Promise.all(promises)
  // ...
}
```

#### Por Que É Bom
- **Latency reduction:** N secrets em tempo de 1 request
- **Scalability:** Performance não degrada com mais secrets

---

### 8.2 Redis para Message Batching

**Status:** ✅ EXCELENTE
**Arquivo:** `src/nodes/batchMessages.ts`

#### Implementação
- Agrupa mensagens rápidas em batch único
- Previne múltiplas chamadas de AI para mesma conversa

#### Código de Exemplo
```typescript
// ✅ BOM: Batching strategy
await redis.lpush(`chat:${phone}`, message)
await sleep(10000) // Wait 10s
const allMessages = await redis.lrange(`chat:${phone}`, 0, -1)
await redis.del(`chat:${phone}`)

return allMessages.join('\n')
```

#### Por Que É Bom
- **Cost optimization:** 1 AI call em vez de N
- **Better context:** AI vê todas as mensagens juntas
- **UX:** Resposta única ao invés de múltiplas

---

## 9. Code Quality

### 9.1 Functional Programming

**Status:** ✅ EXCELENTE
**Arquivos:** `src/nodes/*`

#### Implementação
- TODAS as nodes são pure functions
- Apenas `const` (nunca `let` ou `var`)
- Immutability padrão

#### Código de Exemplo
```typescript
// ✅ BOM: Pure function
export const parseMessage = (input: ParseMessageInput): MessageData => {
  const { phone, name, content } = input
  return { phone, name, content } // Nova instância
}
```

#### Por Que É Bom
- **Testability:** Pure functions fáceis de testar
- **Predictability:** Mesmos inputs = mesmos outputs
- **Maintainability:** Sem side effects escondidos

---

### 9.2 TypeScript Strict Mode

**Status:** ✅ EXCELENTE
**Arquivo:** `tsconfig.json`

#### Implementação
- Type checking completo
- Interfaces explícitas para todas as funções
- Nunca usa `any` (exceto workarounds documentados)

#### Por Que É Bom
- **Type safety:** Erros detectados em compile-time
- **Documentation:** Types servem como documentação
- **Refactoring:** IDE detecta breaking changes

---

## 10. Resumo de Boas Práticas a Manter

| Categoria | Prática | Status |
|-----------|---------|--------|
| **Secrets** | Vault com AES-256 | ✅ Manter |
| **Auth** | Supabase Auth + RBAC | ✅ Manter |
| **Multi-Tenant** | RLS policies + client_id | ✅ Manter (expandir para tabelas legacy) |
| **SQL Injection** | Prepared statements | ✅ Manter |
| **Session** | Refresh automático | ✅ Manter |
| **Webhooks** | Validação + deduplicação | ✅ Manter (adicionar signature) |
| **Error Handling** | Try-catch + logs | ✅ Manter |
| **Performance** | Parallel fetching + Redis | ✅ Manter |
| **Code Quality** | FP + TypeScript strict | ✅ Manter |

---

## Conclusão

O sistema ChatBot Oficial possui **fundações de segurança sólidas** em áreas críticas:
- ✅ Gestão de secrets com criptografia nativa
- ✅ Autenticação e autorização robustas
- ✅ Multi-tenancy com isolamento adequado (para tabelas novas)
- ✅ Proteção contra SQL injection
- ✅ Code quality alto (functional programming)

**Estas práticas devem ser:**
1. **Mantidas** em todas as futuras implementações
2. **Expandidas** para cobrir vulnerabilidades identificadas
3. **Documentadas** para novos desenvolvedores

---

**Última atualização:** 2025-11-18
**Próxima revisão:** Após implementação do Sprint 1 (30 dias)
