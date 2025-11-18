# Relatório de Vulnerabilidades de Segurança

**Data:** 2025-11-18
**Versão:** 1.0
**Status:** 🔴 AÇÃO REQUERIDA

---

## Sumário Executivo

Foram identificadas **18 vulnerabilidades** no sistema ChatBot Oficial, sendo:
- 🔴 **9 Críticas/Altas** - Requerem ação imediata (30 dias)
- 🟡 **7 Médias** - Corrigir em próximo sprint (60 dias)
- 🟢 **2 Baixas** - Backlog de melhorias (90 dias)

**Score de Segurança Atual:** 6.5/10

---

## Vulnerabilidades Críticas (Prioridade 1)

### VULN-001: Bypass de Middleware em API Routes [CRÍTICA]

**Gravidade:** 🔴 CRÍTICA
**Arquivo:** `middleware.ts:161-173`
**Exploitabilidade:** ⚠️ ALTA

#### Descrição
O middleware de autenticação **NÃO protege rotas `/api/*`**, deixando TODAS as API routes sem verificação de autenticação automática no nível de middleware.

#### Evidência
```typescript
// ❌ CRÍTICO: API routes excluídas do matcher
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}
```

#### Impacto
- Qualquer API route deve implementar autenticação manualmente
- Se um desenvolvedor esquecer de adicionar `getClientIdFromSession()`, a route fica **COMPLETAMENTE DESPROTEGIDA**
- Não há "fail-safe" layer

#### Prova de Conceito
```typescript
// Nova route sem auth:
export async function GET() {
  const supabase = createServerClient()
  // ❌ ESQUECEU de chamar getClientIdFromSession()
  const { data } = await supabase.from('clients').select('*')
  return NextResponse.json(data) // Vazamento de TODOS os dados!
}
```

#### Recomendação
1. Criar whitelist de rotas públicas
2. Aplicar autenticação default em TODAS as API routes
3. Implementar decorator/wrapper para routes autenticadas

#### Arquivos Afetados
- `middleware.ts`
- TODAS as rotas em `src/app/api/**/route.ts`

---

### VULN-003: Exposição de Secrets em Endpoint de Debug [CRÍTICA]

**Gravidade:** 🔴 CRÍTICA
**Arquivo:** `src/app/api/debug/env/route.ts`
**Exploitabilidade:** ⚠️ MUITO ALTA

#### Descrição
Endpoint `/api/debug/env` expõe prefixos de API keys **SEM AUTENTICAÇÃO**.

#### Evidência
```typescript
// ❌ CRÍTICO: SEM VERIFICAÇÃO DE AUTH!
export async function GET() {
  return NextResponse.json({
    OPENAI_KEY_PREFIX: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
    GROQ_KEY_PREFIX: process.env.GROQ_API_KEY?.substring(0, 10) + '...',
  })
}
```

#### Impacto
- **QUALQUER PESSOA** pode acessar sem autenticação
- Prefixos reduzem drasticamente espaço de busca para brute force
- OpenAI keys começam com `sk-proj-`, expor 10 chars revela padrão completo

#### Prova de Conceito
```bash
curl https://chat.luisfboff.com/api/debug/env
# {"OPENAI_KEY_PREFIX":"sk-proj-Ab..."}
```

#### Recomendação
1. **DELETAR IMEDIATAMENTE** em produção
2. Se necessário, proteger com:
   - Autenticação obrigatória (super admin apenas)
   - IP whitelist
   - Environment check: `if (process.env.NODE_ENV !== 'production')`

---

### VULN-007: Tabelas Legacy SEM RLS [ALTA]

**Gravidade:** 🔴 ALTA
**Arquivos:** `docs/tables/tabelas.md:19-93`, migrations
**Exploitabilidade:** ⚠️ MÉDIA

#### Descrição
Tabelas legacy do n8n não têm RLS adequado, usando políticas permissivas `USING (true)`.

#### Tabelas Afetadas
1. **`clientes_whatsapp`** - Policy "n8n" permite acesso total
2. **`documents`** - Policy "n8n" permite acesso total
3. **`clients`** - Policy permite leitura para todos usuários autenticados

