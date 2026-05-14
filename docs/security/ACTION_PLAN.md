# Plano de Ação - Correção de Vulnerabilidades

**Data:** 2025-11-18
**Versão:** 1.0
**Status:** 📋 ROADMAP EXECUTIVO

---

## Sumário Executivo

Este plano organiza a correção das **18 vulnerabilidades** identificadas em 3 sprints (30/60/90 dias), priorizadas por:

1. **Gravidade** (Crítica > Alta > Média > Baixa)
2. **Exploitabilidade** (facilidade de ataque)
3. **Impacto** (danos potenciais)
4. **Dependências** (correções que desbloqueiam outras)

**Estimativa Total:** 48 horas de desenvolvimento + 24 horas de testes = **72 horas (9 dias úteis)**

---

## Visão Geral dos Sprints

| Sprint       | Duração | Vulnerabilidades | Horas Dev | Horas Test | Total   |
| ------------ | ------- | ---------------- | --------- | ---------- | ------- |
| **Sprint 1** | 30 dias | 9 críticas/altas | 16h       | 8h         | 24h     |
| **Sprint 2** | 60 dias | 5 altas/médias   | 24h       | 12h        | 36h     |
| **Sprint 3** | 90 dias | 4 médias/baixas  | 8h        | 4h         | 12h     |
| **TOTAL**    | -       | **18**           | **48h**   | **24h**    | **72h** |

**Score de Segurança:**

- Atual: 6.5/10
- Após Sprint 1: 8.0/10 (+23%)
- Após Sprint 2: 8.8/10 (+35%)
- Após Sprint 3: 9.2/10 (+42%)

---

## Sprint 1 (30 Dias) - CORREÇÕES CRÍTICAS

**Objetivo:** Eliminar vulnerabilidades de alta exploitabilidade que podem causar vazamento de dados ou comprometer autenticação.

**Prioridade:** 🔴 URGENTE
**Estimativa:** 16 horas dev + 8 horas testes = **24 horas (3 dias úteis)**

---

### Tarefa 1.1: Deletar `/api/debug/env`

**Resolve:** VULN-003
**Gravidade:** 🔴 CRÍTICA
**Tempo:** 0.5 horas

#### Descrição

Endpoint expõe prefixos de API keys sem autenticação. Risco **EXTREMO** de vazamento de secrets.

#### Checklist

- [ ] Deletar `src/app/api/debug/env/route.ts`
- [ ] Verificar se nenhum código referencia este endpoint
- [ ] Deploy em produção
- [ ] Confirmar retorno 404 ao acessar `/api/debug/env`

#### Dependências

Nenhuma (pode ser feito imediatamente)

#### Validação

```bash
curl https://uzzap.uzzai.com/api/debug/env
# Esperado: 404 Not Found
```

---

### Tarefa 1.2: Implementar Signature Validation no Webhook

**Resolve:** VULN-012
**Gravidade:** 🔴 ALTA
**Tempo:** 2 horas

#### Descrição

Webhook não valida assinatura HMAC da Meta, permitindo spoofing de mensagens.

#### Checklist

- [ ] Adicionar `meta_app_secret` ao Supabase Vault (via Settings)
- [ ] Atualizar `getClientConfig()` para buscar `metaAppSecret`
- [ ] Implementar validação HMAC em `POST /api/webhook/[clientId]`
- [ ] Usar `crypto.timingSafeEqual()` para comparação
- [ ] Testar com webhook real da Meta
- [ ] Adicionar logs de tentativas de signature inválida

#### Dependências

- Acesso ao Meta App Secret (Facebook Developers Dashboard)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 2

#### Validação

```bash
# Testar com signature inválida
curl -X POST https://uzzap.uzzai.com/api/webhook/CLIENT_ID \
  -H "X-Hub-Signature-256: sha256=INVALID" \
  -d '{"test": true}'
# Esperado: 403 Invalid signature
```

---

### Tarefa 1.3: Corrigir RLS Policies em Tabelas Legacy

