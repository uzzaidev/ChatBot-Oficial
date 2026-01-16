# 🎯 Exemplo Prático: Adicionar Nova Métrica "Taxa de Resolução"

Este guia mostra passo a passo como adicionar uma nova métrica ao sistema.

---

## 📋 Objetivo

Adicionar métrica de **Taxa de Resolução** que mostra:
- Conversas resolvidas por dia
- Taxa de resolução (percentual)
- Comparação com total de conversas

---

## 🔧 Passo 1: Atualizar Tipos

**Arquivo:** `src/lib/types/dashboard-metrics.ts`

```typescript
export type MetricType =
  | 'conversations_per_day'
  | 'new_clients_per_day'
  | 'messages_per_day'
  | 'tokens_per_day'
  | 'cost_per_day'
  | 'status_distribution'
  | 'resolution_rate'  // ← ADICIONAR
```

```typescript
export interface ResolutionRateMetric {
  date: string
  resolved: number
  total: number
  rate: number  // 0-100
}

export interface DashboardMetricsData {
  conversations: ConversationsMetric[]
  clients: ClientsMetric[]
  messages: MessagesMetric[]
  tokens: TokensMetric[]
  cost: CostMetric[]
  statusDistribution: StatusDistribution[]
  resolutionRate: ResolutionRateMetric[]  // ← ADICIONAR
}
```

---

## 🔧 Passo 2: Processar Dados na API

**Arquivo:** `src/app/api/dashboard/metrics/route.ts`

```typescript
// Adicionar função de processamento
function processResolutionRate(conversationsData: any[]) {
  const grouped = conversationsData.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { total: 0, resolved: 0 }
    }
    acc[date].total++
    
    // Considerar resolvida se status for 'resolvido' ou se não tem mensagens há X dias
    // Ajustar lógica conforme sua regra de negócio
    if (item.status === 'resolvido' || item.status === 'closed') {
      acc[date].resolved++
    }
    
    return acc
  }, {} as Record<string, { total: number; resolved: number }>)

  return Object.entries(grouped).map(([date, values]) => {
    const rate = values.total > 0 
      ? (values.resolved / values.total) * 100 
      : 0
    
    return {
      date,
      total: values.total,
      resolved: values.resolved,
      rate: Number(rate.toFixed(2)),
    }
  })
}

// No GET handler, adicionar ao retorno:
const metrics: DashboardMetricsData = {
  conversations: processConversationsData(conversationsData || []),
  clients: processClientsData(clientsData || []),
  messages: processMessagesData(messagesData || []),
  tokens: processTokensData(usageData || []),
  cost: processCostData(usageData || []),
  statusDistribution: processStatusDistribution(statusData || []),
  resolutionRate: processResolutionRate(conversationsData || []),  // ← ADICIONAR
}
```

---

## 🔧 Passo 3: Transformar no Hook

**Arquivo:** `src/hooks/useDashboardMetrics.ts`

```typescript
const getMetricData = useCallback(
  (metricType: ChartConfig['metricType']): MetricDataPoint[] => {
    if (!metrics) return []

    switch (metricType) {
      // ... casos existentes

      case 'resolution_rate':  // ← ADICIONAR
        return metrics.resolutionRate.map((item) => ({
          date: item.date,
          resolvidas: item.resolved,
          total: item.total,
          taxa: item.rate,
        }))

      default:
        return []
    }
  },
  [metrics]
)
```

---

## 🔧 Passo 4: Adicionar ao Modal

**Arquivo:** `src/components/ChartConfigModal.tsx`

```typescript
const METRIC_OPTIONS: { value: MetricType; label: string; description: string }[] = [
  // ... opções existentes
  {
    value: 'resolution_rate',  // ← ADICIONAR
    label: 'Taxa de Resolução',
    description: 'Percentual de conversas resolvidas por dia',
  },
]
```

---

## ✅ Resultado

Agora você pode:

1. **Criar gráfico** → Clicar em "Adicionar Gráfico"
2. **Selecionar métrica** → Escolher "Taxa de Resolução"
3. **Escolher tipo** → Linha, Barra, Área, etc
4. **Personalizar** → Cores, título, descrição
5. **Visualizar** → Gráfico mostra:
   - `resolvidas` - Número de conversas resolvidas
   - `total` - Total de conversas
   - `taxa` - Percentual de resolução

---

## 🎨 Exemplo de Dados Gerados

```json
[
  {
    "date": "2026-01-15",
    "resolvidas": 8,
    "total": 10,
    "taxa": 80.0
  },
  {
    "date": "2026-01-16",
    "resolvidas": 9,
    "total": 12,
    "taxa": 75.0
  }
]
```

---

## 📊 Como Fica no Gráfico

Se você escolher **Gráfico de Linha**:

- **Linha 1 (verde):** `resolvidas` - 8, 9, ...
- **Linha 2 (azul):** `total` - 10, 12, ...
- **Linha 3 (azul claro):** `taxa` - 80%, 75%, ...

---

## 🔍 Testando

1. Abra o dashboard
2. Clique em "Adicionar Gráfico"
3. Selecione "Taxa de Resolução"
4. Escolha tipo "Linha"
5. Salve
6. Verifique se os dados aparecem corretamente

---

**Pronto!** Sua nova métrica está funcionando! 🎉

