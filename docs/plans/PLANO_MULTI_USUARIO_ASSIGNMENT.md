# Plano Técnico: Sistema Multi-Usuário com Assignment de Conversas

**Status:** 📋 Planejamento
**Prioridade:** Alta
**Complexidade:** Alta
**Tempo Estimado:** -

---

## 1. Visão Geral

Transformar o sistema atual de **1 tenant = 1 usuário** para **1 tenant = múltiplos usuários/agentes**, onde cada conversa pode ser atribuída a um agente específico, com sistema completo de RBAC (Role-Based Access Control).

### Objetivo
Permitir que uma empresa (tenant) tenha múltiplos atendentes, cada um com:
- ✅ Login individual
- ✅ Acesso apenas às suas conversas atribuídas
- ✅ Roles diferentes (Admin, Supervisor, Agente)
- ✅ Dashboard personalizado
- ✅ Transferência de conversas entre agentes

---

## 2. Arquitetura Atual vs. Nova

### 2.1 Estado Atual

```
┌─────────────────────────────────────────┐
│ TENANT (Cliente/Empresa)                │
│ - id: UUID                              │
│ - name: "Empresa X"                     │
│                                         │
│ └─ user_profiles (1 único usuário)      │
│    - email: admin@empresa.com           │
│    - acesso a TODAS as conversas        │
└─────────────────────────────────────────┘
```

### 2.2 Nova Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ TENANT (Cliente/Empresa)                                    │
│ - id: UUID                                                  │
│ - name: "Empresa X"                                         │
│                                                             │
│ └─ USERS (Múltiplos usuários/agentes)                       │
│    ├─ User 1: admin@empresa.com (Admin)                     │
│    ├─ User 2: supervisor@empresa.com (Supervisor)           │
│    ├─ User 3: agente1@empresa.com (Agente)                  │
│    └─ User 4: agente2@empresa.com (Agente)                  │
│                                                             │
│ └─ CONVERSATIONS (Conversas atribuídas)                     │
│    ├─ Conversa A → Atribuída a User 3                       │
│    ├─ Conversa B → Atribuída a User 4                       │
│    └─ Conversa C → Não atribuída (fila)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Roles e Permissões

### 3.1 Hierarquia de Roles

| Role | Permissões | Acesso a Conversas |
|------|------------|-------------------|
| **super_admin** | Acesso a TODOS os tenants | Todas |
| **admin** | Gerenciar usuários, configurações do tenant | Todas do tenant |
| **supervisor** | Ver conversas de todos os agentes, transferir | Todas do tenant |
| **agent** | Apenas suas conversas atribuídas | Apenas atribuídas |
| **viewer** | Visualização (sem edição) | Apenas atribuídas |

### 3.2 Matriz de Permissões

| Ação | super_admin | admin | supervisor | agent | viewer |
|------|-------------|-------|------------|-------|--------|
| Criar/deletar usuários | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configurar bot | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver todas conversas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver conversas atribuídas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Responder mensagens | ✅ | ✅ | ✅ | ✅ | ❌ |
| Transferir conversas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Upload de documentos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver relatórios | ✅ | ✅ | ✅ | Apenas seus | Apenas seus |

---

## 4. Database Schema Changes

### 4.1 Modificar user_profiles (Adicionar Role)

```sql
-- Migration 1: Adicionar role a user_profiles
ALTER TABLE user_profiles
ADD COLUMN role TEXT NOT NULL DEFAULT 'agent'
  CHECK (role IN ('super_admin', 'admin', 'supervisor', 'agent', 'viewer'));

-- Atualizar usuários existentes para admin
UPDATE user_profiles SET role = 'admin' WHERE role = 'agent';
```

### 4.2 Modificar conversations (Adicionar assigned_to)

