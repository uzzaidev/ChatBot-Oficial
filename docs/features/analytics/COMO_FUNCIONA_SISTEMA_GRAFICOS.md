# 📊 Como Funciona o Sistema de Gráficos Customizáveis

**Data:** 2026-01-16  
**Versão:** 1.0

---

## 🎯 Visão Geral

O sistema permite criar gráficos customizáveis escolhendo:
1. **Métrica** - Qual dado você quer visualizar (ex: Conversas, Mensagens, Tokens)
2. **Tipo de Gráfico** - Como visualizar (Linha, Barra, Área, etc)
3. **Cores e Estilo** - Personalização visual

---

## 🔄 Fluxo Completo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API: /api/dashboard/metrics                              │
│    └─> Busca dados do banco (Supabase)                      │
│    └─> Processa e agrupa por dia                            │
│    └─> Retorna JSON com todas as métricas                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Hook: useDashboardMetrics                                │
│    └─> Faz requisição para API                              │
│    └─> Armazena dados em estado                             │
│    └─> Função getMetricData() transforma dados              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Componente: DashboardMetricsView                        │
│    └─> Usa hook para buscar dados                          │
│    └─> Para cada gráfico, chama getMetricData(metricType)  │
│    └─> Passa dados transformados para CustomizableChart     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Componente: CustomizableChart                            │
│    └─> Recebe dados formatados                             │
│    └─> Renderiza gráfico (Recharts)                        │
│    └─> Aplica cores e estilo do config                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Passo a Passo: Como Criar um Novo Gráfico

### **Passo 1: Escolher a Métrica**

No modal "Adicionar Gráfico", você seleciona uma métrica:

```typescript
// Opções disponíveis:
'conversations_per_day'    // Conversas por Dia
'new_clients_per_day'      // Novos Clientes por Dia
'messages_per_day'         // Mensagens por Dia
'tokens_per_day'           // Tokens por Dia
'cost_per_day'             // Custo por Dia
'status_distribution'      // Distribuição por Status
```

**Onde está definido:**
- `src/components/ChartConfigModal.tsx` - Lista de opções no dropdown
- `src/lib/types/dashboard-metrics.ts` - Tipo TypeScript

---

### **Passo 2: Escolher Tipo de Gráfico**

Você escolhe como visualizar:

```typescript
'line'      // Gráfico de linha
'bar'       // Gráfico de barras
'area'      // Gráfico de área
'composed'  // Combinado (linha + barra)
'radar'     // Radar (spider)
'treemap'   // Mapa de árvore
'gauge'     // Gauge circular
'funnel'    // Funil
'heatmap'   // Heatmap
```

---

### **Passo 3: Como os Dados São Transformados**

Quando você seleciona uma métrica, o hook `useDashboardMetrics` transforma os dados:

```typescript
// Exemplo: Se você escolhe "Conversas por Dia"
getMetricData('conversations_per_day')

// O hook faz:
metrics.conversations.map((item) => ({
  date: item.date,           // "2026-01-15"
  total: item.total,         // 10
  ativo: item.active,        // 5
  transferido: item.transferred, // 2
  humano: item.human,        // 3
}))
```

**Resultado:** Array de objetos que o gráfico pode usar:

```json
[
  { "date": "2026-01-15", "total": 10, "ativo": 5, "transferido": 2, "humano": 3 },
  { "date": "2026-01-16", "total": 12, "ativo": 6, "transferido": 3, "humano": 3 }
]
```

---

## 🔧 Como Adicionar uma Nova Métrica

### **1. Adicionar ao Tipo TypeScript**

**Arquivo:** `src/lib/types/dashboard-metrics.ts`

```typescript
export type MetricType =
  | 'conversations_per_day'
  | 'new_clients_per_day'
  // ... existentes
  | 'minha_nova_metrica'  // ← ADICIONAR AQUI
```

---

### **2. Adicionar Interface de Dados (se necessário)**

**Arquivo:** `src/lib/types/dashboard-metrics.ts`

```typescript
export interface MinhaNovaMetrica {
  date: string
  valor1: number
  valor2: number
}

export interface DashboardMetricsData {
  conversations: ConversationsMetric[]
  // ... existentes
  minhaNovaMetrica: MinhaNovaMetrica[]  // ← ADICIONAR AQUI
}
```

