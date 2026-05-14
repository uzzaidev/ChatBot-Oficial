# Security Checklist - ChatBot Oficial

**Versão:** 1.0
**Última atualização:** 2025-11-18
**Uso:** Validar TODAS as mudanças de código antes de merge/deploy

---

## Como Usar Este Checklist

### Para Pull Requests

1. Copiar checklist relevante (API, Frontend, Database)
2. Marcar itens aplicáveis com `[x]`
3. Se algum item não passar, adicionar comentário explicando por quê
4. Reviewer deve validar checklist antes de aprovar

### Para Deploy

1. Executar checklist completo de "Pre-Deploy"
2. Garantir que TODOS os itens passam
3. Se algum falhar, NÃO fazer deploy

---

## 🔒 Checklist: Nova API Route

Use este checklist ao criar ou modificar qualquer arquivo em `src/app/api/**/route.ts`.

### Autenticação e Autorização

- [ ] Route usa `withAuth()` ou `withAdminAuth()` wrapper (exceto se pública)
- [ ] Se pública, está na whitelist de `PUBLIC_API_ROUTES`?
- [ ] Valida `clientId` antes de acessar dados (multi-tenant isolation)
- [ ] Verifica role (`admin`, `client_admin`, `user`) se necessário
- [ ] Verifica `is_active` status do usuário

**Exemplo:**

```typescript
import { withAuth } from "@/lib/middleware/api-auth-middleware";

const handler = withAuth(async (request, { clientId, user, profile }) => {
  // clientId já validado!
  // ...
});

export { handler as GET };
```

---

### Input Validation

- [ ] TODOS os inputs (body, query params, headers) são validados
- [ ] Usa Zod schemas para validação de estrutura
- [ ] Valida tipos (string, number, boolean)
- [ ] Valida ranges (min, max) para números
- [ ] Valida comprimento (maxLength) para strings
- [ ] Sanitiza input para prevenir XSS
- [ ] Retorna erro 400 com mensagem clara se inválido

**Exemplo:**

```typescript
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().min(0).max(150),
});

const body = await request.json();
const validated = BodySchema.parse(body); // Lança erro se inválido
```

---

### SQL Injection Prevention

- [ ] NUNCA concatena input do usuário em queries SQL
- [ ] Usa parameterized queries (`$1`, `$2`, etc)
- [ ] Usa Supabase query builder quando possível
- [ ] Se usar raw SQL, SEMPRE com prepared statements

**Exemplo:**

```typescript
// ✅ CORRETO:
await query("SELECT * FROM users WHERE id = $1", [userId]);

// ❌ ERRADO:
await query(`SELECT * FROM users WHERE id = ${userId}`);
```

---

### RLS (Row Level Security)

- [ ] Se acessa tabela com dados de cliente, verifica `client_id`
- [ ] Usa Supabase client (não service role) para queries que devem respeitar RLS
- [ ] Se usa service role, documenta por quê e adiciona validação manual de `client_id`
- [ ] Testa que usuário de Client A não pode ver dados de Client B

---

### Secrets e Credenciais

- [ ] NUNCA retorna secrets completos em response
- [ ] Se precisa mostrar secret, usa masking (`maskSecret()`)
- [ ] NUNCA loga secrets em console.log
- [ ] Usa Supabase Vault para buscar secrets de clientes
- [ ] Valida que secrets obrigatórios estão presentes antes de processar

**Exemplo:**

```typescript
// ✅ CORRETO:
return NextResponse.json({
  api_key: maskSecret(apiKey), // "***xyz1"
  configured: !!apiKey,
});

// ❌ ERRADO:
return NextResponse.json({
  api_key: apiKey, // Expõe key completa!
});
```

---

### Rate Limiting

- [ ] Route tem rate limiting aplicado
- [ ] Usa limiter apropriado:
  - `rateLimitByUser` (100/min) para routes autenticadas gerais
  - `rateLimitAdmin` (50/min) para routes administrativas
  - `rateLimitByIP` (1000/min) para routes públicas
- [ ] Retorna erro 429 quando excede limite
- [ ] Inclui headers `X-RateLimit-*` e `Retry-After`

---

### Error Handling

