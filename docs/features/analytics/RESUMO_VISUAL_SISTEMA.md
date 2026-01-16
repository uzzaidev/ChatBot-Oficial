# 📊 Resumo Visual - Sistema de Gráficos Customizáveis

## 🎯 Como Funciona em 3 Passos Simples

### **PASSO 1: Escolher a Métrica** 📈

No modal "Adicionar Gráfico", você escolhe **qual dado** quer ver:

```
┌─────────────────────────────────┐
│ Métrica: [Conversas por Dia ▼]│
│                                 │
│ Opções:                         │
│ ✓ Conversas por Dia            │
│   Novos Clientes por Dia       │
│   Mensagens por Dia            │
│   Tokens por Dia               │
│   Custo por Dia                │
│   Distribuição por Status      │
└─────────────────────────────────┘
```

**O que acontece:**
- Você seleciona `'conversations_per_day'`
- Isso define **qual dado** será buscado do banco

---

### **PASSO 2: Escolher Tipo de Gráfico** 📊

Você escolhe **como visualizar** os dados:

```
┌─────────────────────────────────┐
│ Tipo: [Linha ▼]                │
│                                 │
│ Opções:                         │
│ ✓ Linha                         │
│   Barra                         │
│   Área                          │
│   Composto                      │
│   Radar                         │
│   ...                           │
└─────────────────────────────────┘
```

**O que acontece:**
- Você seleciona `'line'`
- Isso define **como** os dados serão exibidos

---

### **PASSO 3: Personalizar** 🎨

Você escolhe cores, título, etc:

```
┌─────────────────────────────────┐
│ Título: [Conversas Diárias]     │
│ Cores: [Azul] [Verde]           │
│ Altura: [300] px                │
└─────────────────────────────────┘
```

---

## 🔄 O Que Acontece Por Trás dos Panos

### **1. API Busca Dados**

```typescript
// API faz query no banco:
SELECT * FROM clientes_whatsapp 
WHERE client_id = 'xxx' 
AND created_at BETWEEN '2026-01-01' AND '2026-01-31'

// Retorna dados brutos:
[
  { created_at: "2026-01-15", status: "bot" },
  { created_at: "2026-01-15", status: "humano" },
  { created_at: "2026-01-16", status: "bot" },
  ...
]
```

---

### **2. API Processa e Agrupa**

```typescript
// API agrupa por dia:
{
  conversations: [
    { date: "2026-01-15", total: 10, active: 5, human: 3, transferred: 2 },
    { date: "2026-01-16", total: 12, active: 6, human: 4, transferred: 2 }
  ],
  messages: [...],
  tokens: [...],
  // ... todas as métricas
}
```

---

### **3. Hook Transforma para o Gráfico**

```typescript
// Se você escolheu "Conversas por Dia":
getMetricData('conversations_per_day')

// Transforma para:
[
  { date: "2026-01-15", total: 10, ativo: 5, humano: 3, transferido: 2 },
  { date: "2026-01-16", total: 12, ativo: 6, humano: 4, transferido: 2 }
]
```

**Por que transforma?**
- ✅ Padroniza formato (sempre `date` + valores)
- ✅ Traduz chaves para português (`active` → `ativo`)
- ✅ Facilita renderização no gráfico

---

### **4. Gráfico Renderiza**

```typescript
// CustomizableChart recebe:
data = [
  { date: "2026-01-15", total: 10, ativo: 5, ... },
  { date: "2026-01-16", total: 12, ativo: 6, ... }
]

// Detecta automaticamente:
// - Chaves: total, ativo, humano, transferido
// - Cria 4 séries (linhas/barras)
// - Aplica cores: primeira = verde, outras = azul
```

---

## 🎨 Visualização no Gráfico

```
        ┌─────────────────────────────────────┐
        │ Conversas Diárias                    │
        │                                      │
    12  │     ●───●                            │ ← total (verde)
        │    ╱    ╲                            │
    10  │   ●      ●                           │
        │  ╱        ╲                          │
     8  │ ●          ●                         │
        │╱            ╲                        │
     6  │              ●───●                   │ ← ativo (azul)
        │                 ╱ ╲                  │
     4  │                ●   ●                 │
        │                                      │
     2  │                                      │
        │                                      │
     0  └─────────────────────────────────────┘
         15/01  16/01  17/01  18/01
```

---

## 🔄 Mudando de Métrica

### **Exemplo: De "Conversas" para "Mensagens"**

**ANTES:**
```typescript
metricType: 'conversations_per_day'
// Dados: { date, total, ativo, humano, transferido }
```

**DEPOIS:**
```typescript
metricType: 'messages_per_day'
// Dados: { date, total, recebidas, enviadas }
```

**O que muda:**
- ✅ API busca dados diferentes (tabela `n8n_chat_histories`)
- ✅ Processamento diferente (agrupa por tipo de mensagem)
- ✅ Transformação diferente (chaves: `recebidas`, `enviadas`)
- ✅ Gráfico mostra séries diferentes

**O que NÃO muda:**
- ✅ Estrutura do gráfico (ainda é linha/barra/etc)
- ✅ Cores (ainda usa as mesmas)
- ✅ Layout (ainda no mesmo lugar)

---

## 📝 Resumo em 1 Minuto

1. **Você escolhe métrica** → Define qual dado buscar
2. **API busca e processa** → Retorna dados agrupados
3. **Hook transforma** → Adapta para formato do gráfico
4. **Gráfico renderiza** → Mostra visualmente

**Para mudar métrica:**
- Edite o gráfico
- Escolha outra métrica
- Salve
- Gráfico atualiza automaticamente!

---

## 🎯 Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `ChartConfigModal.tsx` | Modal para configurar gráfico |
| `useDashboardMetrics.ts` | Hook que busca e transforma dados |
| `/api/dashboard/metrics/route.ts` | API que busca dados do banco |
| `CustomizableChart.tsx` | Componente que renderiza gráfico |
| `dashboard-metrics.ts` | Tipos TypeScript |

---

**Última Atualização:** 2026-01-16

