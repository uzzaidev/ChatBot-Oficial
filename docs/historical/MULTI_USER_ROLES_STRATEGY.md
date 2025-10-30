# Estratégia Multi-Usuários com Roles

## Visão Geral

Este documento descreve a estratégia para implementar múltiplos usuários compartilhando o mesmo `client_id` com diferentes níveis de permissão (roles).

**Status**: 🚧 Planejado para implementação futura
**Prioridade**: Média
**Fase**: 4 (Multi-User Management)

---

## Contexto Atual

### Sistema Atual (Fase 3)
- ✅ Cada usuário tem um `client_id` único
- ✅ Relação 1:1 entre usuário e cliente
- ✅ Sistema de autenticação via Supabase Auth
- ✅ RLS (Row Level Security) implementado
- ✅ Perfil de usuário em `user_profiles`

### Estrutura de Banco de Dados
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',  -- Já existe, mas não é usado
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Objetivo da Fase 4

Permitir que **múltiplos usuários compartilhem o mesmo `client_id`**, mas com diferentes níveis de permissão:

- **Admin Principal** - Dono da conta, acesso total
- **Admin** - Gerencia usuários e configurações
- **Editor** - Gerencia conversas e mensagens
- **Viewer** - Apenas visualização (read-only)

---

## Arquitetura Proposta

### 1. Tabela de Roles

Criar enum para tipos de role:

```sql
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

ALTER TABLE user_profiles
ALTER COLUMN role TYPE user_role USING role::user_role;
```

**Definição de Roles**:

| Role | Descrição | Permissões |
|------|-----------|-----------|
| `owner` | Dono da conta | Todas as permissões + billing + deletar conta |
| `admin` | Administrador | Gerenciar usuários, configurações, variáveis de ambiente |
| `editor` | Editor | Gerenciar conversas, enviar mensagens, transferir atendimentos |
| `viewer` | Visualizador | Apenas visualizar conversas e métricas (read-only) |

---

### 2. Tabela de Convites

Para adicionar novos usuários ao cliente, criar sistema de convites:

```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID REFERENCES user_profiles(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_email ON user_invitations(email);
```

---

### 3. Matriz de Permissões

**Operações por Role**:

| Operação | Owner | Admin | Editor | Viewer |
|----------|-------|-------|--------|--------|
| Ver conversas | ✅ | ✅ | ✅ | ✅ |
| Enviar mensagens | ✅ | ✅ | ✅ | ❌ |
| Transferir atendimento | ✅ | ✅ | ✅ | ❌ |
| Ver métricas | ✅ | ✅ | ✅ | ✅ |
| Editar variáveis de ambiente | ✅ | ✅ | ❌ | ❌ |
| Convidar usuários | ✅ | ✅ | ❌ | ❌ |
| Remover usuários | ✅ | ✅ (exceto owner) | ❌ | ❌ |
| Alterar roles | ✅ | ❌ | ❌ | ❌ |
| Billing / Plano | ✅ | ❌ | ❌ | ❌ |
| Deletar conta | ✅ | ❌ | ❌ | ❌ |

---

## Implementação

### Fase 4.1: Convite de Usuários

#### Backend

**API Route: `/api/team/invitations`**

```typescript
// POST /api/team/invitations
// Body: { email: string, role: 'admin' | 'editor' | 'viewer' }
// Requires: role = 'owner' | 'admin'

1. Validar se usuário atual é owner ou admin
2. Gerar token único (UUID)
3. Criar registro em user_invitations
4. Enviar email com link de aceite: /accept-invitation?token=XXX
5. Expiração: 7 dias
```

**API Route: `/api/team/accept-invitation`**

```typescript
// POST /api/team/accept-invitation
// Body: { token: string, password: string }

1. Validar token não expirado
2. Criar usuário no Supabase Auth
3. Adicionar client_id do convite ao user_metadata
4. Atualizar user_invitations.accepted_at
5. Criar user_profile com role especificada
6. Redirecionar para /dashboard
```

#### Frontend

**Nova página: `/dashboard/team`**

- Listar usuários do cliente
- Botão "Convidar Usuário" (modal)
- Editar roles (apenas owner)
- Remover usuários (owner/admin)

**Nova página: `/accept-invitation`**

- Formulário de criação de conta via convite
- Campos: nome completo, senha
- Email pré-preenchido (vem do token)