---

### **3. Processar Dados na API**

**Arquivo:** `src/app/api/dashboard/metrics/route.ts`

```typescript
// 1. Buscar dados do banco
const { data: minhaData } = await supabase
  .from('minha_tabela')
  .select('*')
  .eq('client_id', clientId)
  .gte('created_at', startDate.toISOString())
  .lte('created_at', endDate.toISOString())

// 2. Processar dados
function processMinhaNovaMetrica(data: any[]) {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { valor1: 0, valor2: 0 }
    }
    acc[date].valor1 += item.valor1 || 0
    acc[date].valor2 += item.valor2 || 0
    return acc
  }, {})

  return Object.entries(grouped).map(([date, values]) => ({
    date,
    ...values,
  }))
}

// 3. Incluir no retorno
const metrics: DashboardMetricsData = {
  conversations: processConversationsData(conversationsData || []),
  // ... existentes
  minhaNovaMetrica: processMinhaNovaMetrica(minhaData || []),  // ← ADICIONAR
}
```

---

### **4. Adicionar Transformação no Hook**

**Arquivo:** `src/hooks/useDashboardMetrics.ts`

```typescript
const getMetricData = useCallback(
  (metricType: ChartConfig['metricType']): MetricDataPoint[] => {
    if (!metrics) return []

    switch (metricType) {
      case 'conversations_per_day':
        // ... existente

      case 'minha_nova_metrica':  // ← ADICIONAR AQUI
        return metrics.minhaNovaMetrica.map((item) => ({
          date: item.date,
          valor1: item.valor1,
          valor2: item.valor2,
        }))

      default:
        return []
    }
  },
  [metrics]
)
```

---

### **5. Adicionar ao Modal de Configuração**

**Arquivo:** `src/components/ChartConfigModal.tsx`

```typescript
const METRIC_OPTIONS: { value: MetricType; label: string; description: string }[] = [
  // ... existentes
  {
    value: 'minha_nova_metrica',  // ← ADICIONAR AQUI
    label: 'Minha Nova Métrica',
    description: 'Descrição do que essa métrica mostra',
  },
]
```

---

## 📊 Exemplo Prático: Adicionar "Mensagens por Hora"

### **1. Tipo**

```typescript
// src/lib/types/dashboard-metrics.ts
export type MetricType =
  | 'messages_per_hour'  // ← NOVO
```

### **2. Interface**

```typescript
export interface MessagesPerHourMetric {
  hour: string  // "00", "01", ..., "23"
  total: number
  incoming: number
  outgoing: number
}
```

### **3. API**

```typescript
// src/app/api/dashboard/metrics/route.ts
function processMessagesPerHour(data: any[]) {
  const grouped = data.reduce((acc, item) => {
    const hour = new Date(item.created_at).getHours().toString().padStart(2, '0')
    if (!acc[hour]) {
      acc[hour] = { total: 0, incoming: 0, outgoing: 0 }
    }
    acc[hour].total++
    if (item.message?.type === 'human') acc[hour].incoming++
    if (item.message?.type === 'ai') acc[hour].outgoing++
    return acc
  }, {})

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, values]) => ({
      hour,
      ...values,
    }))
}
```

### **4. Hook**

```typescript
case 'messages_per_hour':
  return metrics.messagesPerHour.map((item) => ({
    date: item.hour,  // Usa 'date' como chave para compatibilidade
    total: item.total,
    recebidas: item.incoming,
    enviadas: item.outgoing,
  }))
```

### **5. Modal**

```typescript
{
  value: 'messages_per_hour',
  label: 'Mensagens por Hora',
  description: 'Distribuição de mensagens ao longo do dia',
}
```

---

## 🎨 Como o Gráfico Renderiza os Dados

### **CustomizableChart recebe:**

```typescript
<CustomizableChart
  config={{
    metricType: 'conversations_per_day',
    type: 'line',
    colors: { primary: '#1ABC9C', secondary: '#2E86AB' }
  }}
  data={[
    { date: "2026-01-15", total: 10, ativo: 5, transferido: 2, humano: 3 },
    { date: "2026-01-16", total: 12, ativo: 6, transferido: 3, humano: 3 }
  ]}
/>
```

