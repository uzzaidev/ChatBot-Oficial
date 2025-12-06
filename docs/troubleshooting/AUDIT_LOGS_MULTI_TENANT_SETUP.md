# Audit Logs Multi-Tenant - Guia de Configuração

## 📋 Resumo

Este guia documenta a implementação completa de **audit logs isolados por tenant** no sistema de chatbot SaaS. Cada cliente (tenant) verá apenas seus próprios logs de auditoria através de Row Level Security (RLS).

---

## 🚀 Passo 1: Aplicar Migration ao Banco de Dados

### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New query**
5. Copie todo o conteúdo do arquivo:
   ```
   migrations/20251121_fix_audit_logs_multi_tenant.sql
   ```
6. Cole no editor SQL
7. Clique em **Run** (ou pressione `Ctrl+Enter`)
8. Aguarde a confirmação de sucesso ✅

### Opção B: Via CLI do Supabase (Se configurado)

```bash
# No diretório raiz do projeto
supabase db push
```

### Verificação Pós-Migration

Execute esta query no SQL Editor para verificar se tudo foi criado:

```sql
-- Verificar tabela audit_logs
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'audit_logs'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'audit_logs';

-- Verificar views
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('recent_audit_activity', 'suspicious_audit_activity');
```

**Resultado esperado:**
- ✅ Tabela `audit_logs` com `client_id UUID` (não `tenant_id INTEGER`)
- ✅ 3 RLS policies ativas
- ✅ 2 views criadas
- ✅ Tabela antiga renomeada para `audit_logs_backup_poker_system`

---

## 🔧 Passo 2: Verificar Arquivos Criados

Certifique-se de que os seguintes arquivos existem no projeto:

### Backend (API + Lógica)
- ✅ `src/app/api/backend/audit-logs/route.ts` - Endpoint de API
- ✅ `src/lib/audit.ts` - Helpers para log de auditoria (já existia)
- ✅ `src/hooks/useAuditLogs.ts` - Hook React para frontend

### Frontend (UI)
- ✅ `src/components/AuditLogsViewer.tsx` - Componente de visualização

### Database
- ✅ `migrations/20251121_fix_audit_logs_multi_tenant.sql` - Migration aplicada

---

## 📱 Passo 3: Integrar UI no Dashboard

### Opção A: Adicionar Rota Separada `/dashboard/audit`

Crie o arquivo `src/app/dashboard/audit/page.tsx`:

```typescript
'use client'

import AuditLogsViewer from '@/components/AuditLogsViewer'

export default function AuditLogsPage() {
  return (
    <div className="container mx-auto p-6">
      <AuditLogsViewer
        autoRefresh={true}
        refreshInterval={10000}
        limit={100}
      />
    </div>
  )
}
```

Adicione link no menu de navegação (onde estiver definido):

```typescript
<NavLink href="/dashboard/audit">
  Audit Logs
</NavLink>
```

### Opção B: Adicionar Aba no Backend Monitor Existente

Edite `src/app/dashboard/backend/page.tsx`:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Shield } from 'lucide-react'
import AuditLogsViewer from '@/components/AuditLogsViewer'

// No início do componente
return (
  <div className="container mx-auto p-6">
    <Tabs defaultValue="execution-logs" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="execution-logs">
          <Activity className="h-4 w-4 mr-2" />
          Execution Logs
        </TabsTrigger>
        <TabsTrigger value="audit-logs">
          <Shield className="h-4 w-4 mr-2" />
          Audit Logs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="execution-logs">
        {/* Código existente do Backend Monitor */}
      </TabsContent>

      <TabsContent value="audit-logs">
        <AuditLogsViewer
          autoRefresh={true}
          refreshInterval={10000}
          limit={100}
        />
      </TabsContent>
    </Tabs>
  </div>
)
```

---

## 🧪 Passo 4: Testar Isolamento Multi-Tenant

### Teste 1: Criar Log de Auditoria

Execute este código em qualquer API route (exemplo: `src/app/api/test-audit/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  await logAuditEvent({
    userId: 'user-uuid-here',
    userEmail: 'admin@example.com',
    userRole: 'admin',
    clientId: 'client-uuid-here', // ⚠️ IMPORTANTE: Client ID do usuário logado
    action: 'CREATE',
    resourceType: 'user',
    resourceId: 'new-user-id',
    endpoint: '/api/test-audit',
    method: 'GET',
    changes: { test: true },
    status: 'success'
  }, request)

  return NextResponse.json({ success: true })
}
```

Acesse `http://localhost:3000/api/test-audit` para criar um log de teste.