```sql
-- Migration 2: Assignment de conversas
-- A tabela conversations já existe, apenas adicionar campos

ALTER TABLE conversations
ADD COLUMN assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN assigned_at TIMESTAMPTZ,
ADD COLUMN assigned_by UUID REFERENCES user_profiles(id),
ADD COLUMN assignment_history JSONB DEFAULT '[]';

-- Índices para performance
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_conversations_client_assigned ON conversations(client_id, assigned_to);

-- Comentários
COMMENT ON COLUMN conversations.assigned_to IS 'Usuário responsável pela conversa';
COMMENT ON COLUMN conversations.assignment_history IS 'Histórico de transferências: [{"from": "uuid", "to": "uuid", "at": "timestamp"}]';
```

### 4.3 Nova Tabela: conversation_assignments (Histórico)

```sql
-- Migration 3: Rastrear todas as atribuições
CREATE TABLE conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  assigned_from UUID REFERENCES user_profiles(id),
  assigned_to UUID REFERENCES user_profiles(id),
  assigned_by UUID NOT NULL REFERENCES user_profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_assignments_conversation ON conversation_assignments(conversation_id);
CREATE INDEX idx_assignments_to ON conversation_assignments(assigned_to);

-- RLS
ALTER TABLE conversation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments from their tenant"
  ON conversation_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN user_profiles up ON up.client_id = c.client_id
      WHERE c.id = conversation_assignments.conversation_id
        AND up.id = auth.uid()
    )
  );
```

### 4.4 Atualizar RLS Policies

```sql
-- Migration 4: RLS baseado em role e assignment

-- CONVERSATIONS: Agentes veem apenas suas conversas
DROP POLICY IF EXISTS "Service role can access all conversations" ON conversations;

-- Super Admin: vê tudo
CREATE POLICY "Super admins can view all conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Admin/Supervisor: vê todas do tenant
CREATE POLICY "Admins and supervisors can view tenant conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND client_id = conversations.client_id
        AND role IN ('admin', 'supervisor')
    )
  );

-- Agent/Viewer: vê apenas atribuídas
CREATE POLICY "Agents can view assigned conversations"
  ON conversations FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND client_id = conversations.client_id
        AND role IN ('admin', 'supervisor', 'super_admin')
    )
  );

-- Inserção: Service role (webhook) + usuários do tenant
CREATE POLICY "Service role can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Atualização: Apenas responsável ou admin/supervisor
CREATE POLICY "Users can update assigned conversations"
  ON conversations FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND client_id = conversations.client_id
        AND role IN ('admin', 'supervisor', 'super_admin')
    )
  );

-- MESSAGES: Mesma lógica das conversas
CREATE POLICY "Users can view messages from accessible conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE assigned_to = auth.uid()
        OR client_id IN (
          SELECT client_id FROM user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'supervisor', 'super_admin')
        )
    )
  );
```

---

## 5. Backend Implementation

### 5.1 Helper Functions (RLS)