- [ ] TODAS as operações async têm try-catch
- [ ] Erros NUNCA expõem stack traces
- [ ] Erros NUNCA expõem detalhes de infraestrutura (nomes de tabelas, IPs, etc)
- [ ] Loga erros com contexto suficiente para debug
- [ ] Retorna HTTP status code apropriado (400, 401, 403, 404, 500)

**Exemplo:**

```typescript
try {
  // ... operação
} catch (error) {
  console.error("[API Error]:", error); // Log detalhado
  return NextResponse.json(
    { error: "Failed to process request" }, // Mensagem genérica
    { status: 500 },
  );
}
```

---

### CORS e Security Headers

- [ ] Verifica que CORS está configurado corretamente em `next.config.js`
- [ ] Não adiciona `Access-Control-Allow-Origin: *` manualmente
- [ ] Headers de segurança estão presentes (via next.config.js):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`

---

### Audit Logging (para operações sensíveis)

- [ ] Se route cria/atualiza/deleta dados sensíveis, loga em `audit_logs`
- [ ] Inclui: `user_id`, `client_id`, `action`, `table_name`, `record_id`
- [ ] Inclui `old_data` e `new_data` para UPDATEs
- [ ] Usa `logAuditEvent()` helper

**Operações que DEVEM ter audit log:**

- Criar/editar/deletar usuários
- Atualizar secrets
- Mudanças de role
- Mudanças de configuração de cliente

---

### Performance

- [ ] Queries têm LIMIT para prevenir SELECT \*
- [ ] Se múltiplas queries independentes, usa `Promise.all()`
- [ ] Não faz queries em loops (N+1 problem)
- [ ] Índices apropriados existem nas colunas filtradas

---

### Documentation

- [ ] Adiciona comentário no topo explicando o propósito da route
- [ ] Documenta query params esperados
- [ ] Documenta body schema esperado
- [ ] Documenta possíveis error responses

---

## 🗄️ Checklist: Database Migration

Use este checklist ao criar migrations em `supabase/migrations/*.sql`.

### Schema Changes

- [ ] Migration tem nome descritivo (`YYYYMMDD_add_feature.sql`)
- [ ] Usa `IF NOT EXISTS` para CREATE TABLE/INDEX
- [ ] Usa `IF EXISTS` para DROP
- [ ] Adiciona `COMMENT ON` para documentar propósito

---

### RLS Policies

- [ ] TODA nova tabela tem RLS habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Policies isolam dados por `client_id` (via `user_client_id()` helper)
- [ ] Service role pode acessar quando necessário (`auth.role() = 'service_role'`)
- [ ] Testa que usuário de Client A não vê dados de Client B

**Template de RLS:**

```sql
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- SELECT: Apenas próprio tenant
CREATE POLICY "Users can view own client data"
  ON public.my_table
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Service role: Acesso total (webhook)
CREATE POLICY "Service role can access all"
  ON public.my_table
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

### Índices

- [ ] Adiciona índice em `client_id` se tabela multi-tenant
- [ ] Adiciona índice em colunas usadas em WHERE/ORDER BY
- [ ] Usa `CREATE INDEX IF NOT EXISTS`
- [ ] Usa índices parciais quando apropriado (`WHERE column IS NOT NULL`)

---

### Data Migration

- [ ] Se migra dados existentes, testa em staging PRIMEIRO
- [ ] Adiciona backup antes de data migration
- [ ] Usa transações para garantir atomicidade
- [ ] Valida integridade dos dados após migration

---

### Rollback Plan

- [ ] Documenta como reverter migration (criar `_revert.sql`)
- [ ] Se migration é irreversível (DROP TABLE), documenta na descrição

---

### Testing

- [ ] Testa migration localmente (`supabase db reset`)
- [ ] Valida que RLS policies funcionam (queries com diferentes usuários)
- [ ] Verifica performance (EXPLAIN ANALYZE para queries complexas)
- [ ] Aplica em staging antes de produção

---

## 🎨 Checklist: Frontend Changes

Use este checklist ao modificar código em `src/app/`, `src/components/`.

### Secrets e Credenciais

- [ ] NUNCA exibe secrets completos na UI
- [ ] Usa masked values (`***xyz1`)
- [ ] Não loga secrets em console (nem em development)

---

### Input Sanitization

- [ ] Sanitiza input antes de renderizar (prevenir XSS)
- [ ] Usa bibliotecas seguras (React escapa automaticamente em JSX)
- [ ] Se usa `dangerouslySetInnerHTML`, valida que HTML é seguro

---

### API Calls

- [ ] TODAS as chamadas de API têm error handling
- [ ] Usa `try-catch` ou `.catch()` em Promises
- [ ] Mostra mensagem de erro amigável ao usuário
- [ ] Não expõe detalhes técnicos em mensagens de erro

---

### Authentication

- [ ] Verifica sessão antes de renderizar conteúdo protegido
- [ ] Redireciona para `/login` se não autenticado
- [ ] Não mostra dados sensíveis antes de verificar auth

---

### Multi-Tenancy

- [ ] Não assume `client_id` fixo (usar da sessão)
- [ ] Não mostra dados de outros clientes (validar no backend!)

---

## 🚀 Checklist: Pre-Deploy

Execute este checklist COMPLETO antes de deploy em produção.

### Code Review

- [ ] TODOS os PRs foram revisados por outro desenvolvedor
- [ ] Reviewer validou security checklists aplicáveis
- [ ] Não há `TODO` ou `FIXME` relacionados a segurança

---

### Environment Variables

- [ ] `.env.example` atualizado com novas variáveis
- [ ] Produção tem TODAS as variáveis necessárias setadas
- [ ] Secrets estão no Supabase Vault (não em env vars)
- [ ] `NODE_ENV=production` está setado

---

### Migrations

- [ ] TODAS as migrations foram aplicadas em staging
- [ ] Staging validado manualmente (queries, RLS, etc)
- [ ] Backup do banco criado ANTES de aplicar em produção
- [ ] Plan de rollback documentado

---

### Testing

- [ ] Tests automatizados passam (se existirem)
- [ ] Testes manuais de fluxos críticos realizados
- [ ] Teste de auth/login funciona
- [ ] Teste de multi-tenancy (usuários de clientes diferentes)
- [ ] Teste de rate limiting (exceder limites)

---

### Security Scan

- [ ] Executar `npm audit` (sem vulnerabilidades HIGH/CRITICAL)
- [ ] Executar OWASP ZAP ou similar
- [ ] Verificar que `/api/debug/*` endpoints estão bloqueados
- [ ] Verificar que secrets NÃO aparecem em responses

---

### Monitoring

- [ ] Logs de erros configurados (Vercel, Datadog, etc)
- [ ] Alerts configurados para:
  - [ ] Erro 500 em API routes
  - [ ] Rate limiting excedido (possível ataque)
  - [ ] Tentativas de auth falhadas (brute force)
  - [ ] Webhook signature inválida (spoofing)

---

### Documentation

- [ ] `CLAUDE.md` atualizado com mudanças arquiteturais
- [ ] `README.md` atualizado se necessário
- [ ] Changelog atualizado (`CHANGELOG.md`)
- [ ] Documentação de API atualizada (se existir)

---

### Rollback Plan

- [ ] Backup do banco disponível
- [ ] Git tag criado para versão atual (antes do deploy)
- [ ] Documentado como reverter deploy (Vercel rollback)
- [ ] Testado rollback em staging

---

## 📊 Checklist: Post-Deploy

Execute este checklist IMEDIATAMENTE após deploy em produção.

### Smoke Tests

- [ ] Homepage carrega (https://uzzap.uzzai.com)
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] API routes críticas respondem (fazer 2-3 requests de teste)
- [ ] Webhook funciona (enviar mensagem de teste via WhatsApp)

---

### Monitoring

- [ ] Verificar logs por 10 minutos (nenhum erro crítico)
- [ ] Verificar métricas de performance (response time normal)
- [ ] Verificar rate limiting está ativo (headers presentes)

---

### Security Validation

- [ ] Testar que `/api/debug/env` retorna 404
- [ ] Testar que secrets NÃO aparecem em `/api/vault/secrets`
- [ ] Testar que RLS está funcionando (tentar acessar dados de outro cliente)

---

### Rollback (se necessário)

- [ ] Se >5% de erro rate, fazer rollback imediatamente
- [ ] Se vulnerabilidade detectada, fazer rollback e corrigir

---

## 🔍 Checklist: Security Review Trimestral

Execute este checklist a cada 3 meses.

### Dependency Audit

- [ ] `npm audit fix` executado
- [ ] Todas as dependências atualizadas para versões sem vulnerabilidades
- [ ] Dependências não usadas removidas

---

### Access Review

- [ ] Listar TODOS os usuários com role `admin` ou `client_admin`
- [ ] Validar que todos ainda devem ter acesso
- [ ] Remover usuários inativos (>90 dias sem login)

---

### Secrets Rotation

- [ ] Rotacionar API keys (OpenAI, Groq, Meta)
- [ ] Rotacionar Supabase service role key
- [ ] Rotacionar database passwords
- [ ] Atualizar secrets no Vault

---

### Log Analysis

- [ ] Revisar logs de tentativas de auth falhadas (brute force?)
- [ ] Revisar logs de rate limiting (ataques?)
- [ ] Revisar audit logs (operações suspeitas?)

---

### Pentest

- [ ] Executar pentest automatizado (OWASP ZAP)
- [ ] Contratar pentest manual (anual)
- [ ] Corrigir todas as vulnerabilidades encontradas

---

## 📝 Template de PR Description

Use este template ao criar Pull Requests que tocam código de segurança.

```markdown
## Descrição

[Descreva as mudanças]

## Security Checklist

- [ ] Autenticação validada
- [ ] Input validation implementada
- [ ] RLS policies testadas (se aplicável)
- [ ] Secrets NUNCA expostos
- [ ] Rate limiting aplicado
- [ ] Audit logging adicionado (se operação sensível)
- [ ] Testado em staging

## Vulnerabilidade Relacionada

Resolve: [VULN-XXX] (se aplicável)

## Testes Realizados

- [ ] Teste manual no staging
- [ ] Teste de multi-tenancy (Client A vs Client B)
- [ ] Teste de role permissions (user vs admin)
- [ ] Teste de rate limiting

## Rollback Plan

[Como reverter se necessário]
```

---

## 🚨 Red Flags - NÃO FAZER NUNCA

Se você vir qualquer um destes padrões no código, **PARE IMEDIATAMENTE** e corrija:

### 🔴 Secrets Expostos

```typescript
// ❌ NUNCA FAÇA ISSO:
return NextResponse.json({ api_key: process.env.OPENAI_API_KEY });
console.log("API Key:", apiKey);
```

### 🔴 SQL Injection

```typescript
// ❌ NUNCA FAÇA ISSO:
await query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 🔴 RLS Bypass sem Validação

```typescript
// ❌ NUNCA FAÇA ISSO:
const supabaseAdmin = createServiceRoleClient();
await supabaseAdmin.from("users").select("*"); // Sem filtro de client_id!
```

### 🔴 Auth sem Validação

```typescript
// ❌ NUNCA FAÇA ISSO:
export async function GET() {
  // Sem verificar auth!
  const data = await supabase.from("sensitive_data").select("*");
  return NextResponse.json(data);
}
```

### 🔴 Input sem Validação

```typescript
// ❌ NUNCA FAÇA ISSO:
const { name } = await request.json();
await supabase.from("users").insert({ name }); // Aceita qualquer coisa!
```

---

## 📚 Recursos Adicionais

### Documentação Interna

- `docs/security/VULNERABILITIES.md` - Lista de vulnerabilidades identificadas
- `docs/security/STRENGTHS.md` - Pontos fortes da implementação
- `docs/security/RECOMMENDATIONS.md` - Guia de implementação detalhado
- `docs/security/ACTION_PLAN.md` - Roadmap de correções

### Ferramentas

- OWASP ZAP: https://www.zaproxy.org/
- npm audit: `npm audit`
- Supabase RLS Testing: https://supabase.com/docs/guides/auth/row-level-security
- Mozilla Observatory: https://observatory.mozilla.org/

### Referências Externas

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Supabase Security: https://supabase.com/docs/guides/platform/going-into-prod
- Next.js Security: https://nextjs.org/docs/advanced-features/security-headers

---

**Última atualização:** 2025-11-18
**Mantenedor:** Equipe de Desenvolvimento
**Revisão:** Trimestral