### Teste 2: Verificar Isolamento

1. Faça login com **Usuário A** (cliente/tenant 1)
2. Acesse `/dashboard/audit` (ou aba Audit Logs)
3. Verifique que aparecem apenas logs do **cliente 1**
4. Faça logout e login com **Usuário B** (cliente/tenant 2)
5. Acesse `/dashboard/audit` novamente
6. Verifique que aparecem apenas logs do **cliente 2**

**Resultado esperado**: ✅ Cada usuário vê apenas logs do próprio tenant (RLS funcionando)

### Teste 3: Verificar Filtros

No UI de Audit Logs, teste:
- ✅ Filtro por ação (CREATE, READ, UPDATE, DELETE)
- ✅ Filtro por status (success, failure)
- ✅ Busca por email, recurso, endpoint
- ✅ Auto-refresh (logs novos aparecem automaticamente)

---

## 🔐 Como Funciona o Isolamento Multi-Tenant

### 1. RLS Policy no Banco de Dados

```sql
CREATE POLICY "Users can view own client audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );
```

**Explicação:**
- Quando um usuário faz query em `audit_logs`, o PostgreSQL automaticamente adiciona `WHERE client_id = <client_id_do_usuario>`
- Não há como um usuário ver logs de outro tenant, mesmo modificando a query

### 2. API Endpoint com RLS Ativo

```typescript
// ⚠️ IMPORTANTE: Usa anon key (não service role) para ativar RLS
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { Authorization: `Bearer ${token}` }
  }
})

// Query automaticamente filtrada por RLS
const { data } = await supabase.from('audit_logs').select('*')
```

**Por que não usar service role?**
- Service role **bypassa RLS** (vê todos os logs de todos os tenants)
- Anon key + token de autenticação **ativa RLS** (vê apenas logs do próprio tenant)

### 3. Frontend Hook

```typescript
const { logs, total } = useAuditLogs({
  autoRefresh: true,
  refreshInterval: 10000
})
```

**Fluxo:**
1. Hook obtém token de autenticação do Supabase
2. Faz `fetch('/api/backend/audit-logs', { headers: { Authorization: `Bearer ${token}` }})`
3. API verifica autenticação e cria Supabase client com RLS ativo
4. PostgreSQL aplica RLS policy automaticamente
5. Retorna apenas logs do tenant do usuário

---

## 📊 Usando Audit Logs no Código

### Exemplo 1: Log de Criação de Usuário

```typescript
import { logCreate } from '@/lib/audit'

// Em /api/admin/users (POST)
const newUser = await createUser(data)

await logCreate('user', newUser.id, data, {
  userId: adminUser.id,
  userEmail: adminUser.email,
  userRole: adminUser.role,
  clientId: adminUser.client_id,
  endpoint: '/api/admin/users',
  method: 'POST',
  request
})
```

### Exemplo 2: Log de Atualização de Secret

```typescript
import { logUpdate } from '@/lib/audit'

// Em /api/vault/secrets/:id (PUT)
const oldSecret = await getSecret(secretId)
const newSecret = await updateSecret(secretId, newData)

await logUpdate('secret', secretId, oldSecret, newSecret, {
  userId: user.id,
  userEmail: user.email,
  clientId: user.client_id,
  endpoint: `/api/vault/secrets/${secretId}`,
  method: 'PUT',
  request
})
```

### Exemplo 3: Log de Deleção

```typescript
import { logDelete } from '@/lib/audit'

// Em /api/admin/users/:id (DELETE)
const user = await getUser(userId)
await deleteUser(userId)

await logDelete('user', userId, user, {
  userId: adminUser.id,
  userEmail: adminUser.email,
  clientId: adminUser.client_id,
  endpoint: `/api/admin/users/${userId}`,
  method: 'DELETE',
  request
})
```

### Exemplo 4: Log de Falha

```typescript
import { logFailure } from '@/lib/audit'

try {
  await riskyOperation()
} catch (error) {
  await logFailure('UPDATE', 'config', error.message, {
    userId: user.id,
    userEmail: user.email,
    clientId: user.client_id,
    resourceId: configId,
    endpoint: '/api/config',
    method: 'PUT',
    request
  })
  throw error
}
```