---

### Fase 4.2: Controle de Permissões

#### Middleware Updates

Adicionar verificação de role no middleware:

```typescript
// middleware.ts

// Buscar role do usuário
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single()

// Injetar role no header para API routes
response.headers.set('x-user-role', profile.role)
```

#### Helper Functions

Criar funções de verificação de permissão:

```typescript
// lib/permissions.ts

export const canManageUsers = (role: string) => {
  return ['owner', 'admin'].includes(role)
}

export const canEditVariables = (role: string) => {
  return ['owner', 'admin'].includes(role)
}

export const canSendMessages = (role: string) => {
  return ['owner', 'admin', 'editor'].includes(role)
}

export const canDeleteAccount = (role: string) => {
  return role === 'owner'
}
```

#### API Routes Protection

Adicionar verificação em cada API route:

```typescript
// api/vault/secrets/route.ts

export async function PUT(request: NextRequest) {
  const role = request.headers.get('x-user-role')

  if (!canEditVariables(role)) {
    return NextResponse.json(
      { error: 'Permissão negada' },
      { status: 403 }
    )
  }

  // ... resto do código
}
```

---

### Fase 4.3: RLS Updates

Atualizar políticas RLS para considerar role:

```sql
-- Exemplo: Apenas owner/admin podem ver secrets
CREATE POLICY "Only admins can view secrets"
  ON vault.secrets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

---

## UI/UX

### Dashboard de Team Management

**Componentes Necessários**:

1. **TeamMembersList** - Lista de membros do time
   - Avatar + Nome + Email
   - Badge de role
   - Ações: Editar role, Remover

2. **InviteUserModal** - Modal de convite
   - Input: Email
   - Select: Role
   - Botão: Enviar Convite

3. **RoleBadge** - Badge visual para role
   - owner: azul
   - admin: verde
   - editor: amarelo
   - viewer: cinza

---

## Migrações SQL

### Migration 009: Multi-User Roles

```sql
-- ========================================
-- MIGRATION 009: MULTI-USER ROLES
-- ========================================

-- 1. Criar enum de roles
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- 2. Atualizar tabela user_profiles
ALTER TABLE user_profiles
ALTER COLUMN role TYPE user_role USING
  CASE
    WHEN role = 'admin' THEN 'owner'::user_role
    ELSE 'viewer'::user_role
  END;

-- 3. Setar primeiro usuário de cada cliente como owner
UPDATE user_profiles p1
SET role = 'owner'
WHERE id = (
  SELECT id FROM user_profiles p2
  WHERE p2.client_id = p1.client_id
  ORDER BY created_at ASC
  LIMIT 1
);

-- 4. Criar tabela de convites
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID REFERENCES user_profiles(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_client_id ON user_invitations(client_id);

-- 5. RLS para user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their client"
  ON user_invitations
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND client_id = user_invitations.client_id
      AND role IN ('owner', 'admin')
    )
  );

-- 6. Função helper para verificar role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      role = required_role
      OR (required_role = 'admin' AND role = 'owner')
    )
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.has_role IS 'Verifica se usuário autenticado tem role específica';
```

---

## Considerações de Segurança

1. **Owner Protection**: Impedir remoção ou alteração de role do owner
2. **Self-Demotion**: Impedir que admins rebaixem a si mesmos
3. **Last Owner**: Garantir que sempre exista pelo menos 1 owner por cliente
4. **Token Security**: Tokens de convite devem ser únicos e expirar
5. **Email Verification**: Convites devem ser enviados para emails válidos
6. **Audit Log**: Registrar mudanças de roles e convites enviados

---

## Fluxo de Convite (Diagrama)

```
┌──────────────┐
│ Owner/Admin  │
│ Dashboard    │
└──────┬───────┘
       │
       │ 1. Clica "Convidar Usuário"
       ▼
┌──────────────────────────────┐
│ Modal de Convite             │
│ - Email: user@example.com    │
│ - Role: [admin/editor/viewer]│
└──────┬───────────────────────┘
       │
       │ 2. POST /api/team/invitations
       ▼
┌──────────────────────────────┐
│ Backend                       │
│ - Gera token                  │
│ - Salva em user_invitations   │
│ - Envia email                 │
└──────┬───────────────────────┘
       │
       │ 3. Email enviado
       ▼