**Resolve:** VULN-007
**Gravidade:** 🔴 ALTA
**Tempo:** 3 horas

#### Descrição

Tabelas `clientes_whatsapp`, `documents`, `clients` têm policies permissivas (`USING (true)`), permitindo vazamento entre tenants.

#### Checklist

- [ ] Criar migration `fix_legacy_rls_policies.sql`
- [ ] Implementar função `user_client_id()`
- [ ] Remover policies permissivas existentes
- [ ] Criar policies isoladas por `client_id`
- [ ] Adicionar índices para performance
- [ ] Testar queries com usuários de diferentes tenants
- [ ] Aplicar migration em produção (`supabase db push`)
- [ ] Validar isolamento via SQL queries

#### Dependências

Nenhuma (independente)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 3

#### Validação

```sql
-- Como usuário do Client A:
SELECT * FROM clientes_whatsapp;
-- Esperado: Apenas clientes do Client A

-- Como usuário do Client B:
SELECT * FROM clientes_whatsapp;
-- Esperado: Apenas clientes do Client B
```

---

### Tarefa 1.4: Mascarar Secrets em `/api/vault/secrets`

**Resolve:** VULN-009
**Gravidade:** 🔴 CRÍTICA
**Tempo:** 1 hora

#### Descrição

Endpoint retorna secrets descriptografados em plaintext. NUNCA deve expor valores completos.

#### Checklist

- [ ] Implementar função `maskSecret()` (últimos 4 chars)
- [ ] Refatorar `GET /api/vault/secrets` para retornar masked
- [ ] Refatorar `PUT /api/vault/secrets` para NÃO retornar após update
- [ ] Atualizar frontend (Settings page) para lidar com masked values
- [ ] Adicionar campo `configured` para indicar se secret está setado
- [ ] Testar via browser dev tools (verificar que keys não aparecem)

#### Dependências

Nenhuma (independente)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 4

#### Validação

```javascript
// Browser console:
fetch("/api/vault/secrets")
  .then((r) => r.json())
  .then(console.log);
// Esperado: {"secrets": {"openai_api_key": "***xyz1", ...}}
```

---

### Tarefa 1.5: Configurar CORS

**Resolve:** VULN-011
**Gravidade:** 🔴 ALTA
**Tempo:** 1 hora

#### Descrição

API routes não têm CORS configurado, permitindo requisições de qualquer origin.

#### Checklist

- [ ] Adicionar config de CORS em `next.config.js`
- [ ] Whitelist apenas `https://uzzap.uzzai.com` (produção)
- [ ] Permitir `localhost:3000` em development
- [ ] Webhook: Permitir apenas `graph.facebook.com`
- [ ] Adicionar security headers (X-Content-Type-Options, X-Frame-Options)
- [ ] Testar com requisição cross-origin de domínio não autorizado

#### Dependências

Nenhuma (independente)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 5

#### Validação

```bash
# Testar CORS de origem não autorizada
curl -H "Origin: https://malicious.com" https://uzzap.uzzai.com/api/conversations
# Esperado: Sem header Access-Control-Allow-Origin ou erro CORS
```

---

### Tarefa 1.6: Implementar Rate Limiting no Webhook Verification

**Resolve:** VULN-002
**Gravidade:** 🔴 ALTA
**Tempo:** 2 horas

#### Descrição

Endpoint `GET /api/webhook/[clientId]` (verification) não tem rate limiting, permitindo brute force no verify_token.

#### Checklist

- [ ] Instalar Upstash Redis (`npm install @upstash/ratelimit @upstash/redis`)
- [ ] Criar conta Upstash e obter credenciais
- [ ] Adicionar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` no `.env.local`
- [ ] Implementar `rateLimitWebhookVerify` (5 tentativas/hora por IP)
- [ ] Aplicar rate limiter em `GET /api/webhook/[clientId]`
- [ ] Testar com múltiplas tentativas (verificar bloqueio)
- [ ] Adicionar headers `X-RateLimit-*` e `Retry-After`

#### Dependências

- Conta Upstash Redis (gratuita)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 6

#### Validação

```bash
# Fazer 6 requests rápidos:
for i in {1..6}; do
  curl "https://uzzap.uzzai.com/api/webhook/CLIENT_ID?hub.verify_token=test&hub.challenge=test"