#### Evidência
```sql
-- ❌ CRÍTICO: Sem filtro por client_id
CREATE POLICY "n8n" ON clientes_whatsapp FOR ALL USING (true);
CREATE POLICY "n8n" ON documents FOR ALL USING (true);
CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
```

#### Impacto
- Qualquer usuário autenticado acessa dados de TODOS os clientes
- Vazamento de PII: telefones, nomes, status de conversas
- Documentos RAG de um cliente podem ser lidos por outro

#### Prova de Conceito
```typescript
// Usuário do Client A vê dados do Client B:
const { data } = await supabase.from('clientes_whatsapp').select('*')
// Retorna TODOS os clientes de TODOS os tenants!
```

#### Recomendação
**URGENTE:** Executar migration para corrigir policies:

```sql
-- Migration: fix_legacy_rls_policies.sql

DROP POLICY IF EXISTS "n8n" ON clientes_whatsapp;

CREATE POLICY "Users can view own client whatsapp customers"
  ON clientes_whatsapp FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can access all"
  ON clientes_whatsapp FOR ALL
  USING (auth.role() = 'service_role');
```

---

### VULN-009: Secrets Retornados em Plaintext via API [CRÍTICA]

**Gravidade:** 🔴 CRÍTICA
**Arquivo:** `src/app/api/vault/secrets/route.ts:27-127`
**Exploitabilidade:** ⚠️ MUITO ALTA

#### Descrição
Endpoint `GET /api/vault/secrets` retorna secrets descriptografados em plaintext via JSON.

#### Evidência
```typescript
// ❌ CRÍTICO: Secrets em plaintext na response
return NextResponse.json({
  secrets: {
    meta_access_token: metaAccessToken || '',
    meta_verify_token: metaVerifyToken || '',
    openai_api_key: openaiApiKey || '',
    groq_api_key: groqApiKey || '',
  },
})
```

#### Impacto
- Interceptação via man-in-the-middle (se não HTTPS)
- Logs de proxy/CDN armazenam secrets
- Browser dev tools expõem secrets

#### Prova de Conceito
```javascript
// Browser console:
fetch('/api/vault/secrets')
  .then(r => r.json())
  .then(console.log)
// Exibe todos os API keys!
```

#### Recomendação
**SOLUÇÃO IMEDIATA:**

```typescript
// ✅ Retornar apenas últimos 4 caracteres
const maskSecret = (secret: string) => {
  if (!secret || secret === 'CONFIGURE_IN_SETTINGS') return secret
  return '***' + secret.slice(-4)
}

return NextResponse.json({
  secrets: {
    meta_access_token: maskSecret(metaAccessToken),
    // ...
  },
})
```

---

### VULN-011: CORS Não Configurado [ALTA]

**Gravidade:** 🔴 ALTA
**Arquivos:** TODAS as `/api/*/route.ts`
**Exploitabilidade:** ⚠️ ALTA

#### Descrição
Nenhuma API route define headers CORS, permitindo requisições cross-origin de qualquer domínio.

#### Impacto
- Qualquer site malicioso pode fazer requests para a API
- CSRF attacks possíveis
- Cookies de sessão enviados automaticamente

#### Recomendação
Configurar CORS em `next.config.js`:

```javascript
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'https://chat.luisfboff.com' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
    ]
  }]
}
```

---

### VULN-012: Webhook POST Sem Validação de Signature [ALTA]

**Gravidade:** 🔴 ALTA
**Arquivo:** `src/app/api/webhook/[clientId]/route.ts:169-281`
**Exploitabilidade:** ⚠️ MUITO ALTA

#### Descrição
Webhook POST não valida assinatura da Meta (X-Hub-Signature-256).

#### Evidência
```typescript
export async function POST(request: NextRequest) {
  // ❌ NÃO VALIDA ASSINATURA!
  const body = await request.json()
  // Processa imediatamente
}
```

#### Impacto
- Atacante pode enviar payloads falsos
- Spoofing de mensagens
- Injeção de comandos maliciosos

#### Prova de Conceito
```bash
curl -X POST https://chat.luisfboff.com/api/webhook/CLIENT_ID \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"ATTACKER","text":{"body":"MALICIOUS"}}]}}]}]}'
```