┌──────────────────────────────┐
│ Novo Usuário                  │
│ Recebe email com link         │
│ /accept-invitation?token=XXX  │
└──────┬───────────────────────┘
       │
       │ 4. Clica no link
       ▼
┌──────────────────────────────┐
│ Página de Aceite             │
│ - Email (pré-preenchido)     │
│ - Nome                        │
│ - Senha                       │
└──────┬───────────────────────┘
       │
       │ 5. POST /api/team/accept-invitation
       ▼
┌──────────────────────────────┐
│ Backend                       │
│ - Valida token                │
│ - Cria usuário (Supabase Auth)│
│ - Cria user_profile com role  │
│ - Marca convite como aceito   │
└──────┬───────────────────────┘
       │
       │ 6. Redirect para /dashboard
       ▼
┌──────────────────────────────┐
│ Dashboard do Novo Usuário    │
│ Acesso com permissões do role│
└──────────────────────────────┘
```

---

## Checklist de Implementação

### Backend
- [ ] Criar enum `user_role`
- [ ] Atualizar coluna `role` em `user_profiles`
- [ ] Criar tabela `user_invitations`
- [ ] Criar API `/api/team/invitations` (POST, GET, DELETE)
- [ ] Criar API `/api/team/accept-invitation` (POST)
- [ ] Criar API `/api/team/members` (GET, PATCH, DELETE)
- [ ] Implementar funções de permissão em `lib/permissions.ts`
- [ ] Atualizar middleware para injetar role no header
- [ ] Proteger API routes com verificação de permissão
- [ ] Implementar envio de email de convite

### Frontend
- [ ] Criar página `/dashboard/team`
- [ ] Criar componente `TeamMembersList`
- [ ] Criar componente `InviteUserModal`
- [ ] Criar componente `RoleB adge`
- [ ] Criar página `/accept-invitation`
- [ ] Atualizar `/dashboard/settings` para mostrar apenas ações permitidas
- [ ] Adicionar toasts de feedback de ações
- [ ] Esconder botões/seções baseado em role

### Database
- [ ] Executar Migration 009
- [ ] Atualizar RLS policies
- [ ] Testar políticas de segurança
- [ ] Criar função `has_role()` para uso em RLS

### Testing
- [ ] Testar fluxo de convite completo
- [ ] Testar permissões de cada role
- [ ] Testar proteção de owner
- [ ] Testar expiração de tokens
- [ ] Testar RLS policies

---

## Notas de Implementação

1. **Backward Compatibility**: Usuários atuais devem ser migrados para role `owner`
2. **Email Service**: Usar Gmail API (já configurado) ou Resend para emails de convite
3. **UI Conditional**: Usar hook `useRole()` para esconder/mostrar elementos baseado em permissão
4. **Error Messages**: Mensagens claras quando usuário não tem permissão
5. **Audit Trail**: Considerar adicionar tabela `audit_logs` para rastreabilidade

---

## Exemplos de Uso

### Verificar Permissão no Frontend

```typescript
'use client'

import { useRole } from '@/hooks/useRole'
import { canManageUsers } from '@/lib/permissions'

export default function TeamPage() {
  const { role, loading } = useRole()

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      <h1>Time</h1>

      {canManageUsers(role) && (
        <Button onClick={() => setShowInviteModal(true)}>
          Convidar Usuário
        </Button>
      )}

      <TeamMembersList />
    </div>
  )
}
```

### Verificar Permissão no Backend

```typescript
// API route protegida

import { canManageUsers } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role')

  if (!canManageUsers(role)) {
    return NextResponse.json(
      { error: 'Apenas administradores podem convidar usuários' },
      { status: 403 }
    )
  }

  // ... lógica de convite
}
```

---

## Priorização

**Fase 4.1** (Alta prioridade):
- Sistema de convites
- Adicionar usuários ao cliente

**Fase 4.2** (Média prioridade):
- Controle de permissões granular
- Proteção de API routes

**Fase 4.3** (Baixa prioridade):
- Audit logs
- Notificações de mudanças de role

---

## Referências

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Multi-Tenancy Patterns](https://supabase.com/docs/guides/auth/row-level-security#policies)
- [Role-Based Access Control (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control)

---

**Última atualização**: 2025-10-29
**Autor**: Sistema de Configurações do Usuário (Fase 3)