```sql
-- Migration 5: Funções auxiliares para RLS

-- Obter role do usuário logado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Verificar se usuário tem permissão
CREATE OR REPLACE FUNCTION user_can_access_conversation(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations c
    JOIN user_profiles up ON up.id = auth.uid()
    WHERE c.id = conv_id
      AND (
        c.assigned_to = auth.uid()
        OR up.role IN ('admin', 'supervisor', 'super_admin')
        OR (up.role = 'super_admin')
      )
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 5.2 API Routes

#### 5.2.1 Assign Conversation

```typescript
// src/app/api/conversations/[id]/assign/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { userId, reason } = await request.json()
  const conversationId = params.id

  // 1. Verificar permissões (admin, supervisor)
  const { data: currentUser } = await supabase
    .from('user_profiles')
    .select('id, role, client_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (!currentUser || !['admin', 'supervisor', 'super_admin'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 2. Verificar se usuário alvo existe no mesmo tenant
  const { data: targetUser } = await supabase
    .from('user_profiles')
    .select('id, client_id')
    .eq('id', userId)
    .single()

  if (!targetUser || targetUser.client_id !== currentUser.client_id) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 })
  }

  // 3. Obter conversa atual
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, assigned_to, client_id')
    .eq('id', conversationId)
    .single()

  if (!conversation || conversation.client_id !== currentUser.client_id) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // 4. Atualizar conversa
  const { error: updateError } = await supabase
    .from('conversations')
    .update({
      assigned_to: userId,
      assigned_at: new Date().toISOString(),
      assigned_by: currentUser.id
    })
    .eq('id', conversationId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 5. Registrar histórico
  await supabase.from('conversation_assignments').insert({
    conversation_id: conversationId,
    assigned_from: conversation.assigned_to,
    assigned_to: userId,
    assigned_by: currentUser.id,
    reason
  })

  return NextResponse.json({ success: true })
}
```

#### 5.2.2 List Assigned Conversations

```typescript
// src/app/api/conversations/assigned/route.ts
export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, client_id')
    .eq('id', user.user.id)
    .single()

  let query = supabase
    .from('conversations')
    .select(`
      *,
      messages (
        content,
        created_at,
        direction
      )
    `)
    .order('last_update', { ascending: false })

  // Filtro baseado em role
  if (profile?.role === 'agent' || profile?.role === 'viewer') {
    // Apenas conversas atribuídas
    query = query.eq('assigned_to', profile.id)
  } else if (profile?.role === 'admin' || profile?.role === 'supervisor') {
    // Todas do tenant
    query = query.eq('client_id', profile.client_id)
  }
  // super_admin vê tudo (sem filtro)

  const { data: conversations, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversations })
}
```

#### 5.2.3 Transfer Conversation

```typescript
// src/app/api/conversations/[id]/transfer/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { toUserId, reason } = await request.json()

  // Lógica similar ao assign, mas:
  // 1. Notificar usuário anterior
  // 2. Notificar novo usuário
  // 3. Adicionar mensagem no chat indicando transferência
  // 4. Atualizar status para 'transferido'

  // ...
}
```

---

## 6. Frontend Implementation

### 6.1 Dashboard: Visão por Role

#### Admin/Supervisor Dashboard

```tsx
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  const { user } = useUser()
  const isAdminOrSupervisor = ['admin', 'supervisor'].includes(user.role)

  return (
    <div className="space-y-6">
      {/* KPIs Gerais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>Total de Conversas</CardHeader>
          <CardContent>{totalConversations}</CardContent>
        </Card>
        <Card>
          <CardHeader>Conversas Ativas</CardHeader>
          <CardContent>{activeConversations}</CardContent>
        </Card>
        <Card>
          <CardHeader>Agentes Online</CardHeader>
          <CardContent>{onlineAgents}</CardContent>
        </Card>
        <Card>
          <CardHeader>Tempo Médio de Resposta</CardHeader>
          <CardContent>{avgResponseTime}</CardContent>
        </Card>
      </div>

      {/* Distribuição de Conversas por Agente */}
      {isAdminOrSupervisor && (
        <Card>
          <CardHeader>Distribuição de Conversas</CardHeader>
          <CardContent>
            <table>
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Ativas</th>
                  <th>Finalizadas (hoje)</th>
                  <th>Tempo Médio</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.activeCount}</td>
                    <td>{agent.resolvedToday}</td>
                    <td>{agent.avgTime}</td>
                    <td>
                      <button onClick={() => viewAgentConversations(agent.id)}>
                        Ver Conversas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Lista de Conversas */}
      <ConversationList
        showAllConversations={isAdminOrSupervisor}
        showAssignmentControls={isAdminOrSupervisor}
      />
    </div>
  )
}
```

#### Agent Dashboard

```tsx
// src/app/dashboard/agent/page.tsx
export default function AgentDashboardPage() {
  const { conversations } = useAssignedConversations()

  return (
    <div className="space-y-6">
      {/* KPIs do Agente */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>Minhas Conversas Ativas</CardHeader>
          <CardContent>{myActiveCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>Finalizadas Hoje</CardHeader>
          <CardContent>{myResolvedToday}</CardContent>
        </Card>
        <Card>
          <CardHeader>Tempo Médio de Resposta</CardHeader>
          <CardContent>{myAvgResponseTime}</CardContent>
        </Card>
      </div>

      {/* Apenas conversas atribuídas */}
      <Card>
        <CardHeader>Minhas Conversas</CardHeader>
        <CardContent>
          <ConversationList
            conversations={conversations}
            showAssignmentControls={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6.2 Assignment UI Component

```tsx
// src/components/ConversationAssignmentDialog.tsx
export function ConversationAssignmentDialog({
  conversationId,
  currentAssignedTo
}: {
  conversationId: string
  currentAssignedTo?: string
}) {
  const { agents } = useTeamMembers()
  const [selectedAgent, setSelectedAgent] = useState(currentAssignedTo)
  const [reason, setReason] = useState('')

  const handleAssign = async () => {
    await fetch(`/api/conversations/${conversationId}/assign`, {
      method: 'POST',
      body: JSON.stringify({
        userId: selectedAgent,
        reason
      })
    })
  }

  return (
    <Dialog>
      <DialogTrigger>
        <button>Atribuir Conversa</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Conversa a Agente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de Agente */}
          <Select value={selectedAgent} onChange={setSelectedAgent}>
            <option value="">Sem atribuição</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.activeConversations} ativas)
              </option>
            ))}
          </Select>

          {/* Motivo (opcional) */}
          <Input
            placeholder="Motivo da atribuição (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {/* Ações */}
          <div className="flex gap-2">
            <button onClick={handleAssign}>Atribuir</button>
            <button onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 6.3 Conversation List com Assignment

```tsx
// src/components/ConversationList.tsx
export function ConversationList({
  showAllConversations,
  showAssignmentControls
}: {
  showAllConversations: boolean
  showAssignmentControls: boolean
}) {
  const { conversations } = useConversations({
    all: showAllConversations
  })

  return (
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Última Mensagem</th>
          <th>Status</th>
          {showAllConversations && <th>Atribuído a</th>}
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {conversations.map(conv => (
          <tr key={conv.id}>
            <td>{conv.name || conv.phone}</td>
            <td>{conv.last_message}</td>
            <td>{conv.status}</td>
            {showAllConversations && (
              <td>
                {conv.assigned_to ? (
                  <UserAvatar userId={conv.assigned_to} />
                ) : (
                  <span className="text-muted-foreground">Não atribuído</span>
                )}
              </td>
            )}
            <td>
              <button onClick={() => openConversation(conv.id)}>
                Abrir
              </button>
              {showAssignmentControls && (
                <ConversationAssignmentDialog
                  conversationId={conv.id}
                  currentAssignedTo={conv.assigned_to}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 7. Auto-Assignment (Distribuição Automática)

### 7.1 Estratégias de Atribuição

```typescript
// src/lib/assignment/strategies.ts

export type AssignmentStrategy =
  | 'round-robin'    // Revezamento
  | 'least-busy'     // Menos conversas ativas
  | 'skill-based'    // Baseado em habilidades/tags
  | 'manual'         // Apenas manual

export const autoAssignConversation = async (
  conversationId: string,
  clientId: string,
  strategy: AssignmentStrategy = 'least-busy'
): Promise<string | null> => {
  const supabase = createServerClient()

  // 1. Obter agentes disponíveis (online, com capacity)
  const { data: agents } = await supabase
    .from('user_profiles')
    .select(`
      id,
      full_name,
      conversations_assigned:conversations!assigned_to(count)
    `)
    .eq('client_id', clientId)
    .eq('role', 'agent')
    .eq('status', 'online')
    .order('created_at', { ascending: true })

  if (!agents || agents.length === 0) {
    return null // Nenhum agente disponível
  }

  let selectedAgent: string

  switch (strategy) {
    case 'least-busy':
      // Agente com menos conversas ativas
      const sortedByLoad = agents.sort(
        (a, b) => a.conversations_assigned.count - b.conversations_assigned.count
      )
      selectedAgent = sortedByLoad[0].id
      break

    case 'round-robin':
      // Obter último agente atribuído (da tabela de config)
      const { data: config } = await supabase
        .from('client_assignment_config')
        .select('last_assigned_agent_index')
        .eq('client_id', clientId)
        .single()

      const nextIndex = (config?.last_assigned_agent_index || 0) + 1
      selectedAgent = agents[nextIndex % agents.length].id

      // Atualizar índice
      await supabase
        .from('client_assignment_config')
        .upsert({
          client_id: clientId,
          last_assigned_agent_index: nextIndex
        })
      break

    case 'manual':
    default:
      return null
  }

  // 2. Atribuir conversa
  await supabase
    .from('conversations')
    .update({
      assigned_to: selectedAgent,
      assigned_at: new Date().toISOString()
    })
    .eq('id', conversationId)

  return selectedAgent
}
```

### 7.2 Integrar no Webhook

```typescript
// src/app/api/webhook/[clientId]/route.ts (MODIFICAR)

// ... dentro do webhook, após criar conversa

// Se conversa nova, auto-assign
if (conversationJustCreated) {
  const assignedTo = await autoAssignConversation(
    conversationId,
    clientId,
    clientConfig.assignment_strategy || 'least-busy'
  )

  if (assignedTo) {
    // Notificar agente (via Realtime ou email)
    await notifyAgentNewConversation(assignedTo, conversationId)
  }
}
```

---

## 8. Notifications (Realtime)

### 8.1 Supabase Realtime Channels

```typescript
// src/hooks/useConversationNotifications.ts
export const useConversationNotifications = (userId: string) => {
  const supabase = createBrowserClient()

  useEffect(() => {
    // Canal para conversas atribuídas a mim
    const channel = supabase
      .channel('conversation-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `assigned_to=eq.${userId}`
        },
        (payload) => {
          // Nova conversa atribuída!
          toast({
            title: 'Nova conversa atribuída',
            description: `Cliente: ${payload.new.name}`
          })

          // Tocar som
          playNotificationSound()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
```

### 8.2 Browser Notifications

```typescript
// src/lib/notifications/browser.ts
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

export const showBrowserNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/badge.png'
    })
  }
}
```

---

## 9. Team Management (Gerenciar Usuários)

### 9.1 Dashboard: Team Page

```tsx
// src/app/dashboard/team/page.tsx
export default function TeamPage() {
  const { users } = useTeamMembers()

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1>Equipe</h1>
        <button onClick={() => setInviteDialogOpen(true)}>
          Convidar Usuário
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Conversas Ativas</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>
                <Select value={user.role} onChange={(role) => updateUserRole(user.id, role)}>
                  <option value="admin">Admin</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="agent">Agente</option>
                  <option value="viewer">Visualizador</option>
                </Select>
              </td>
              <td>
                <span className={user.status === 'online' ? 'text-green-500' : 'text-gray-400'}>
                  {user.status}
                </span>
              </td>
              <td>{user.active_conversations_count}</td>
              <td>
                <button onClick={() => editUser(user)}>Editar</button>
                <button onClick={() => deleteUser(user.id)}>Remover</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Dialog de Convite */}
      <InviteUserDialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} />
    </div>
  )
}
```

### 9.2 Invite Flow

```typescript
// src/app/api/team/invite/route.ts
export async function POST(request: NextRequest) {
  const { email, role, full_name } = await request.json()
  const supabase = createServerClient()

  // 1. Verificar se usuário que convida é admin
  const { data: inviter } = await supabase
    .from('user_profiles')
    .select('client_id, role')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (!inviter || inviter.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 2. Criar convite (tabela user_invites já existe - ver tabelas.md)
  const inviteToken = crypto.randomUUID()

  await supabase.from('user_invites').insert({
    email,
    role,
    client_id: inviter.client_id,
    invited_by: inviter.id,
    invite_token: inviteToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })

  // 3. Enviar email de convite
  await sendInviteEmail({
    to: email,
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`,
    teamName: inviter.client_id // Buscar nome real do cliente
  })

  return NextResponse.json({ success: true })
}
```

---

## 10. Reporting (Relatórios por Agente)

### 10.1 Métricas por Agente

```typescript
// src/app/api/reports/agent/[userId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const supabase = createServerClient()

  const metrics = await supabase.rpc('get_agent_metrics', {
    p_user_id: params.userId,
    p_start_date: startDate,
    p_end_date: endDate
  })

  return NextResponse.json(metrics.data)
}
```

```sql
-- Function: get_agent_metrics
CREATE OR REPLACE FUNCTION get_agent_metrics(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_conversations', COUNT(DISTINCT c.id),
    'active_conversations', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active'),
    'resolved_conversations', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'resolved'),
    'avg_response_time_seconds', AVG(
      EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))
    ),
    'total_messages_sent', COUNT(m.id) FILTER (WHERE m.direction = 'outbound'),
    'customer_satisfaction', AVG(c.satisfaction_rating)
  ) INTO result
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  LEFT JOIN messages m1 ON m1.conversation_id = c.id AND m1.direction = 'inbound'
  LEFT JOIN messages m2 ON m2.conversation_id = c.id AND m2.direction = 'outbound'
    AND m2.created_at > m1.created_at
  WHERE c.assigned_to = p_user_id
    AND c.created_at BETWEEN p_start_date AND p_end_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 11. Migration Checklist

- [ ] **Migration 1:** Adicionar `role` a `user_profiles`
- [ ] **Migration 2:** Adicionar `assigned_to`, `assigned_at`, `assigned_by` a `conversations`
- [ ] **Migration 3:** Criar tabela `conversation_assignments`
- [ ] **Migration 4:** Atualizar RLS policies (conversations, messages)
- [ ] **Migration 5:** Criar helper functions (`get_user_role`, `user_can_access_conversation`)
- [ ] **Migration 6:** Criar tabela `client_assignment_config` (para round-robin)
- [ ] **Migration 7:** Criar function `get_agent_metrics`

---

## 12. Implementation Order

### Phase 1: Database & Backend (Semana 1)
1. Criar todas as migrations
2. Atualizar RLS policies
3. Testar acesso por role (SQL direto)
4. Criar API routes (assign, transfer, list)

### Phase 2: Frontend - Admin/Supervisor (Semana 2)
1. Dashboard com visão geral
2. Team management page
3. Assignment UI
4. Transfer UI
5. Relatórios por agente

### Phase 3: Frontend - Agent (Semana 3)
1. Agent dashboard (apenas conversas atribuídas)
2. Notificações realtime
3. Browser notifications
4. Status online/offline

### Phase 4: Auto-Assignment & Optimization (Semana 4)
1. Implementar estratégias de auto-assignment
2. Integrar no webhook
3. Configuração de estratégia no dashboard
4. Otimizar queries (índices, caching)

---

## 13. Testing Scenarios

### 13.1 Role-Based Access

| Cenário | Agent | Supervisor | Admin |
|---------|-------|------------|-------|
| Ver conversa atribuída a si | ✅ | ✅ | ✅ |
| Ver conversa de outro agente | ❌ | ✅ | ✅ |
| Atribuir conversa | ❌ | ✅ | ✅ |
| Criar/deletar usuário | ❌ | ❌ | ✅ |
| Configurar bot | ❌ | ❌ | ✅ |

### 13.2 Auto-Assignment

- [ ] Nova conversa é atribuída ao agente com menos carga
- [ ] Round-robin distribui uniformemente
- [ ] Agentes offline não recebem atribuições
- [ ] Fallback para fila se nenhum agente disponível

### 13.3 Notifications

- [ ] Agente recebe notificação ao ser atribuído
- [ ] Browser notification funciona (com permissão)
- [ ] Som de notificação toca
- [ ] Realtime atualiza lista de conversas instantaneamente

---

## 14. Future Enhancements

- **Skill-based routing:** Atribuir baseado em tags/habilidades
- **SLA tracking:** Alertas se tempo de resposta exceder limite
- **Chatbot → Human handoff:** Transferência inteligente do bot para agente
- **Capacity limits:** Agente pode definir limite de conversas simultâneas
- **Shift management:** Horários de trabalho por agente
- **Mobile app:** Notificações push nativas

---

**Criado em:** 2025-12-04
**Autor:** Claude Code
**Versão:** 1.0