---

## 🗑️ Cleanup de Logs Antigos

### Manual via API

```bash
curl -X POST http://localhost:3000/api/backend/audit-logs/cleanup \
  -H "Content-Type: application/json" \
  -d '{"retention_days": 90}'
```

### Automático via Cron Job

Crie arquivo `src/app/api/cron/cleanup-audit-logs/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.rpc('cleanup_old_audit_logs', {
    retention_days: 90
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    deleted_count: data,
    timestamp: new Date().toISOString()
  })
}
```

Configure cron job (Vercel Cron, GitHub Actions, ou serviço externo):

```yaml
# vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-audit-logs",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## ❓ FAQ

### 1. Como adicionar audit logs em operações com service role?

Quando você precisa usar service role (para bypass de RLS), adicione audit log manualmente:

```typescript
// Operação com service role (bypass RLS)
const supabase = createServiceClient()
await supabase.from('sensitive_table').update(data).eq('id', id)

// Log de auditoria (não bypassa RLS)
await logUpdate('sensitive_table', id, oldData, newData, {
  userId: user.id,
  clientId: user.client_id,
  // ...
})
```

### 2. Como ver logs de todos os tenants (super admin)?

Crie um RLS policy específico para super admins:

```sql
CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );
```

### 3. Como fazer backup de audit logs antes de cleanup?

```bash
# Via Supabase CLI
supabase db dump --file=audit_logs_backup.sql --data-only --schema=public --table=audit_logs

# Via SQL direto
COPY (SELECT * FROM audit_logs WHERE created_at < now() - INTERVAL '90 days')
TO '/tmp/audit_logs_backup.csv' WITH CSV HEADER;
```

### 4. Audit logs consomem muito espaço?

Sim, audit logs podem crescer rapidamente. **Boas práticas:**

- ✅ Retention policy de 90 dias (padrão)
- ✅ Sanitização automática de dados sensíveis (já implementado em `audit.ts`)
- ✅ Índices otimizados para queries (já criados na migration)
- ✅ Particionamento de tabela (futuro, se necessário):

```sql
-- Exemplo de particionamento por mês (opcional, para grandes volumes)
CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

---

## 🎯 Checklist Final

Antes de considerar completo, verifique:

- [ ] Migration aplicada no Supabase ✅
- [ ] Tabela `audit_logs` com `client_id UUID` ✅
- [ ] RLS policies ativas (3 policies) ✅
- [ ] Endpoint `/api/backend/audit-logs` funcionando ✅
- [ ] UI integrada no dashboard (rota ou aba) ✅
- [ ] Teste de isolamento multi-tenant passando ✅
- [ ] Logs sendo criados em operações sensíveis ✅
- [ ] Filtros e busca funcionando ✅
- [ ] Auto-refresh ativo ✅
- [ ] Cleanup agendado (opcional) ⏳

---

## 📚 Referências

- **Migration**: `migrations/20251121_fix_audit_logs_multi_tenant.sql`
- **API**: `src/app/api/backend/audit-logs/route.ts`
- **Hook**: `src/hooks/useAuditLogs.ts`
- **Component**: `src/components/AuditLogsViewer.tsx`
- **Helpers**: `src/lib/audit.ts`
- **Docs**: `docs/security/SPRINT2_SUMMARY.md` (contexto original)

---

## 🆘 Troubleshooting

### Erro: "Missing NEXT_PUBLIC_SUPABASE_URL"

- ✅ Verifique `.env.local` tem todas as variáveis
- ✅ Reinicie o dev server (`npm run dev`)

### Erro: "Invalid or expired token"

- ✅ Faça logout e login novamente
- ✅ Verifique que `user_profiles` table tem `client_id` para o usuário

### Logs não aparecem no UI

- ✅ Verifique que `client_id` está sendo passado ao criar logs
- ✅ Verifique RLS policies com query acima
- ✅ Abra DevTools → Network → Verifique response de `/api/backend/audit-logs`

### Vejo logs de outros tenants (⚠️ CRÍTICO)

- ❌ **NUNCA deve acontecer!**
- Verifique se API está usando `supabaseAnonKey` (não `SUPABASE_SERVICE_ROLE_KEY`)
- Verifique RLS policies estão habilitadas: `ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;`

---

**✅ Implementação Completa - Audit Logs Multi-Tenant com RLS**
