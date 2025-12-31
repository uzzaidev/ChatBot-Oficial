# 📊 Gráficos Customizáveis - Dashboard

**Biblioteca:** [Recharts](https://recharts.org/)
**Última atualização:** 2024-12-17

---

## 🎯 Visão Geral

O dashboard principal (`/dashboard`) possui um sistema de **gráficos totalmente customizáveis** que permite:

✅ **Adicionar/Remover** gráficos dinamicamente
✅ **Editar** tipo, cores, título e configurações
✅ **Reorganizar** layout (grid ou lista)
✅ **Persistir** configurações no localStorage
✅ **Alterar** período de dados (7, 30, 60, 90 dias, etc)
✅ **Resetar** para configuração padrão

---

## 📦 Tecnologias Utilizadas

### **1. Recharts** (Biblioteca de Gráficos)

```bash
npm install recharts
```

**Por que Recharts?**
- ✅ React-first (componentes React nativos)
- ✅ Responsivo por padrão
- ✅ Altamente customizável
- ✅ Performance excelente
- ✅ TypeScript support
- ✅ Documentação completa

**Tipos de gráficos disponíveis:**
- `LineChart` - Gráfico de linha
- `BarChart` - Gráfico de barras
- `AreaChart` - Gráfico de área
- `ComposedChart` - Gráfico combinado (linha + barra)

---

### **2. shadcn/ui** (Componentes UI)

- `Card` - Container do gráfico
- `Button` - Ações (editar, remover)
- `Select` - Seletor de período
- `Dialog` - Modal de configuração

---

### **3. LocalStorage** (Persistência)

As configurações são salvas automaticamente em:
```javascript
localStorage.setItem(`dashboard_config_${clientId}`, JSON.stringify(config))
```

**Estrutura salva:**
```json
{
  "version": "1.2",
  "charts": [...],
  "layout": "grid",
  "updatedAt": "2024-12-17T..."
}
```

---

## 🏗️ Arquitetura dos Componentes

### **Hierarquia:**
```
DashboardClient
  └── DashboardMetricsView (src/components/DashboardMetricsView.tsx)
       ├── CustomizableChart (src/components/CustomizableChart.tsx)
       │    └── Recharts (LineChart, BarChart, AreaChart, ComposedChart)
       └── ChartConfigModal (src/components/ChartConfigModal.tsx)
```

---

## 📝 Como Funciona

### **1. Configuração de Gráficos**

Cada gráfico tem uma configuração do tipo `ChartConfig`:

```typescript
interface ChartConfig {
  id: string                    // Identificador único
  type: ChartType               // 'line' | 'bar' | 'area' | 'composed'
  metricType: MetricType        // Tipo de métrica (ex: 'conversations_per_day')
  title: string                 // Título do gráfico
  description?: string          // Descrição (subtitle)
  colors: {
    primary: string             // Cor primária (hex)
    secondary?: string          // Cor secundária (hex)
  }
  showGrid: boolean             // Mostrar grid?
  showLegend: boolean           // Mostrar legenda?
  height: number                // Altura em pixels
  position?: {                  // Posição no grid (futuro: drag & drop)
    x: number
    y: number
    w: number
    h: number
  }
}
```

---

### **2. Exemplo de Configuração (Default)**

```typescript
const DEFAULT_CHARTS: ChartConfig[] = [
  {
    id: 'chart_conversations',
    type: 'area',
    metricType: 'conversations_per_day',
    title: 'Conversas por Dia',
    description: 'Total de conversas iniciadas diariamente',
    colors: {
      primary: '#3b82f6',      // Azul (Tailwind blue-500)
      secondary: '#93c5fd'      // Azul claro (Tailwind blue-300)
    },
    showGrid: true,
    showLegend: true,
    height: 300,
    position: { x: 0, y: 0, w: 6, h: 2 },
  },
  {
    id: 'chart_messages',
    type: 'bar',
    metricType: 'messages_per_day',
    title: 'Mensagens por Dia',
    description: 'Mensagens enviadas e recebidas',
    colors: {
      primary: '#10b981',      // Verde (Tailwind green-500)
      secondary: '#6ee7b7'     // Verde claro (Tailwind green-300)
    },
    showGrid: true,
    showLegend: true,
    height: 300,
    position: { x: 6, y: 0, w: 6, h: 2 },
  },
  // ... mais gráficos
]
```

---

### **3. Como Adicionar um Novo Gráfico**

**No Dashboard:**
1. Clique em **"Adicionar Gráfico"**
2. Abre modal de configuração
3. Escolha o tipo de gráfico
4. Escolha a métrica
5. Customize cores e título
6. Salva automaticamente no localStorage

**Programaticamente:**

```typescript
const newChart: ChartConfig = {
  id: `chart_${Date.now()}`,
  type: 'line',
  metricType: 'new_clients_per_day',
  title: 'Meu Gráfico Customizado',
  colors: { primary: '#8b5cf6' }, // Roxo
  showGrid: true,
  showLegend: true,
  height: 350,
}

setCharts([...charts, newChart])
```

---

### **4. Como os Dados São Buscados**

O hook `useDashboardMetrics` busca dados da API:

```typescript
const { metrics, loading, error, refetch, getMetricData } = useDashboardMetrics({ days: 30 })

// Retorna dados no formato:
const data = [
  { date: '2024-12-01', value: 45 },
  { date: '2024-12-02', value: 52 },
  { date: '2024-12-03', value: 38 },
  // ...
]
```

**API Endpoint:**
```
GET /api/metrics/dashboard?days=30&clientId=...
```

---

## 🎨 Customização de Cores

### **Paleta de Cores Pré-definidas:**

```typescript
const COLOR_PRESETS = {
  blue: { primary: '#3b82f6', secondary: '#93c5fd' },
  green: { primary: '#10b981', secondary: '#6ee7b7' },
  purple: { primary: '#8b5cf6', secondary: '#c4b5fd' },
  orange: { primary: '#f59e0b', secondary: '#fcd34d' },
  red: { primary: '#ef4444', secondary: '#fca5a5' },
  pink: { primary: '#ec4899', secondary: '#f9a8d4' },
  teal: { primary: '#14b8a6', secondary: '#5eead4' },
  indigo: { primary: '#6366f1', secondary: '#a5b4fc' },
}
```

---

## 📐 Tamanho e Layout

### **Alturas Disponíveis:**
- 250px (Compacto)
- 300px (Padrão)
- 400px (Grande)
- 500px (Extra grande)

### **Layouts:**

#### **Grid (Padrão):**
```css
grid grid-cols-1 lg:grid-cols-2 gap-6
```
- 1 coluna em mobile
- 2 colunas em desktop

#### **Lista:**
```css
flex flex-col gap-6
```
- 1 coluna sempre
- Gráficos empilhados

---

## 🔧 Como Editar Gráficos

### **Via Interface:**

1. **Clique no ícone de configuração** (Settings) em qualquer gráfico
2. Abre modal com opções:
   - **Tipo:** Line, Bar, Area, Composed
   - **Métrica:** Conversas, Mensagens, Clientes, Tokens, Custos
   - **Título:** Texto customizado
   - **Descrição:** Subtitle opcional
   - **Cor Primária:** Seletor de cor
   - **Cor Secundária:** Seletor de cor (opcional)
   - **Grid:** Toggle on/off
   - **Legenda:** Toggle on/off
   - **Altura:** Slider 250-500px

3. **Salva:** Atualiza instantaneamente

### **Via Código:**

```typescript
const handleEditChart = (id: string) => {
  setCharts(charts.map((chart) =>
    chart.id === id
      ? { ...chart, colors: { primary: '#ff0000' } } // Muda para vermelho
      : chart
  ))
}
```

---

## 📊 Tipos de Gráficos Detalhados

### **1. Line Chart (Linha)**

**Quando usar:** Tendências ao longo do tempo

```typescript
<LineChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line
    type="monotone"
    dataKey="value"
    stroke={config.colors.primary}
    strokeWidth={2}
    dot={{ r: 4 }}
    activeDot={{ r: 6 }}
  />
</LineChart>
```

**Exemplo de uso:**
- Conversas por dia
- Crescimento de clientes
- Tendência de custos

---

### **2. Bar Chart (Barras)**

**Quando usar:** Comparações de categorias

```typescript
<BarChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar
    dataKey="value"
    fill={config.colors.primary}
    radius={[8, 8, 0, 0]} // Cantos arredondados no topo
  />
</BarChart>
```

**Exemplo de uso:**
- Mensagens por dia
- Requisições por provider
- Distribuição de tipos de mídia

---

### **3. Area Chart (Área)**

**Quando usar:** Volumes ao longo do tempo

```typescript
<AreaChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Area
    type="monotone"
    dataKey="value"
    stroke={config.colors.primary}
    fill={config.colors.primary}
    fillOpacity={0.6}
  />
</AreaChart>
```

**Exemplo de uso:**
- Volume de mensagens
- Consumo de tokens
- Custos acumulados

---

### **4. Composed Chart (Combinado)**

**Quando usar:** Múltiplas métricas sobrepostas

```typescript
<ComposedChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />

  {/* Linha para tendência */}
  <Line
    type="monotone"
    dataKey="total"
    stroke={config.colors.primary}
    strokeWidth={2}
  />

  {/* Barras para detalhamento */}
  <Bar
    dataKey="openai"
    fill={config.colors.secondary}
    radius={[4, 4, 0, 0]}
  />
  <Bar
    dataKey="groq"
    fill="#10b981"
    radius={[4, 4, 0, 0]}
  />
</ComposedChart>
```

**Exemplo de uso:**
- Tokens por provider (linha total + barras por provider)
- Custos detalhados (linha total + barras por API)

---

## 💾 Persistência de Configuração

### **Como Funciona:**

1. **Auto-save:** Toda mudança salva automaticamente
2. **Versionamento:** Sistema de versão para forçar reset quando necessário
3. **Por cliente:** Cada `clientId` tem sua própria config

### **Estrutura no localStorage:**

```javascript
Key: `dashboard_config_${clientId}`

Value: {
  "version": "1.2",
  "charts": [
    {
      "id": "chart_conversations",
      "type": "area",
      "metricType": "conversations_per_day",
      "title": "Conversas por Dia",
      "colors": { "primary": "#3b82f6", "secondary": "#93c5fd" },
      "showGrid": true,
      "showLegend": true,
      "height": 300,
      "position": { "x": 0, "y": 0, "w": 6, "h": 2 }
    },
    // ... mais gráficos
  ],
  "layout": "grid",
  "updatedAt": "2024-12-17T15:30:00.000Z"
}
```

### **Forçar Reset:**

Incrementar `CONFIG_VERSION` no código força reset para todos os usuários:

```typescript
const CONFIG_VERSION = '1.3' // Era 1.2, agora 1.3 = reset

if (config.version !== CONFIG_VERSION) {
  setCharts(DEFAULT_CHARTS) // Volta ao padrão
}
```

---

## 🎛️ Modal de Configuração

**Arquivo:** `src/components/ChartConfigModal.tsx`

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **Tipo de Gráfico** | Select | Line, Bar, Area, Composed |
| **Métrica** | Select | conversations_per_day, messages_per_day, etc |
| **Título** | Input | Título do gráfico |
| **Descrição** | Input | Subtitle (opcional) |
| **Cor Primária** | Color Picker | Cor principal (#hex) |
| **Cor Secundária** | Color Picker | Cor secundária (#hex) |
| **Mostrar Grid** | Toggle | On/Off |
| **Mostrar Legenda** | Toggle | On/Off |
| **Altura** | Slider | 250-500px |

**Exemplo de uso:**

```typescript
<ChartConfigModal
  open={modalOpen}
  onOpenChange={setModalOpen}
  config={editingChart}
  onSave={handleSaveChart}
/>
```

---

## 📱 Responsividade

### **ResponsiveContainer (Recharts):**

```typescript
<ResponsiveContainer width="100%" height={chartHeight}>
  <LineChart data={data}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

**Comportamento:**
- ✅ Adapta automaticamente ao container pai
- ✅ Redimensiona em tempo real
- ✅ Mobile-friendly

### **Grid Responsivo:**

```css
grid grid-cols-1       /* Mobile: 1 coluna */
lg:grid-cols-2         /* Desktop: 2 colunas */
```

---

## 🔥 Exemplos Práticos

### **Exemplo 1: Criar Gráfico de Custos**

```typescript
const costChart: ChartConfig = {
  id: 'chart_costs',
  type: 'line',
  metricType: 'costs_per_day',
  title: 'Custos Diários (R$)',
  description: 'Custo total em reais por dia',
  colors: {
    primary: '#ef4444',  // Vermelho
    secondary: '#fca5a5'
  },
  showGrid: true,
  showLegend: true,
  height: 350,
}

setCharts([...charts, costChart])
```

---

### **Exemplo 2: Gráfico Combinado Multi-Provider**

```typescript
const multiProviderChart: ChartConfig = {
  id: 'chart_tokens_multi',
  type: 'composed',
  metricType: 'tokens_per_provider',
  title: 'Tokens por Provider',
  description: 'OpenAI vs Groq vs ElevenLabs',
  colors: {
    primary: '#f59e0b',  // Laranja (total)
    secondary: '#3b82f6' // Azul (OpenAI)
  },
  showGrid: true,
  showLegend: true,
  height: 400,
}

// No componente CustomizableChart, renderiza:
<ComposedChart data={data}>
  <Line dataKey="total" stroke="#f59e0b" strokeWidth={3} />
  <Bar dataKey="openai" fill="#3b82f6" />
  <Bar dataKey="groq" fill="#10b981" />
  <Bar dataKey="elevenlabs" fill="#8b5cf6" />
</ComposedChart>
```

---

### **Exemplo 3: Mudar Cores de Todos os Gráficos**

```typescript
const applyDarkTheme = () => {
  const darkColors = {
    blue: { primary: '#60a5fa', secondary: '#1e40af' },
    green: { primary: '#34d399', secondary: '#065f46' },
    purple: { primary: '#a78bfa', secondary: '#5b21b6' },
  }

  setCharts(charts.map((chart, index) => {
    const colorKey = ['blue', 'green', 'purple'][index % 3]
    return {
      ...chart,
      colors: darkColors[colorKey]
    }
  }))
}
```

---

## 🛠️ Comandos Úteis

### **Instalar Recharts:**
```bash
npm install recharts
```

### **Tipos TypeScript:**
```bash
npm install --save-dev @types/recharts
```

### **Verificar versão:**
```bash
npm list recharts
```

---

## 📚 Documentação Oficial

- **Recharts:** https://recharts.org/
- **shadcn/ui:** https://ui.shadcn.com/
- **LocalStorage API:** https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

---

## 🎯 Próximas Features (Roadmap)

- [ ] **Drag & Drop:** Reorganizar gráficos com mouse
- [ ] **Export:** Baixar gráfico como PNG/SVG
- [ ] **Templates:** Salvar/carregar configurações pré-definidas
- [ ] **Comparação:** Ver múltiplos períodos sobrepostos
- [ ] **Alertas:** Notificações quando métrica atinge threshold
- [ ] **Dashboard compartilhado:** Compartilhar configuração entre usuários

---

## 🏆 Benefícios do Sistema Atual

✅ **Zero código para adicionar gráfico** - Interface visual completa
✅ **Persistente** - Configurações salvas automaticamente
✅ **Responsivo** - Funciona em mobile e desktop
✅ **Performance** - Recharts é otimizado e rápido
✅ **Customizável** - Cores, tipos, tamanhos totalmente customizáveis
✅ **Extensível** - Fácil adicionar novos tipos de métricas
✅ **Type-safe** - TypeScript completo
✅ **Acessível** - Componentes shadcn/ui são acessíveis por padrão

---

**Última atualização:** 2024-12-17
**Autor:** Sistema de Dashboard Customizável
**Versão:** 1.2