done
# Esperado: 6ª request retorna 429 Too Many Requests
```

---

### Tarefa 1.7: Implementar Rate Limiting Global

**Resolve:** VULN-017
**Gravidade:** 🟡 MÉDIA (mas alta prioridade)
**Tempo:** 4 horas

#### Descrição

Nenhuma API route tem rate limiting, permitindo abuso e DDoS.

#### Checklist

- [ ] Criar `src/lib/rate-limit.ts` com Upstash
- [ ] Definir limiters: user (100/min), admin (50/min), IP (1000/min)
- [ ] Implementar `withRateLimit()` wrapper
- [ ] Aplicar em rotas críticas:
  - [ ] `/api/conversations`
  - [ ] `/api/messages/*`
  - [ ] `/api/admin/*`
  - [ ] `/api/vault/*`
- [ ] Adicionar headers `X-RateLimit-*`
- [ ] Testar rate limiting (exceder limite)
- [ ] Configurar analytics no Upstash Dashboard

#### Dependências

- Tarefa 1.6 (Upstash já configurado)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 6

#### Validação

```bash
# Fazer 101 requests rápidos:
for i in {1..101}; do
  curl https://uzzap.uzzai.com/api/conversations
done
# Esperado: 101ª request retorna 429
```

---

### Tarefa 1.8: Implementar Middleware de Auth para API Routes

**Resolve:** VULN-001
**Gravidade:** 🔴 CRÍTICA
**Tempo:** 6 horas

#### Descrição

API routes não têm auth automática via middleware, dependendo de implementação manual em cada route.

#### Checklist

- [ ] Criar `src/lib/middleware/api-auth-middleware.ts`
- [ ] Implementar `withAuth()` wrapper
- [ ] Implementar `withAdminAuth()` wrapper
- [ ] Definir whitelist de rotas públicas
- [ ] Refatorar rotas existentes para usar wrapper:
  - [ ] `/api/conversations/route.ts`
  - [ ] `/api/messages/*/route.ts`
  - [ ] `/api/vault/secrets/route.ts`
  - [ ] `/api/admin/users/route.ts`
  - [ ] `/api/client/config/route.ts`
  - [ ] (+ outras 10 rotas)
- [ ] Testar acesso sem autenticação (esperado: 401)
- [ ] Testar acesso com token inválido (esperado: 401)
- [ ] Testar admin routes com role `user` (esperado: 403)

#### Dependências

Nenhuma (independente)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 7

#### Validação

```bash
# Testar sem autenticação:
curl https://uzzap.uzzai.com/api/conversations
# Esperado: {"error": "Unauthorized: Authentication required"}

# Testar admin route com user comum:
curl -H "Authorization: Bearer USER_TOKEN" https://uzzap.uzzai.com/api/admin/users
# Esperado: {"error": "Forbidden: Admin access required"}
```

---

### Tarefa 1.9: Validar Role Antes de Service Role

**Resolve:** VULN-004
**Gravidade:** 🔴 ALTA
**Tempo:** 1 hora

#### Descrição

Admin routes usam service role mas validam role apenas via JWT, sem revalidação no banco.

#### Checklist

- [ ] Refatorar `POST /api/admin/users` para revalidar role via query
- [ ] Refatorar `PUT /api/admin/users/:id` para revalidar role
- [ ] Refatorar `DELETE /api/admin/users/:id` para revalidar role
- [ ] Adicionar verificação: "role mudou desde o login?"
- [ ] Testar com JWT antigo após rebaixar role

#### Dependências

- Tarefa 1.8 (usar `withAdminAuth`)

#### Código de Referência

```typescript
// Revalidar role antes de usar service role:
const { data: profile } = await supabase
  .from("user_profiles")
  .select("role, is_active")
  .eq("id", user.id)
  .single();