#### Recomendação
**IMPLEMENTAÇÃO URGENTE:**

```typescript
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('X-Hub-Signature-256')
  const rawBody = await request.text()
  const appSecret = config.apiKeys.metaVerifyToken

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

  if (signature !== `sha256=${expectedSignature}`) {
    return new NextResponse('Invalid signature', { status: 403 })
  }

  const body = JSON.parse(rawBody)
  // Processa...
}
```

---

## Vulnerabilidades Altas

### VULN-002: Token de Webhook Sem Rate Limiting [ALTA]

**Arquivo:** `src/app/api/webhook/[clientId]/route.ts:28-164`
**Gravidade:** 🔴 ALTA

#### Descrição
Endpoint de verificação de webhook (GET) não tem rate limiting, permitindo brute force no verify_token.

#### Impacto
- Descoberta de token via tentativas ilimitadas
- Logs detalhados facilitam timing attacks

#### Recomendação
1. Implementar rate limiting (5 tentativas/hora por IP)
2. Remover logs detalhados de comparação

---

### VULN-004: Admin Routes Sem Verificação de Service Role [ALTA]

**Arquivo:** `src/app/api/admin/users/route.ts:183-414`
**Gravidade:** 🔴 ALTA

#### Descrição
Route `POST /api/admin/users` usa service role mas valida role apenas via JWT do usuário.

#### Impacto
- Se JWT manipulado, atacante pode criar usuários arbitrários
- Service role bypassa RLS sem revalidação

#### Recomendação
1. Validar role via query ao banco ANTES de usar service role
2. Implementar second-factor para ações de admin

---

## Vulnerabilidades Médias

### VULN-005: Session Fixation Vulnerability [MÉDIA]

**Arquivo:** `src/app/api/auth/register/route.ts:260-271`
**Gravidade:** 🟡 MÉDIA

#### Descrição
Após registro, sistema reutiliza sessão criada durante registro.

#### Recomendação
Forçar logout e re-login após registro.

---

### VULN-006: Webhook Deduplication Fraca [MÉDIA]

**Arquivo:** `src/app/api/webhook/[clientId]/route.ts:238-261`
**Gravidade:** 🟡 MÉDIA

#### Descrição
Se Redis falhar, processamento continua sem deduplicação.

#### Impacto
- Mensagens duplicadas processadas
- Custos de API multiplicados

#### Recomendação
Implementar fallback no PostgreSQL ou retornar erro 503.

---

### VULN-008: Service Role Bypass Sem Audit Trail [MÉDIA]

**Arquivo:** `src/lib/supabase.ts:77-112`
**Gravidade:** 🟡 MÉDIA

#### Descrição
Service role bypassa RLS mas não registra ações em audit log.

#### Recomendação
Implementar audit logging: `user_id`, `action`, `table_name`, `record_id`.

---

### VULN-010: Secrets em Logs de Console [MÉDIA]

**Arquivo:** `src/lib/config.ts:224`
**Gravidade:** 🟡 MÉDIA

#### Descrição
Logs podem expor secrets se debug logging habilitado.

#### Recomendação
Sanitizar objetos antes de logar.

---

### VULN-013: Falta de Input Validation em JSON Payloads [MÉDIA]

**Arquivo:** `src/app/api/client/config/route.ts:90-159`
**Gravidade:** 🟡 MÉDIA

#### Descrição
Endpoint aceita JSON arbitrário sem validação de schema.

#### Recomendação
Implementar Zod schema validation:

```typescript
const ConfigSchema = z.object({
  system_prompt: z.string().max(10000),
  settings: z.object({
    max_tokens: z.number().min(1).max(100000),
  })
})
```

---

### VULN-014: Session Timeout Não Configurado [MÉDIA]

**Arquivos:** `src/lib/supabase*.ts`
**Gravidade:** 🟡 MÉDIA

#### Descrição
Não há configuração explícita de session timeout.

#### Recomendação
Configurar timeout customizado no Supabase Dashboard.

---

### VULN-016: Logs Excessivos Expõem Dados Sensíveis [MÉDIA]

