# Plano: Atendimento Humano Manual via Dashboard

**Status:** 📝 Planejamento
**Prioridade:** Alta
**Versão:** 1.0
**Data:** 2025-11-22

---

## 📋 Índice

1. [Contexto e Motivação](#contexto-e-motivação)
2. [Funcionalidades Solicitadas](#funcionalidades-solicitadas)
3. [Arquitetura da Solução](#arquitetura-da-solução)
4. [Mudanças no Banco de Dados](#mudanças-no-banco-de-dados)
5. [Mudanças no Chatflow](#mudanças-no-chatflow)
6. [Mudanças no Dashboard UI](#mudanças-no-dashboard-ui)
7. [API Endpoints](#api-endpoints)
8. [Fluxo de Interação](#fluxo-de-interação)
9. [Implementação por Etapas](#implementação-por-etapas)
10. [Testes](#testes)
11. [Considerações de UX](#considerações-de-ux)
12. [Riscos e Mitigações](#riscos-e-mitigações)

---

## 🎯 Contexto e Motivação

### Problema Atual

Atualmente, uma vez que uma conversa é iniciada, o bot sempre responde automaticamente. Não há forma fácil de:
- **Pausar** o atendimento do bot para uma conversa específica
- **Assumir manualmente** uma conversa que precisa de atenção humana
- **Filtrar** conversas que estão aguardando atendimento humano
- **Voltar** ao atendimento por bot após resolver um problema

### Solução Proposta

Sistema de **alternância manual de status** que permite:
1. Operador humano pode assumir uma conversa clicando em um botão no dashboard
2. Bot para de responder automaticamente quando status = `"humano"` ou `"transferido"`
3. Operador responde diretamente pelo dashboard (feature futura)
4. Operador pode devolver a conversa ao bot quando terminar
5. Filtros para visualizar conversas por status

---

## ✨ Funcionalidades Solicitadas

### 1. Controle de Status na Conversa

**Localização:** Página de conversa individual (`/dashboard/conversations/[phone]`)

**Componente:** Dropdown ou botão de alternância no topo da conversa

**Estados possíveis:**
- `bot` - Atendimento automático (padrão)
- `humano` - Atendimento humano ativo
- `transferido` - Transferido para humano (aguardando primeira resposta)

**Ações:**
- `Bot → Humano` - Operador assume a conversa
- `Humano → Bot` - Operador devolve ao bot
- `Transferido → Bot` - Cancela transferência

### 2. Node de Verificação no Chatflow

**Localização:** Início do chatflow, logo após `filterStatusUpdates`

**Nome do Node:** `checkHumanHandoffStatus`

**Lógica:**
```typescript
if (customerStatus === 'humano' || customerStatus === 'transferido') {
  // Para processamento
  // Não gera resposta AI
  // Registra que mensagem foi recebida
  return { skipBot: true }
}
// Continua fluxo normal
```

### 3. Filtros na Lista de Conversas

**Localização:** `/dashboard/conversations` (lista de conversas)

**Filtros:**
- 🤖 **Todas** - Mostra todas as conversas
- ✅ **Bot** - Apenas conversas atendidas por bot (`status = 'bot'`)
- ⏳ **Aguardando Humano** - Conversas transferidas mas sem resposta (`status = 'transferido'`)
- 👤 **Em Atendimento Humano** - Conversas atendidas por humano (`status = 'humano'`)

**Indicadores Visuais:**
- Badge colorido ao lado do nome do cliente
- Contador de conversas por status
- Ordenação: Prioridade para "Aguardando Humano"

### 4. ~~Envio de Mensagens Manuais~~ ✅ JÁ IMPLEMENTADO

**Status:** ✅ **Já existe e funciona!**

**Localização:** `/dashboard/conversations/[phone]`

**Funcionalidade atual:**
- Campo de envio manual já implementado
- Mensagens são enviadas via WhatsApp
- Registradas no histórico
- **Nenhuma mudança necessária nesta parte**

---

## 🏗️ Arquitetura da Solução

### Componentes Envolvidos

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD UI                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ Lista Conversas │    │  Conversa Individual         │   │
│  │                 │    │  ┌────────────────────────┐  │   │
│  │ [Filtro Status] │    │  │ Dropdown Status        │  │   │
│  │  • Todas        │    │  │  Bot / Humano          │  │   │
│  │  • Bot          │    │  └────────────────────────┘  │   │
│  │  • Aguardando   │    │                              │   │
│  │  • Humano       │◄───┤  [Histórico de Mensagens]   │   │
│  └─────────────────┘    │                              │   │
│                         │  ┌────────────────────────┐  │   │
│                         │  │ Campo Enviar Mensagem  │  │   │
│                         │  │ (se status = humano)   │  │   │
│                         │  └────────────────────────┘  │   │
│                         └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API ROUTES                             │
├─────────────────────────────────────────────────────────────┤
│  PUT  /api/customers/[phone]/status                         │
│  POST /api/customers/[phone]/message                        │
│  GET  /api/conversations?status=humano                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CHATFLOW                                │
├─────────────────────────────────────────────────────────────┤
│  1. Filter Status Updates                                   │
│  2. Parse Message                                            │
│  ──────────────────────────────────────────────────────     │
│  3. Check Human Handoff Status  ← NOVO NODE                 │
│     • Se status = 'humano' → PARA AQUI                      │
│     • Se status = 'transferido' → PARA AQUI                 │
│     • Se status = 'bot' → CONTINUA                          │
│  ──────────────────────────────────────────────────────────  │
│  4. Check/Create Customer                                    │
│  5. Normalize Message                                        │
│  ... (resto do fluxo)                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
├─────────────────────────────────────────────────────────────┤
│  clientes_whatsapp                                           │
│    • status: 'bot' | 'humano' | 'transferido'               │
│    • transferred_at: timestamp (quando foi transferido)     │
│    • transferred_by: uuid (quem transferiu)                 │
│                                                              │
│  n8n_chat_histories                                          │
│    • message.type: 'human' | 'ai' | 'system'                │
│      (já existe 'human', usar para msgs do operador)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Mudanças no Banco de Dados

### Migration: `20251122_add_human_handoff_fields.sql`

```sql
-- Adicionar campos para controle de atendimento humano
ALTER TABLE clientes_whatsapp
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transferred_by UUID REFERENCES auth.users(id);

-- Índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_clientes_status
ON clientes_whatsapp(status)
WHERE status IN ('humano', 'transferido');

-- Comentários
COMMENT ON COLUMN clientes_whatsapp.transferred_at
IS 'Timestamp da última transferência para atendimento humano';

COMMENT ON COLUMN clientes_whatsapp.transferred_by
IS 'ID do usuário que transferiu para atendimento humano';

-- Atualizar RLS policies (se necessário)
-- Garantir que usuários possam atualizar status de clientes do mesmo client_id
```

### Campos Existentes (sem mudanças)

```sql
-- clientes_whatsapp.status já existe:
-- Valores: 'bot' | 'waiting' | 'human' (legado) | 'transferido' (novo)

-- n8n_chat_histories.message já suporta type: 'human'
-- Será usado para mensagens enviadas pelo operador
```

---

## 🔄 Mudanças no Chatflow

### Node 3: `checkHumanHandoffStatus` (NOVO)

**Localização:** `src/nodes/checkHumanHandoffStatus.ts`

**Código:**

```typescript
export interface CheckHumanHandoffInput {
  phone: string
  clientId: string
}

export interface CheckHumanHandoffOutput {
  skipBot: boolean
  customerStatus: string
  reason?: string
}

/**
 * NODE 3: Check Human Handoff Status
 *
 * Verifica se a conversa está em atendimento humano.
 * Se sim, para o processamento do bot.
 */
export const checkHumanHandoffStatus = async (
  input: CheckHumanHandoffInput
): Promise<CheckHumanHandoffOutput> => {
  const { phone, clientId } = input

  // Buscar status do cliente
  const { data: customer, error } = await supabase
    .from('clientes_whatsapp')
    .select('status')
    .eq('telefone', phone)
    .eq('client_id', clientId)
    .single()

  if (error || !customer) {
    // Se cliente não existe, será criado depois com status 'bot'
    return {
      skipBot: false,
      customerStatus: 'bot'
    }
  }

  const status = customer.status

  // Se está em atendimento humano, para o bot
  if (status === 'humano' || status === 'transferido') {
    return {
      skipBot: true,
      customerStatus: status,
      reason: `Conversa em atendimento ${status === 'humano' ? 'humano ativo' : 'aguardando humano'}`
    }
  }

  // Continua fluxo normal
  return {
    skipBot: false,
    customerStatus: status
  }
}
```

**Integração no Chatflow:**

```typescript
// src/flows/chatbotFlow.ts

// NODE 3: Check Human Handoff Status
logger.logNodeStart('3. Check Human Handoff Status', { phone: parsedMessage.phone })

const handoffCheck = await checkHumanHandoffStatus({
  phone: parsedMessage.phone,
  clientId: config.id
})

logger.logNodeSuccess('3. Check Human Handoff Status', handoffCheck)

// Se está em atendimento humano, para aqui
if (handoffCheck.skipBot) {
  logger.finishExecution('skipped_human_handoff')

  // OPCIONAL: Salvar mensagem do usuário no histórico mesmo sem responder
  await saveChatMessage({
    phone: parsedMessage.phone,
    message: parsedMessage.content,
    type: 'user',
    clientId: config.id
  })

  return {
    success: true,
    skipped: true,
    reason: handoffCheck.reason
  }
}

// Continua com NODE 4: Check/Create Customer
// ...
```

---

## 🎨 Mudanças no Dashboard UI

### 1. Componente: StatusToggle

**Arquivo:** `src/components/StatusToggle.tsx`

```typescript
interface StatusToggleProps {
  phone: string
  currentStatus: 'bot' | 'humano' | 'transferido'
  onStatusChange: (newStatus: string) => void
}

export const StatusToggle = ({ phone, currentStatus, onStatusChange }: StatusToggleProps) => {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)

    try {
      const response = await fetch(`/api/customers/${phone}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')

      onStatusChange(newStatus)
      toast.success('Status atualizado com sucesso')
    } catch (error) {
      toast.error('Erro ao atualizar status')
    } finally {
      setIsUpdating(false)
    }
  }

  const statusOptions = [
    { value: 'bot', label: '🤖 Bot', color: 'bg-blue-500' },
    { value: 'humano', label: '👤 Humano', color: 'bg-green-500' },
    { value: 'transferido', label: '⏳ Aguardando', color: 'bg-yellow-500' }
  ]

  return (
    <div className="flex items-center gap-2">
      <Label>Status:</Label>
      <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isUpdating}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${option.color}`} />
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

### 2. Atualizar Página de Conversa

**Arquivo:** `src/app/dashboard/conversations/[phone]/page.tsx`

```typescript
// Adicionar StatusToggle no topo da conversa

<div className="flex justify-between items-center mb-4 p-4 border-b">
  <h1 className="text-2xl font-bold">{customerName}</h1>

  <StatusToggle
    phone={phone}
    currentStatus={conversation.status}
    onStatusChange={(newStatus) => {
      // Atualizar estado local
      setConversation(prev => ({ ...prev, status: newStatus }))
    }}
  />
</div>
```

### 3. Filtros na Lista de Conversas

**Arquivo:** `src/components/ConversationsIndexClient.tsx`

```typescript
// Adicionar estado de filtro
const [statusFilter, setStatusFilter] = useState<string>('all')

// Hook de conversas já existe, adicionar filtro
const { conversations, loading } = useConversations({
  clientId,
  enableRealtime: true,
  statusFilter: statusFilter !== 'all' ? statusFilter : undefined
})

// Calcular contadores por status
const botCount = conversations?.filter(c => c.status === 'bot').length || 0
const humanCount = conversations?.filter(c => c.status === 'humano').length || 0
const waitingCount = conversations?.filter(c => c.status === 'transferido').length || 0

// UI do Filtro (adicionar antes do ConversationList)
<div className="p-4 border-b border-silver-200">
  <Tabs value={statusFilter} onValueChange={setStatusFilter}>
    <TabsList className="grid w-full grid-cols-4">
      <TabsTrigger value="all">
        Todas {conversations?.length || 0}
      </TabsTrigger>
      <TabsTrigger value="bot">
        🤖 Bot {botCount}
      </TabsTrigger>
      <TabsTrigger value="transferido">
        ⏳ Aguardando {waitingCount}
      </TabsTrigger>
      <TabsTrigger value="humano">
        👤 Humano {humanCount}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</div>
```

### 4. Badge de Status na Lista

**Arquivo:** `src/components/ConversationList.tsx`

```typescript
const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    bot: { label: 'Bot', color: 'bg-blue-100 text-blue-800' },
    humano: { label: 'Humano', color: 'bg-green-100 text-green-800' },
    transferido: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800' }
  }

  const { label, color } = config[status] || config.bot

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

// Usar no item da lista
<div className="flex justify-between items-center">
  <span>{conversation.name}</span>
  <StatusBadge status={conversation.status} />
</div>
```

---

## 🔌 API Endpoints

### 1. PUT `/api/customers/[phone]/status`

**Arquivo:** `src/app/api/customers/[phone]/status/route.ts`

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { phone: string } }
) {
  try {
    const { status } = await request.json()
    const { phone } = params

    // Validar status
    if (!['bot', 'humano', 'transferido'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      )
    }

    // Verificar autenticação
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar client_id do usuário
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Atualizar status do cliente
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Se mudando para humano/transferido, registrar timestamp e usuário
    if (status === 'humano' || status === 'transferido') {
      updateData.transferred_at = new Date().toISOString()
      updateData.transferred_by = user.id
    }

    const { error } = await supabase
      .from('clientes_whatsapp')
      .update(updateData)
      .eq('telefone', phone)
      .eq('client_id', profile.client_id)

    if (error) {
      console.error('[api/customers/status] Erro ao atualizar:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status,
      message: 'Status atualizado com sucesso'
    })
  } catch (error) {
    console.error('[api/customers/status] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

### 2. ~~POST `/api/customers/[phone]/message`~~ ✅ NÃO NECESSÁRIO

**Status:** ✅ **Envio manual já funciona!**

Já existe funcionalidade implementada em `/dashboard/conversations/[phone]` que permite enviar mensagens manuais. Nenhuma mudança necessária nesta parte.

### 3. Atualizar Hook `useConversations`

**Arquivo:** `src/hooks/useConversations.ts` (atualizar)

```typescript
interface UseConversationsOptions {
  clientId: string
  enableRealtime?: boolean
  statusFilter?: string // NOVO: filtro por status
}

export function useConversations({
  clientId,
  enableRealtime = false,
  statusFilter
}: UseConversationsOptions) {
  // Construir query params
  const queryParams = new URLSearchParams()
  if (statusFilter) {
    queryParams.append('status', statusFilter)
  }

  const queryString = queryParams.toString()
  const url = `/api/conversations${queryString ? `?${queryString}` : ''}`

  // Resto do hook...
}
```

### 4. GET `/api/conversations?status=humano`

**Arquivo:** `src/app/api/conversations/route.ts` (atualizar)

```typescript
// Adicionar suporte para filtro por status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') // 'bot' | 'humano' | 'transferido'

  // ... autenticação ...

  let query = supabase
    .from('clientes_whatsapp')
    .select('*')
    .eq('client_id', profile.client_id)

  // Aplicar filtro de status se fornecido
  if (statusFilter && ['bot', 'humano', 'transferido'].includes(statusFilter)) {
    query = query.eq('status', statusFilter)
  }

  const { data: customers, error } = await query
    .order('updated_at', { ascending: false })
    .limit(50)

  // ... resto do código ...
}
```

---

## 🔄 Fluxo de Interação

### Cenário 1: Operador Assume Conversa Manualmente

```
1. Usuário envia mensagem via WhatsApp
   └─> Webhook recebe mensagem

2. Chatflow processa
   └─> NODE 3: Check Human Handoff Status
       └─> Status = 'bot' (ainda não assumido)
       └─> Continua fluxo normal
       └─> Bot responde

3. Operador visualiza conversa no dashboard
   └─> Abre /dashboard/conversations/5551234567
   └─> Vê histórico de mensagens

4. Operador decide assumir manualmente
   └─> Clica dropdown Status
   └─> Seleciona "👤 Humano"
   └─> PUT /api/customers/5551234567/status { status: 'humano' }
   └─> DB atualiza: status='humano', transferred_at=NOW(), transferred_by=user.id

5. Usuário envia nova mensagem
   └─> Webhook recebe mensagem
   └─> NODE 3: Check Human Handoff Status
       └─> Status = 'humano'
       └─> skipBot = true
       └─> PARA AQUI (não processa bot)
   └─> Mensagem salva no histórico
   └─> Bot NÃO responde

6. Operador responde via dashboard
   └─> Digita mensagem no campo manual
   └─> Clica "Enviar"
   └─> POST /api/customers/5551234567/message { message: '...' }
   └─> Envia via WhatsApp API
   └─> Salva no histórico como type='user' (mensagem humana)

7. Operador finaliza atendimento
   └─> Clica dropdown Status
   └─> Seleciona "🤖 Bot"
   └─> PUT /api/customers/5551234567/status { status: 'bot' }
   └─> Próximas mensagens voltam ao bot
```

### Cenário 2: Bot Transfere Automaticamente

```
1. Usuário pede transferência
   └─> "Quero falar com humano"

2. Bot detecta tool call: transferir_atendimento
   └─> Executa handleHumanHandoff
   └─> Atualiza status para 'transferido'
   └─> Envia email para operador
   └─> Bot para de responder

3. Conversa aparece com badge "⏳ Aguardando" no dashboard
   └─> Filtro "Aguardando Humano" mostra essa conversa

4. Operador abre conversa
   └─> Vê que foi transferida automaticamente
   └─> Muda status para "👤 Humano" para assumir
   └─> Responde via campo manual

5. Após resolver, operador decide:
   OPÇÃO A: Voltar ao bot
   └─> Muda para "🤖 Bot"

   OPÇÃO B: Manter humano
   └─> Deixa em "👤 Humano"
```

---

## 📝 Implementação por Etapas

### Etapa 1: Database & Backend (Prioridade Alta)

**Duração estimada:** 2-3 horas

- [ ] Criar migration `20251122_add_human_handoff_fields.sql`
- [ ] Aplicar migration no Supabase
- [ ] Criar node `checkHumanHandoffStatus.ts`
- [ ] Integrar node no chatflow (entre node 2 e 3)
- [ ] Criar API `PUT /api/customers/[phone]/status`
- [ ] Atualizar hook `useConversations` para aceitar filtro de status
- [ ] Atualizar API `GET /api/conversations` (filtro por status)

**Teste:** Usar Postman/curl para testar APIs

**NOTA:** ~~API `POST /api/customers/[phone]/message`~~ não é necessária - envio manual já funciona!

### Etapa 2: Dashboard UI Básico (Prioridade Alta)

**Duração estimada:** 3-4 horas

- [ ] Criar componente `StatusToggle.tsx`
- [ ] Integrar `StatusToggle` na página `/dashboard/conversations/[phone]`
- [ ] Testar mudança de status (bot → humano → bot)
- [ ] Verificar que bot para de responder quando status = humano

**Teste:** Enviar mensagens WhatsApp e verificar comportamento

### Etapa 3: Filtros e Indicadores Visuais (Prioridade Alta)

**Duração estimada:** 2-3 horas

- [ ] Criar componente `StatusBadge.tsx`
- [ ] Adicionar tabs de filtro na lista de conversas
- [ ] Implementar contadores por status
- [ ] Adicionar badges na lista de conversas
- [ ] Ordenar "Aguardando Humano" no topo

**Teste:** Criar conversas com diferentes status e testar filtros

### Etapa 5: Melhorias de UX (Prioridade Baixa)

**Duração estimada:** 2-3 horas

- [ ] Adicionar notificação quando conversa é transferida
- [ ] Adicionar tooltip explicativo no campo de envio manual
- [ ] Adicionar confirmação antes de voltar ao bot
- [ ] Adicionar histórico de quem assumiu/devolveu conversa
- [ ] Adicionar tempo decorrido desde transferência

---

## 🧪 Testes

### Testes Unitários

**Node: checkHumanHandoffStatus**

```typescript
describe('checkHumanHandoffStatus', () => {
  it('retorna skipBot=true quando status=humano', async () => {
    const result = await checkHumanHandoffStatus({
      phone: '5551234567',
      clientId: 'client-uuid'
    })

    expect(result.skipBot).toBe(true)
    expect(result.customerStatus).toBe('humano')
  })

  it('retorna skipBot=false quando status=bot', async () => {
    const result = await checkHumanHandoffStatus({
      phone: '5551234567',
      clientId: 'client-uuid'
    })

    expect(result.skipBot).toBe(false)
    expect(result.customerStatus).toBe('bot')
  })
})
```

### Testes de Integração

**Chatflow**

1. Criar cliente com status='humano'
2. Enviar mensagem via webhook simulado
3. Verificar que bot NÃO gera resposta
4. Verificar que mensagem é salva no histórico

**API**

1. Testar PUT /api/customers/[phone]/status com status válido
2. Testar PUT com status inválido (deve retornar 400)
3. Testar POST /api/customers/[phone]/message
4. Verificar que mensagem é enviada via WhatsApp
5. Verificar que mensagem é salva no histórico

### Testes E2E (Manual)

**Fluxo completo:**

1. ✅ Enviar mensagem no WhatsApp
2. ✅ Bot responde automaticamente
3. ✅ Abrir conversa no dashboard
4. ✅ Mudar status para "Humano"
5. ✅ Enviar nova mensagem no WhatsApp
6. ✅ Verificar que bot NÃO responde
7. ✅ Enviar resposta manual via dashboard
8. ✅ Verificar que mensagem chega no WhatsApp
9. ✅ Mudar status de volta para "Bot"
10. ✅ Enviar mensagem no WhatsApp
11. ✅ Verificar que bot volta a responder

---

## 🎨 Considerações de UX

### Indicadores Visuais Claros

- **Cores distintas** para cada status:
  - 🤖 Bot: Azul
  - 👤 Humano: Verde
  - ⏳ Aguardando: Amarelo

- **Badges** sempre visíveis na lista de conversas

- **Contador** de conversas por status nas tabs

### Feedback Imediato

- Toast notifications ao mudar status
- Loading states em todos os botões
- Confirmação visual de envio de mensagem

### Prevenção de Erros

- Campo de envio desabilitado quando status=bot (com explicação)
- Confirmação antes de voltar ao bot se há conversas pendentes
- Indicação clara de última mensagem (usuário vs operador vs bot)

### Acessibilidade

- Tooltips explicativos
- Atalhos de teclado (Ctrl+Enter para enviar)
- Contraste adequado nas cores de badges

---

## ⚠️ Riscos e Mitigações

### Risco 1: Mensagens Perdidas

**Problema:** Usuário envia mensagem enquanto operador está mudando status

**Mitigação:**
- Sempre salvar mensagem do usuário no histórico (mesmo sem responder)
- Notificar operador de novas mensagens recebidas
- Timestamp claro de quando cada mensagem foi recebida

### Risco 2: Confusão entre "Transferido" e "Humano"

**Problema:** Status similares podem confundir operadores

**Mitigação:**
- Labels claros e distintos
- Tooltip explicando diferença:
  - "Transferido" = Bot transferiu automaticamente, aguardando primeira resposta humana
  - "Humano" = Operador assumiu ativamente a conversa
- Fluxo simples: Transferido → Humano (automático ao responder)

### Risco 3: Operador Esquece de Voltar ao Bot

**Problema:** Conversas ficam em "Humano" indefinidamente

**Mitigação:**
- Mostrar tempo decorrido desde última mensagem
- Sugerir voltar ao bot após X horas de inatividade
- Filtro para ver conversas "Humano" antigas

### Risco 4: Performance com Muitos Filtros

**Problema:** Query lenta ao filtrar por status

**Mitigação:**
- Índice criado na migration: `idx_clientes_status`
- Limitar resultados (max 50 conversas por página)
- Paginação se necessário

### Risco 5: RLS Policies

**Problema:** Usuário pode alterar status de cliente de outro tenant

**Mitigação:**
- API sempre verifica `client_id` do usuário
- Queries sempre incluem filtro por `client_id`
- RLS policies na tabela `clientes_whatsapp`

---

## 🚀 Rollout

### Fase 1: Desenvolvimento & Testes (Semana 1)

- Implementar Etapas 1-3
- Testes internos com dados de teste
- Ajustes de bugs

### Fase 2: Beta com Cliente Piloto (Semana 2)

- Deploy em produção com feature flag
- Habilitar para 1 cliente específico
- Coletar feedback
- Monitorar logs e performance

### Fase 3: Rollout Gradual (Semana 3)

- Habilitar para 25% dos clientes
- Monitorar métricas:
  - Taxa de uso do atendimento manual
  - Tempo médio em status "Humano"
  - Satisfação do cliente
- Ajustes baseados em feedback

### Fase 4: GA (General Availability) (Semana 4)

- Habilitar para 100% dos clientes
- Documentação completa
- Treinamento para operadores
- Melhorias contínuas (Etapas 4-5)

---

## 📚 Próximos Passos

1. **Revisar** este plano com time técnico
2. **Estimar** tempo real de desenvolvimento
3. **Criar issues** no GitHub para cada etapa
4. **Definir** prioridades (pode começar pela Etapa 1)
5. **Implementar** seguindo ordem das etapas

---

## 📖 Referências

- [CLAUDE.md](../../CLAUDE.md) - Documentação principal do projeto
- [docs/tables/tabelas.md](../../tables/tabelas.md) - Schema do banco de dados
- [src/flows/chatbotFlow.ts](../../../src/flows/chatbotFlow.ts) - Chatflow atual
- [src/nodes/handleHumanHandoff.ts](../../../src/nodes/handleHumanHandoff.ts) - Transferência automática existente

---

**Documento criado por:** Claude Code
**Data:** 2025-11-22
**Versão:** 1.0