### **O componente detecta automaticamente:**

1. **Chaves de dados** - Remove 'date' e 'label', usa o resto
2. **Séries** - Cria uma série para cada chave (total, ativo, transferido, humano)
3. **Cores** - Primeira série usa `primary`, segunda usa `secondary`

### **Resultado:**

- **Linha 1:** `total` (cor primária: #1ABC9C)
- **Linha 2:** `ativo` (cor secundária: #2E86AB)
- **Linha 3:** `transferido` (cor secundária: #2E86AB)
- **Linha 4:** `humano` (cor secundária: #2E86AB)

---

## 🔍 Estrutura de Dados por Métrica

### **Conversas por Dia**
```typescript
{
  date: "2026-01-15",
  total: 10,        // Total de conversas
  ativo: 5,         // Com bot ativo
  transferido: 2,   // Transferidas para humano
  humano: 3         // Com humano
}
```

### **Mensagens por Dia**
```typescript
{
  date: "2026-01-15",
  total: 100,       // Total de mensagens
  recebidas: 50,    // Mensagens recebidas (human)
  enviadas: 50      // Mensagens enviadas (ai)
}
```

### **Tokens por Dia**
```typescript
{
  date: "2026-01-15",
  total: 50000,     // Total de tokens
  openai: 30000,    // Tokens OpenAI
  groq: 20000       // Tokens Groq
}
```

### **Custo por Dia**
```typescript
{
  date: "2026-01-15",
  total: 0.05,      // Custo total (USD)
  openai: 0.03,     // Custo OpenAI
  groq: 0.02        // Custo Groq
}
```

---

## 💡 Dicas Importantes

### **1. Nomes de Chaves em Português**

Os dados usam chaves em português (`ativo`, `recebidas`, `enviadas`) para:
- ✅ Melhor legenda no gráfico
- ✅ Compatibilidade com labels em PT-BR
- ✅ Facilita entendimento

### **2. Sempre Incluir 'date'**

Todos os dados devem ter `date` como primeira chave:
```typescript
{ date: "2026-01-15", ...outros }
```

### **3. Compatibilidade com Tipos de Gráfico**

- **Line/Bar/Area:** Funcionam com qualquer métrica
- **Radar:** Precisa de múltiplas dimensões (ex: performance em várias métricas)
- **Treemap:** Precisa de hierarquia (ex: custo por modelo)
- **Gauge:** Precisa de um único valor (ex: porcentagem)
- **Funnel:** Precisa de etapas sequenciais (ex: conversão)

---

## 🚀 Exemplo Completo: Nova Métrica "Taxa de Resolução"

Vou criar um exemplo completo adicionando a métrica de taxa de resolução:

```typescript
// 1. Tipo
export type MetricType = | 'resolution_rate'

// 2. Interface
export interface ResolutionRateMetric {
  date: string
  resolved: number      // Conversas resolvidas
  total: number         // Total de conversas
  rate: number          // Taxa (0-100)
}

// 3. API - processar dados
function processResolutionRate(conversationsData: any[]) {
  // Lógica para calcular taxa de resolução
  // ...
}

// 4. Hook - transformar
case 'resolution_rate':
  return metrics.resolutionRate.map((item) => ({
    date: item.date,
    resolvidas: item.resolved,
    total: item.total,
    taxa: item.rate,
  }))

// 5. Modal - adicionar opção
{
  value: 'resolution_rate',
  label: 'Taxa de Resolução',
  description: 'Percentual de conversas resolvidas',
}
```

---

## 📝 Checklist para Nova Métrica

- [ ] Adicionar ao tipo `MetricType`
- [ ] Criar interface de dados (se necessário)
- [ ] Adicionar processamento na API
- [ ] Adicionar transformação no hook `getMetricData`
- [ ] Adicionar opção no `ChartConfigModal`
- [ ] Testar com diferentes tipos de gráfico
- [ ] Verificar se dados aparecem corretamente
- [ ] Validar cores e legendas

---

**Última Atualização:** 2026-01-16