if (!profile || !["admin", "client_admin"].includes(profile.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Agora sim, usar service role
const supabaseAdmin = createServiceRoleClient();
```

#### Validação

1. Fazer login como admin
2. Copiar token JWT
3. Via outro admin, rebaixar role para `user`
4. Usar token antigo para tentar criar usuário
5. Esperado: 403 Forbidden

---

### Sprint 1 - Resumo

| #         | Tarefa                       | Gravidade  | Horas     | Status      |
| --------- | ---------------------------- | ---------- | --------- | ----------- |
| 1.1       | Deletar `/api/debug/env`     | 🔴 CRÍTICA | 0.5h      | ⏳ Pendente |
| 1.2       | Signature Validation Webhook | 🔴 ALTA    | 2h        | ⏳ Pendente |
| 1.3       | Corrigir RLS Policies        | 🔴 ALTA    | 3h        | ⏳ Pendente |
| 1.4       | Mascarar Secrets             | 🔴 CRÍTICA | 1h        | ⏳ Pendente |
| 1.5       | Configurar CORS              | 🔴 ALTA    | 1h        | ⏳ Pendente |
| 1.6       | Rate Limit Webhook           | 🔴 ALTA    | 2h        | ⏳ Pendente |
| 1.7       | Rate Limit Global            | 🟡 MÉDIA   | 4h        | ⏳ Pendente |
| 1.8       | Auth Middleware              | 🔴 CRÍTICA | 6h        | ⏳ Pendente |
| 1.9       | Revalidar Role               | 🔴 ALTA    | 1h        | ⏳ Pendente |
| **TOTAL** | -                            | -          | **20.5h** | -           |

**+ 8h testes = 28.5 horas (3.5 dias úteis)**

**Impacto:** Score de segurança sobe de **6.5 → 8.0** (+23%)

---

## Sprint 2 (60 Dias) - CORREÇÕES ALTAS/MÉDIAS

**Objetivo:** Melhorar auditabilidade, input validation e session management.

**Prioridade:** 🟡 ALTA
**Estimativa:** 24 horas dev + 12 horas testes = **36 horas (4.5 dias úteis)**

---

### Tarefa 2.1: Implementar Audit Trail

**Resolve:** VULN-008
**Gravidade:** 🟡 MÉDIA
**Tempo:** 4 horas

#### Descrição

Service role bypassa RLS mas não registra ações em audit log.

#### Checklist

- [ ] Criar migration `create_audit_log.sql`
- [ ] Implementar `logAuditEvent()` helper
- [ ] Aplicar em operações sensíveis:
  - [ ] `POST /api/admin/users` (criar usuário)
  - [ ] `PUT /api/admin/users/:id` (atualizar)
  - [ ] `DELETE /api/admin/users/:id` (deletar)
  - [ ] `PUT /api/vault/secrets` (atualizar secrets)
  - [ ] `POST /api/client/config` (atualizar config)
- [ ] Criar endpoint `GET /api/admin/audit-logs`
- [ ] Criar página de dashboard `/dashboard/admin/audit-logs`
- [ ] Testar visualização de logs

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 8

---

### Tarefa 2.2: Input Validation com Zod

**Resolve:** VULN-013
**Gravidade:** 🟡 MÉDIA
**Tempo:** 6 horas

#### Descrição

API routes aceitam JSON arbitrário sem validação de schema.

#### Checklist

- [ ] Instalar Zod (`npm install zod`)
- [ ] Criar schemas em `src/lib/schemas/`:
  - [ ] `ClientConfigSchema`
  - [ ] `BotConfigSchema`
  - [ ] `UserCreateSchema`
  - [ ] `SecretUpdateSchema`
- [ ] Aplicar validação em routes:
  - [ ] `PATCH /api/client/config`
  - [ ] `POST /api/admin/users`
  - [ ] `PUT /api/vault/secrets`
  - [ ] `POST /api/flow/nodes/:id`
- [ ] Retornar erros 400 com detalhes (campo inválido)
- [ ] Testar com payloads inválidos

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 9

---

### Tarefa 2.3: Deduplicação Fallback no PostgreSQL

**Resolve:** VULN-006
**Gravidade:** 🟡 MÉDIA
**Tempo:** 3 horas

#### Descrição

Se Redis falhar, webhook continua sem deduplicação, processando mensagens duplicadas.

#### Checklist

- [ ] Criar tabela `webhook_dedup` no PostgreSQL
- [ ] Implementar fallback: se Redis falhar, usar PostgreSQL
- [ ] Adicionar índice em `message_id` + `created_at`
- [ ] Cleanup automático (DELETE WHERE created_at < NOW() - INTERVAL '24 hours')
- [ ] Testar com Redis offline

---

### Tarefa 2.4: Log Sanitization

**Resolve:** VULN-016
**Gravidade:** 🟡 MÉDIA
**Tempo:** 4 horas

#### Descrição

Logs expõem PII (emails, telefones, secrets).

#### Checklist

- [ ] Criar `src/lib/logger.ts` com função `sanitize()`
- [ ] Refatorar todos os `console.log()` para usar logger
- [ ] Redact campos sensíveis: `password`, `token`, `api_key`, `email`, `telefone`
- [ ] Configurar retention policy (7 dias) em Vercel
- [ ] Testar com Vercel logs (verificar que PII não aparece)

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 12

---

### Tarefa 2.5: Session Timeout Configurado

**Resolve:** VULN-014
**Gravidade:** 🟡 MÉDIA
**Tempo:** 1 hora

#### Descrição

Session timeout usa defaults do Supabase (1 hora), sem customização.

#### Checklist

- [ ] Acessar Supabase Dashboard → Authentication → Settings
- [ ] Configurar JWT expiry: 3600 (1 hora)
- [ ] Configurar Refresh token expiry: 604800 (7 dias)
- [ ] Implementar "Remember Me" (opcional):
  - [ ] Checkbox no login
  - [ ] Se marcado, extend refresh token para 30 dias
- [ ] Testar expiração de access token (refresh automático)
- [ ] Testar expiração de refresh token (redirect para login)

---

### Tarefa 2.6: Session Fixation Fix

**Resolve:** VULN-005
**Gravidade:** 🟡 MÉDIA
**Tempo:** 2 horas

#### Descrição

Após registro, sistema reutiliza sessão criada durante registro.

#### Checklist

- [ ] Refatorar `POST /api/auth/register`:
  - [ ] Após `signUp()`, NÃO fazer login automático
  - [ ] Retornar mensagem: "Check your email to verify"
- [ ] Atualizar frontend:
  - [ ] Redirecionar para `/verify-email` após registro
  - [ ] Mostrar mensagem de verificação
- [ ] Após verificação de email, usuário faz login normal
- [ ] Testar fluxo completo de registro

---

### Sprint 2 - Resumo

| #         | Tarefa                 | Gravidade | Horas   | Status      |
| --------- | ---------------------- | --------- | ------- | ----------- |
| 2.1       | Audit Trail            | 🟡 MÉDIA  | 4h      | ⏳ Pendente |
| 2.2       | Input Validation (Zod) | 🟡 MÉDIA  | 6h      | ⏳ Pendente |
| 2.3       | Deduplicação Fallback  | 🟡 MÉDIA  | 3h      | ⏳ Pendente |
| 2.4       | Log Sanitization       | 🟡 MÉDIA  | 4h      | ⏳ Pendente |
| 2.5       | Session Timeout        | 🟡 MÉDIA  | 1h      | ⏳ Pendente |
| 2.6       | Session Fixation       | 🟡 MÉDIA  | 2h      | ⏳ Pendente |
| **TOTAL** | -                      | -         | **20h** | -           |

**+ 12h testes = 32 horas (4 dias úteis)**

**Impacto:** Score de segurança sobe de **8.0 → 8.8** (+10%)

---

## Sprint 3 (90 Dias) - MELHORIAS BAIXAS

**Objetivo:** Hardening adicional e compliance.

**Prioridade:** 🟢 BAIXA
**Estimativa:** 8 horas dev + 4 horas testes = **12 horas (1.5 dias úteis)**

---

### Tarefa 3.1: Content Security Policy

**Resolve:** VULN-018
**Gravidade:** 🟢 BAIXA
**Tempo:** 2 horas

#### Checklist

- [ ] Adicionar CSP headers em `next.config.js`
- [ ] Testar com Mozilla Observatory (https://observatory.mozilla.org/)
- [ ] Ajustar policy para permitir Google Fonts
- [ ] Testar que dashboard funciona corretamente

#### Código de Referência

Ver `RECOMMENDATIONS.md` Seção 11

---

### Tarefa 3.2: Token Rotation

**Resolve:** VULN-015
**Gravidade:** 🟢 BAIXA
**Tempo:** 1 hora

#### Checklist

- [ ] Habilitar "Refresh Token Rotation" no Supabase Dashboard
- [ ] Testar que refresh gera novo token
- [ ] Implementar token revocation list (opcional)

---

### Tarefa 3.3: Secrets em Logs (Restante)

**Resolve:** VULN-010
**Gravidade:** 🟡 MÉDIA
**Tempo:** 2 horas

#### Checklist

- [ ] Auditar TODOS os `console.log()` no código
- [ ] Garantir que nenhum loga secrets ou config completa
- [ ] Usar logger sanitizado (Tarefa 2.4)

---

### Tarefa 3.4: Penetration Testing

**Tempo:** 3 horas

#### Checklist

- [ ] Contratar pentest ou usar ferramenta (OWASP ZAP)
- [ ] Testar todas as vulnerabilidades corrigidas
- [ ] Gerar relatório de pentest
- [ ] Corrigir issues adicionais encontrados

---

### Sprint 3 - Resumo

| #         | Tarefa                  | Gravidade | Horas  | Status      |
| --------- | ----------------------- | --------- | ------ | ----------- |
| 3.1       | Content Security Policy | 🟢 BAIXA  | 2h     | ⏳ Pendente |
| 3.2       | Token Rotation          | 🟢 BAIXA  | 1h     | ⏳ Pendente |
| 3.3       | Secrets em Logs         | 🟡 MÉDIA  | 2h     | ⏳ Pendente |
| 3.4       | Penetration Testing     | -         | 3h     | ⏳ Pendente |
| **TOTAL** | -                       | -         | **8h** | -           |

**+ 4h testes = 12 horas (1.5 dias úteis)**

**Impacto:** Score de segurança sobe de **8.8 → 9.2** (+5%)

---

## Cronograma Visual

```
Mês 1 (Sprint 1):
Semana 1: ████████ Tarefas 1.1-1.4 (Críticas)
Semana 2: ████████ Tarefas 1.5-1.7 (CORS, Rate Limiting)
Semana 3: ████████ Tarefa 1.8 (Auth Middleware)
Semana 4: ████     Tarefa 1.9 + Testes

Mês 2 (Sprint 2):
Semana 1: ████████ Tarefas 2.1-2.2 (Audit + Validation)
Semana 2: ████████ Tarefas 2.3-2.4 (Dedup + Logs)
Semana 3: ████     Tarefas 2.5-2.6 (Session)
Semana 4: ████     Testes + Ajustes

Mês 3 (Sprint 3):
Semana 1: ████████ Tarefas 3.1-3.4
Semana 2: ████     Pentest + Correções
Semana 3-4: Disponível para outras features
```

---

## Dependências e Bloqueadores

### Dependências Externas

1. **Upstash Redis** (Tarefas 1.6, 1.7)

   - Ação: Criar conta gratuita
   - Bloqueador: Se não criar, não pode implementar rate limiting
   - Alternativa: Redis local (não recomendado para produção)

2. **Meta App Secret** (Tarefa 1.2)

   - Ação: Obter de Facebook Developers Dashboard
   - Bloqueador: Se não tiver acesso, não pode validar signature
   - Alternativa: Pular temporariamente (mas deixa vulnerabilidade!)

3. **Supabase Dashboard Access** (Tarefas 1.3, 2.1, 2.5, 3.2)
   - Ação: Acesso admin ao projeto Supabase
   - Bloqueador: Sem acesso, não pode aplicar migrations ou configurar settings

### Dependências Internas

- **Tarefa 1.8 desbloqueia:** 1.9 (usa `withAdminAuth`)
- **Tarefa 1.6 desbloqueia:** 1.7 (Upstash já configurado)
- **Tarefa 2.4 desbloqueia:** 3.3 (usa logger sanitizado)

---

## Métricas de Sucesso

### Sprint 1 (30 Dias)

- [ ] **Zero** secrets expostos via API
- [ ] **100%** das requisições webhook validadas por signature
- [ ] **Zero** vazamento de dados entre tenants (RLS testado)
- [ ] **100%** das API routes com auth automática
- [ ] Rate limiting ativo em **15+ rotas**

### Sprint 2 (60 Dias)

- [ ] **100%** das ações privilegiadas logadas em audit trail
- [ ] **Zero** payloads inválidos aceitos (Zod validation)
- [ ] **Zero** PII em logs de produção
- [ ] Session timeout configurado e testado

### Sprint 3 (90 Dias)

- [ ] Score A no Mozilla Observatory
- [ ] Pentest realizado sem critical findings
- [ ] Token rotation ativo

---

## Aprovações e Sign-off

### Sprint 1 (URGENTE)

- [ ] **Aprovado por:** ********\_********
- [ ] **Data:** ********\_********
- [ ] **Início previsto:** ********\_********

### Sprint 2

- [ ] **Aprovado por:** ********\_********
- [ ] **Data:** ********\_********

### Sprint 3

- [ ] **Aprovado por:** ********\_********
- [ ] **Data:** ********\_********

---

## Recursos Necessários

### Equipe

- **1 Desenvolvedor Backend** (Full-time durante Sprint 1)
- **1 DevOps/Infra** (Part-time para Upstash, Supabase config)
- **1 QA/Tester** (Part-time durante testes)

### Ferramentas

- Upstash Redis (Plano gratuito - até 10k requests/dia)
- Supabase (Plano atual - sem custo adicional)
- Zod (NPM package - gratuito)
- OWASP ZAP ou similar (gratuito)

### Custos Estimados

- Upstash: $0 (plano gratuito suficiente)
- Pentest (opcional): $500-2000
- **Total:** $0-2000

---

## Próximos Passos Imediatos

1. **HOJE:** Deletar `/api/debug/env` (Tarefa 1.1 - 30 min)
2. **ESTA SEMANA:** Implementar signature validation + mascarar secrets (Tarefas 1.2, 1.4)
3. **ESTA SEMANA:** Aplicar RLS policies fix (Tarefa 1.3)
4. **PRÓXIMA SEMANA:** Configurar Upstash + Rate limiting (Tarefas 1.6, 1.7)
5. **PRÓXIMA SEMANA:** Auth middleware (Tarefa 1.8)

---

## Checklist de Validação Pós-Sprint 1

- [ ] Todos os testes de validação passaram
- [ ] Score de segurança = 8.0+ (usar OWASP ZAP)
- [ ] Nenhuma vulnerabilidade crítica remanescente
- [ ] Deploy em produção sem downtime
- [ ] Monitoramento ativo (rate limiting, audit logs)
- [ ] Documentação atualizada (`CLAUDE.md`, `README.md`)
- [ ] Time treinado nas novas práticas de segurança

---

**Última atualização:** 2025-11-18
**Responsável:** Equipe de Desenvolvimento
**Próxima revisão:** Fim do Sprint 1 (30 dias)