**Arquivos:** Múltiplos
**Gravidade:** 🟡 MÉDIA

#### Descrição
Logs contêm PII (emails, telefones, nomes).

#### Impacto
Violação de GDPR/LGPD.

#### Recomendação
1. Sanitizar logs
2. Usar IDs em vez de dados pessoais
3. Retention policy de 7 dias

---

### VULN-017: Falta de Rate Limiting Global [MÉDIA]

**Arquivos:** TODAS as API routes
**Gravidade:** 🟡 MÉDIA

#### Descrição
Nenhuma API route implementa rate limiting.

#### Impacto
- DDoS attacks
- Custos elevados de serverless

#### Recomendação
Implementar com Upstash Redis:
- Autenticadas: 100 req/min por usuário
- Públicas (webhook): 1000 req/min por IP
- Admin: 10 req/min

---

## Vulnerabilidades Baixas

### VULN-015: Token Rotation Não Implementado [BAIXA]

**Arquivos:** `src/lib/supabase*.ts`
**Gravidade:** 🟢 BAIXA

#### Descrição
Refresh tokens não são rotacionados após uso.

#### Recomendação
Habilitar "Refresh Token Rotation" no Supabase Dashboard.

---

### VULN-018: Falta de Content Security Policy [BAIXA]

**Arquivo:** `app/layout.tsx`
**Gravidade:** 🟢 BAIXA

#### Descrição
Não há headers CSP configurados.

#### Recomendação
Adicionar CSP em `next.config.js`:

```javascript
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'unsafe-eval';"
    }]
  }]
}
```

---

## Tabela Resumo

| ID | Vulnerabilidade | Gravidade | Exploitabilidade | Impacto |
|----|-----------------|-----------|------------------|---------|
| VULN-001 | Bypass Middleware API Routes | 🔴 CRÍTICA | ALTA | Acesso não autorizado |
| VULN-002 | Webhook Token Sem Rate Limit | 🔴 ALTA | MÉDIA | Brute force |
| VULN-003 | Secrets em Debug Endpoint | 🔴 CRÍTICA | MUITO ALTA | Vazamento de keys |
| VULN-004 | Admin Routes Sem Verificação | 🔴 ALTA | MÉDIA | Privilege escalation |
| VULN-005 | Session Fixation | 🟡 MÉDIA | BAIXA | Session hijacking |
| VULN-006 | Deduplication Fraca | 🟡 MÉDIA | BAIXA | Custos elevados |
| VULN-007 | Tabelas SEM RLS | 🔴 ALTA | MÉDIA | Vazamento multi-tenant |
| VULN-008 | Sem Audit Trail | 🟡 MÉDIA | BAIXA | Sem rastreabilidade |
| VULN-009 | Secrets em Plaintext | 🔴 CRÍTICA | MUITO ALTA | Interceptação |
| VULN-010 | Secrets em Logs | 🟡 MÉDIA | BAIXA | Vazamento via logs |
| VULN-011 | CORS Não Configurado | 🔴 ALTA | ALTA | CSRF attacks |
| VULN-012 | Webhook Sem Signature | 🔴 ALTA | MUITO ALTA | Spoofing |
| VULN-013 | Input Validation Fraca | 🟡 MÉDIA | MÉDIA | Injection |
| VULN-014 | Session Timeout | 🟡 MÉDIA | BAIXA | Session hijacking |
| VULN-015 | Token Rotation | 🟢 BAIXA | MUITO BAIXA | Reutilização tokens |
| VULN-016 | Logs Excessivos | 🟡 MÉDIA | MÉDIA | GDPR/LGPD |
| VULN-017 | Rate Limiting | 🟡 MÉDIA | ALTA | DDoS |
| VULN-018 | CSP | 🟢 BAIXA | BAIXA | XSS |

---

## Próximos Passos

1. Revisar documento `ACTION_PLAN.md` para roadmap de correções
2. Consultar `RECOMMENDATIONS.md` para detalhes de implementação
3. Usar `SECURITY_CHECKLIST.md` para validar futuras mudanças

---

**Última atualização:** 2025-11-18
**Próxima revisão:** Após implementação do Sprint 1 (30 dias)
