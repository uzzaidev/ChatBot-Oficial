# Unified Analytics - Documentação

## Visão Geral

O **Unified Analytics** é uma página única de analytics que consolida:
- **AI Gateway metrics** (novas métricas de uso do Gateway)
- **Chatbot metrics** (métricas legadas do chatbot)

## Características Principais

### 1. Controle de Permissões Automático

#### Para Tenants (Usuários Normais)
- Veem **apenas seus próprios dados**
- Filtros disponíveis:
  - Período (7d, 30d, 60d, 90d)
  - Tipo de API (chat, whisper, vision, embeddings)
  - Conversação específica

#### Para Admins (Super Admin)
- Veem **dados de todos os clientes**
- Filtros adicionais:
  - **Seleção de cliente específico**
  - Todos os filtros de tenants
- Dashboard extra: **Uso por Cliente** (breakdown de todos os clientes)

### 2. Métricas Unificadas

#### KPI Cards (4 cards principais)
1. **Total de Requests** - Soma de Gateway + chatbot
2. **Mensagens Enviadas** - Total de mensagens do chatbot
3. **Custo Total (BRL)** - Custo consolidado
4. **Cache Hit Rate** - Taxa de cache do AI Gateway

#### Tabs Principais

##### Tab 1: AI Gateway
- **Uso por Tipo de API**
  - Chat (texto)
  - Whisper (áudio)
  - Vision (imagem)
  - Embeddings
- **Uso por Provider**
  - OpenAI, Groq, Anthropic, Google
- **Métricas de Performance**
  - Total de requests
  - Latência média
  - Custo total

##### Tab 2: Chatbot (Legacy)
- **Uso por Modelo**
  - Distribuição entre GPT-4o, Llama, etc.
  - Tokens consumidos
  - Custo em USD

##### Tab 3: Conversações
- **Top Conversações**
  - Conversas mais recentes
  - Última mensagem
  - Data/hora

### 3. Admin-Only: Breakdown por Cliente

Quando admin não filtra por cliente específico, vê:
- Lista de todos os clientes
- Requests por cliente
- Custo por cliente
- Percentual de uso

## Arquitetura

### API Endpoint

**GET `/api/analytics/unified`**

Query params:
- `period` - 7d | 30d | 60d | 90d (default: 30d)
- `clientId` - UUID do cliente (apenas para admin)
- `apiType` - chat | whisper | vision | embeddings
- `conversationId` - UUID da conversação

**Segurança:**
1. Autentica o usuário via `supabase.auth.getUser()`
2. Busca perfil em `user_profiles` para obter `role` e `client_id`
3. **Se tenant:** Force filtra por `client_id` (ignora filtro de cliente)
4. **Se admin:** Permite filtrar por qualquer `client_id` ou ver todos

**Response:**
```typescript
{
  isAdmin: boolean
  clientId: string
  clientName: string

  totalRequests: number
  totalMessages: number
  totalCostBRL: number
  totalCostUSD: number

  gatewayMetrics: {
    totalGatewayRequests: number
    cacheHitRate: number
    averageLatencyMs: number
    totalCostBRL: number
    byApiType: [...]
    byProvider: [...]
  }

  chatbotMetrics: {
    totalMessages: number
    totalConversations: number
    totalCostUSD: number
    byModel: [...]
  }

  topConversations: [...]

  // Admin-only
  byClient?: [...]
}
```

### Componentes

**Principais:**
- `src/components/UnifiedAnalytics.tsx` - Componente principal
- `src/app/dashboard/analytics/page.tsx` - Página Next.js

**Navegação:**
- `src/components/AIGatewayNav.tsx` - Navegação do AI Gateway (link para analytics)

### Banco de Dados

**Tabelas utilizadas:**
- `gateway_usage_logs` - Logs do AI Gateway (com RLS)
- `usage_logs` - Logs legados do chatbot
- `conversations` - Conversas
- `clients` - Informações dos clientes
- `user_profiles` - Perfis com `role` e `client_id`

**RLS Policies (gateway_usage_logs):**
```sql
-- Tenants veem apenas seus dados
CREATE POLICY "Clients can view own usage logs"
  ON gateway_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.client_id = gateway_usage_logs.client_id
    )
  );

-- Admins veem tudo
CREATE POLICY "Admins can view all usage logs"
  ON gateway_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

## Migração de Páginas

### Antes
- `/dashboard/analytics` - Analytics do chatbot
- `/dashboard/ai-gateway/analytics` - Analytics do AI Gateway
- **Problema:** Duas páginas separadas, usuário precisa navegar entre elas

### Depois
- `/dashboard/analytics` - **ÚNICO** analytics consolidado
- `/dashboard/ai-gateway/analytics` - ❌ **REMOVIDO**
- **Solução:** Uma única página com tabs e filtros

## Como Usar

### Tenant
1. Acesse `/dashboard/analytics`
2. Veja seus dados automaticamente
3. Filtre por:
   - Período (7d, 30d, 60d, 90d)
   - Tipo de API (chat, whisper, vision, embeddings)
   - Conversação

### Admin
1. Acesse `/dashboard/analytics`
2. Veja dados de **todos os clientes** por padrão
3. Filtre por:
   - **Cliente específico** (dropdown com todos os clientes)
   - Período
   - Tipo de API
   - Conversação
4. Visualize breakdown por cliente no final da página

## Exemplo de Uso (Admin)

```
1. Admin acessa /dashboard/analytics
2. Vê KPI cards com dados agregados de TODOS os clientes
3. Filtra por "Cliente: ACME Corp"
4. Vê apenas dados da ACME Corp
5. Filtra por "API Type: whisper"
6. Vê apenas requests de áudio da ACME Corp
7. Remove filtro de cliente
8. Vê breakdown de TODOS os clientes novamente
```

## Testes de Permissão

### Cenário 1: Tenant tenta ver dados de outro cliente
```bash
# Tenant com client_id = "aaa-111"
GET /api/analytics/unified?clientId=bbb-222

# Resultado: 403 Forbidden
# Mensagem: "Forbidden: Cannot view other clients data"
```

### Cenário 2: Admin vê todos os clientes
```bash
# Admin
GET /api/analytics/unified

# Resultado: 200 OK
# Response inclui: byClient: [...]
```

### Cenário 3: Admin filtra por cliente específico
```bash
# Admin
GET /api/analytics/unified?clientId=aaa-111

# Resultado: 200 OK
# Response mostra apenas dados do cliente aaa-111
# byClient: undefined (não aparece quando filtrado)
```

## Próximos Passos (Opcional)

- [ ] Adicionar gráficos de linha para tendências ao longo do tempo
- [ ] Adicionar export de dados (CSV/Excel)
- [ ] Adicionar alertas de custo (email quando ultrapassar threshold)
- [ ] Adicionar comparação entre períodos (30d vs 60d)
- [ ] Cache da API para melhorar performance
