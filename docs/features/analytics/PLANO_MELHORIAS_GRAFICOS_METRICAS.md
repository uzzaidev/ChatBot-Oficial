# 📊 Plano de Melhorias - Gráficos e Métricas

**Data:** 2026-01-16  
**Status:** 📋 Planejamento  
**Prioridade:** 🔴 ALTA

---

## 🎯 Objetivo

Melhorar significativamente o sistema de gráficos e métricas do dashboard, adicionando:

1. **Filtros Temporais Avançados** - Mês, ano, range customizado
2. **Novas Métricas** - Métricas mais relevantes e acionáveis
3. **Gráficos Aprimorados** - Melhor visualização e interatividade
4. **Features Avançadas** - Comparações, exportação, alertas

---

## 📋 Índice

- [1. Filtros Temporais Avançados](#1-filtros-temporais-avançados)
- [2. Novas Métricas](#2-novas-métricas)
- [3. Melhorias nos Gráficos Existentes](#3-melhorias-nos-gráficos-existentes)
- [4. Novos Tipos de Visualização](#4-novos-tipos-de-visualização)
- [5. Features Avançadas](#5-features-avançadas)
- [6. Roadmap de Implementação](#6-roadmap-de-implementação)

---

## 1. Filtros Temporais Avançados

### 1.1. Seletor de Período Predefinido

**Status:** ⚠️ Parcialmente implementado (apenas dias)

**Melhorias:**
- ✅ Manter: 7d, 30d, 60d, 90d (já existe)
- 🆕 Adicionar: "Hoje", "Esta Semana", "Este Mês", "Este Ano"
- 🆕 Adicionar: "Semana Passada", "Mês Passado", "Ano Passado"
- 🆕 Adicionar: "Últimos 3 Meses", "Últimos 6 Meses", "Último Ano"

**Componente:** `DateRangeSelector.tsx`

```tsx
interface DateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: DatePreset[]
}

type DatePreset = 
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'last7Days'
  | 'last30Days'
  | 'last90Days'
  | 'last3Months'
  | 'last6Months'
  | 'custom'

interface DateRange {
  start: Date
  end: Date
  preset?: DatePreset
}
```

### 1.2. Seletor de Mês/Ano

**Status:** ❌ Não implementado

**Features:**
- 🆕 Seletor dropdown para escolher mês/ano específico
- 🆕 Comparação com mês/ano anterior
- 🆕 Visão mensal agregada
- 🆕 Visão anual agregada

**Componente:** `MonthYearSelector.tsx`

```tsx
interface MonthYearSelectorProps {
  selectedMonth?: number // 1-12
  selectedYear?: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  compareWithPrevious?: boolean
}
```

### 1.3. Range Customizado (Date Picker)

**Status:** ❌ Não implementado

**Features:**
- 🆕 Date picker para escolher data inicial e final
- 🆕 Validação de range (não permitir range maior que 2 anos)
- 🆕 Comparação side-by-side (este período vs período anterior)
- 🆕 Presets salvos pelo usuário

**Componente:** `CustomDateRangePicker.tsx`

```tsx
interface CustomDateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onRangeChange: (start: Date, end: Date) => void
  maxRangeDays?: number // default: 730 (2 anos)
  savedRanges?: SavedDateRange[]
}

interface SavedDateRange {
  id: string
  name: string
  start: Date
  end: Date
}
```

### 1.4. Comparação Temporal

**Status:** ❌ Não implementado

**Features:**
- 🆕 Toggle para comparar com período anterior
- 🆕 Gráfico overlay mostrando ambos períodos
- 🆕 Indicadores de variação (% de mudança)
- 🆕 Detecção automática de sazonalidade

**Componente:** `TemporalComparison.tsx`

---

## 2. Novas Métricas

### 2.1. Métricas de Conversas

**Status:** ⚠️ Parcialmente implementado

**Adicionar:**

#### 2.1.1. Taxa de Resolução
- 🆕 Conversas resolvidas / Total de conversas
- 🆕 Tempo médio de resolução
- 🆕 Taxa de resolução por agente

#### 2.1.2. Taxa de Transferência
- 🆕 Conversas transferidas / Total de conversas
- 🆕 Motivo de transferência (bot → humano, humano → especialista)
- 🆕 Tempo médio até transferência

#### 2.1.3. Satisfação do Cliente (CSAT)
- 🆕 Se tiver feedback/rating dos clientes
- 🆕 Score médio de satisfação
- 🆕 Taxa de resposta a pesquisas de satisfação

#### 2.1.4. Primeira Resposta (First Response Time)
- 🆕 Tempo médio até primeira resposta
- 🆕 Distribuição por faixas (instantâneo, < 1min, < 5min, etc)
- 🆕 Comparação bot vs humano

### 2.2. Métricas de Performance

**Status:** ❌ Não implementado

**Adicionar:**

#### 2.2.1. Latência e Performance
- 🆕 Latência média de resposta da IA (p50, p95, p99)
- 🆕 Taxa de timeout/erros
- 🆕 Uptime do sistema (% de tempo online)

#### 2.2.2. Cache Hit Rate
- 🆕 Taxa de cache hit (já existe no AI Gateway)
- 🆕 Economia de custo com cache
- 🆕 Cache hit por tipo de query

#### 2.2.3. Taxa de Erro
- 🆕 Erros por tipo (API, timeout, validação, etc)
- 🆕 Taxa de erro por provider
- 🆕 Tendência de erros ao longo do tempo

### 2.3. Métricas Financeiras

**Status:** ⚠️ Parcialmente implementado (custo básico)

**Adicionar:**

#### 2.3.1. Custo Detalhado
- 🆕 Custo por conversa (média)
- 🆕 Custo por mensagem
- 🆕 Custo por cliente
- 🆕 ROI estimado (se tiver dados de receita)

#### 2.3.2. Previsão de Custo
- 🆕 Projeção de custo para próximo mês
- 🆕 Alerta se custo projetado excede orçamento
- 🆕 Análise de tendência de custo

#### 2.3.3. Breakdown de Custo
- 🆕 Custo por modelo (GPT-4, GPT-3.5, Llama, etc)
- 🆕 Custo por tipo de operação (chat, embeddings, TTS, etc)
- 🆕 Custo por provider (OpenAI, Groq, etc)

### 2.4. Métricas de Engajamento

**Status:** ❌ Não implementado

**Adicionar:**

#### 2.4.1. Engajamento do Cliente
- 🆕 Taxa de retorno de clientes
- 🆕 Frequência de mensagens por cliente
- 🆕 Número médio de mensagens por conversa

#### 2.4.2. Horários de Pico
- 🆕 Distribuição de mensagens por hora do dia
- 🆕 Distribuição por dia da semana
- 🆕 Análise de sazonalidade

#### 2.4.3. Comportamento do Cliente
- 🆕 Tempo médio de sessão
- 🆕 Taxa de abandono (conversas iniciadas mas não respondidas)
- 🆕 Número de interações até resolução

---

## 3. Melhorias nos Gráficos Existentes

### 3.1. Gráficos de Linha (Line Charts)

**Melhorias:**
- ✅ Manter: Responsividade, tooltips, legendas
- 🆕 Adicionar: Zoom e pan interativo
- 🆕 Adicionar: Marcadores de eventos importantes (ex: mudança de modelo)
- 🆕 Adicionar: Média móvel opcional (7 dias, 30 dias)
- 🆕 Adicionar: Área de confiança/banda de erro
- 🆕 Adicionar: Exportar como imagem (PNG, SVG)

**Componente:** `EnhancedLineChart.tsx`

### 3.2. Gráficos de Barras (Bar Charts)

**Melhorias:**
- ✅ Manter: Agrupamento, cores por categoria
- 🆕 Adicionar: Stacked bars opcional
- 🆕 Adicionar: Barras horizontais opcional
- 🆕 Adicionar: Agrupamento inteligente (se muitas barras, agrupar)
- 🆕 Adicionar: Ordenação (por valor, por data, alfabética)
- 🆕 Adicionar: Valores exibidos nas barras (toggle)

**Componente:** `EnhancedBarChart.tsx`

### 3.3. Gráficos de Área (Area Charts)

**Melhorias:**
- ✅ Manter: Stack areas, gradientes
- 🆕 Adicionar: Opacidade configurável
- 🆕 Adicionar: Interpolação suave (curves)
- 🆕 Adicionar: Destaque ao hover (highlight série)

**Componente:** `EnhancedAreaChart.tsx`

### 3.4. Gráficos Combinados (Composed Charts)

**Melhorias:**
- ✅ Manter: Linha + barra combinados
- 🆕 Adicionar: Múltiplos eixos Y (escalas diferentes)
- 🆕 Adicionar: Linha de tendência automática
- 🆕 Adicionar: Anotações customizáveis

**Componente:** `EnhancedComposedChart.tsx`

### 3.5. Tooltips e Interatividade

**Melhorias:**
- 🆕 Tooltip compartilhado entre gráficos (sincronizado)
- 🆕 Tooltip customizável (formato de número, moeda, etc)
- 🆕 Crosshair (linha vertical ao passar mouse)
- 🆕 Highlight de série ao hover
- 🆕 Clique para filtrar/drill-down

### 3.6. Performance

**Melhorias:**
- 🆕 Virtualização para grandes datasets (> 1000 pontos)
- 🆕 Debounce em redraws
- 🆕 Lazy loading de gráficos fora da viewport
- 🆕 Memoização de cálculos pesados

---

## 4. Novos Tipos de Visualização

### 4.1. Heatmaps (Calendário de Atividade)

**Uso:** Mostrar atividade por dia/semana do mês

**Exemplo:**
- 🆕 Heatmap de mensagens por dia (estilo GitHub contributions)
- 🆕 Heatmap de custo por dia
- 🆕 Heatmap de conversas por hora do dia

**Componente:** `ActivityHeatmap.tsx`

### 4.2. Gráficos de Funil (Funnel Charts)

**Uso:** Mostrar conversão entre etapas

**Exemplo:**
- 🆕 Funil de conversões: Conversas iniciadas → Primeira resposta → Resolvidas
- 🆕 Funil de transferências: Bot → Humano → Especialista

**Componente:** `FunnelChart.tsx`

### 4.3. Gráficos de Gauge/KPI

**Uso:** Mostrar métricas em formato de gauge

**Exemplo:**
- 🆕 Gauge de satisfação do cliente (0-100%)
- 🆕 Gauge de utilização de orçamento
- 🆕 Gauge de taxa de cache hit

**Componente:** `GaugeChart.tsx`

### 4.4. Gráficos de Sankey (Fluxo)

**Uso:** Mostrar fluxo de dados entre categorias

**Exemplo:**
- 🆕 Fluxo de conversas por status
- 🆕 Fluxo de custo por provider → modelo → operação

**Componente:** `SankeyChart.tsx`

### 4.5. Gráficos de Radar (Spider)

**Uso:** Comparar múltiplas métricas de uma vez

**Exemplo:**
- 🆕 Radar de performance (latência, taxa de erro, uptime, etc)
- 🆕 Radar comparando diferentes períodos

**Componente:** `RadarChart.tsx`

### 4.6. Mapas de Árvore (Treemap)

**Uso:** Mostrar hierarquia e proporção

**Exemplo:**
- 🆕 Treemap de custo por modelo
- 🆕 Treemap de conversas por status/tipo

**Componente:** `TreemapChart.tsx`

### 4.7. Gráficos de Waterfall

**Uso:** Mostrar mudanças incrementais

**Exemplo:**
- 🆕 Waterfall de custo mensal (breakdown por provider)
- 🆕 Waterfall de conversas (novas, transferidas, resolvidas)

**Componente:** `WaterfallChart.tsx`

---

## 5. Features Avançadas

### 5.1. Dashboard Comparativo

**Features:**
- 🆕 Comparar múltiplos períodos lado a lado
- 🆕 Comparar métricas entre diferentes clientes (admin)
- 🆕 Comparar diferentes modelos/providers
- 🆕 Exportar comparação como relatório PDF

**Componente:** `ComparativeDashboard.tsx`

### 5.2. Alertas e Notificações

**Features:**
- 🆕 Alertas configuráveis por métrica (ex: custo > $X)
- 🆕 Notificações quando métrica atinge threshold
- 🆕 Alertas de anomalias (detecção automática)
- 🆕 Histórico de alertas

**Componente:** `MetricsAlerts.tsx`

### 5.3. Exportação de Dados

**Features:**
- 🆕 Exportar gráfico como imagem (PNG, SVG)
- 🆕 Exportar dados como CSV/Excel
- 🆕 Exportar relatório completo como PDF
- 🆕 Agendamento de relatórios automáticos (email)

**Componente:** `ExportDialog.tsx`

### 5.4. Widgets Personalizados

**Features:**
- 🆕 Criar widgets customizados (métricas calculadas)
- 🆕 Compartilhar widgets com outros usuários
- 🆕 Marketplace de widgets (comunidade)

**Componente:** `WidgetBuilder.tsx`

### 5.5. Análise Preditiva

**Features:**
- 🆕 Previsão de tendências usando ML simples
- 🆕 Detecção de anomalias automática
- 🆕 Projeção de custo futuro
- 🆕 Sugestões de otimização

**Componente:** `PredictiveAnalytics.tsx`

### 5.6. Drill-Down Interativo

**Features:**
- 🆕 Clicar em gráfico para ver detalhes
- 🆕 Navegação hierárquica (geral → detalhado)
- 🆕 Breadcrumbs para navegação
- 🆕 Filtros contextuais

**Componente:** `DrillDownNavigator.tsx`

### 5.7. Compartilhamento e Colaboração

**Features:**
- 🆕 Compartilhar dashboard via link (read-only)
- 🆕 Comentários/notas em gráficos
- 🆕 Salvar configurações como templates
- 🆕 Histórico de versões do dashboard

**Componente:** `ShareDialog.tsx`

---

## 6. Roadmap de Implementação

### 📅 Fase 1: Fundação (Semana 1-2)

**Objetivo:** Melhorar filtros temporais e métricas básicas

**Tasks:**
- [ ] ✅ Implementar `DateRangeSelector` com presets expandidos
- [ ] ✅ Implementar `MonthYearSelector`
- [ ] ✅ Implementar `CustomDateRangePicker` (usando react-datepicker ou similar)
- [ ] ✅ Atualizar API `/api/dashboard/metrics` para suportar novos filtros
- [ ] ✅ Adicionar métricas de taxa de resolução
- [ ] ✅ Adicionar métricas de primeira resposta
- [ ] ✅ Testar e documentar

**Tempo Estimado:** 40-60h  
**Prioridade:** 🔴 CRÍTICA

---

### 📅 Fase 2: Melhorias nos Gráficos (Semana 3-4)

**Objetivo:** Aprimorar gráficos existentes com interatividade

**Tasks:**
- [ ] ✅ Criar `EnhancedLineChart` com zoom/pan
- [ ] ✅ Criar `EnhancedBarChart` com stacked bars
- [ ] ✅ Criar `EnhancedAreaChart` com opacidade configurável
- [ ] ✅ Implementar tooltip compartilhado
- [ ] ✅ Adicionar exportação de imagens (PNG, SVG)
- [ ] ✅ Melhorar performance (virtualização)
- [ ] ✅ Testar e documentar

**Tempo Estimado:** 50-70h  
**Prioridade:** 🟡 ALTA

---

### 📅 Fase 3: Novas Visualizações (Semana 5-7)

**Objetivo:** Adicionar novos tipos de gráficos

**Tasks:**
- [ ] ✅ Implementar `ActivityHeatmap` (usando react-heatmap-grid ou similar)
- [ ] ✅ Implementar `FunnelChart` (usando recharts ou custom)
- [ ] ✅ Implementar `GaugeChart` (usando react-gauge-chart)
- [ ] ✅ Implementar `RadarChart` (Recharts já tem)
- [ ] ✅ Implementar `TreemapChart` (Recharts já tem)
- [ ] ✅ Testar e documentar

**Tempo Estimado:** 60-80h  
**Prioridade:** 🟡 ALTA

---

### 📅 Fase 4: Métricas Avançadas (Semana 8-9)

**Objetivo:** Adicionar métricas mais sofisticadas

**Tasks:**
- [ ] ✅ Implementar métricas de latência (p50, p95, p99)
- [ ] ✅ Implementar métricas de cache hit rate
- [ ] ✅ Implementar métricas de taxa de erro
- [ ] ✅ Implementar breakdown de custo detalhado
- [ ] ✅ Implementar previsão de custo (ML simples)
- [ ] ✅ Atualizar API com novas queries
- [ ] ✅ Testar e documentar

**Tempo Estimado:** 50-70h  
**Prioridade:** 🟢 MÉDIA

---

### 📅 Fase 5: Features Avançadas (Semana 10-12)

**Objetivo:** Adicionar recursos de análise avançada

**Tasks:**
- [ ] ✅ Implementar `ComparativeDashboard`
- [ ] ✅ Implementar `MetricsAlerts` (alertas configuráveis)
- [ ] ✅ Implementar `ExportDialog` (exportação completa)
- [ ] ✅ Implementar `DrillDownNavigator`
- [ ] ✅ Implementar compartilhamento de dashboards
- [ ] ✅ Testar e documentar

**Tempo Estimado:** 80-100h  
**Prioridade:** 🟢 MÉDIA

---

## 📊 Priorização

### 🔴 CRÍTICO (Fazer Primeiro)
1. Filtros temporais avançados (mês/ano/custom)
2. Métricas básicas adicionais (taxa de resolução, primeira resposta)
3. Melhorias nos gráficos existentes (zoom, tooltips)

### 🟡 ALTA (Fazer em Seguida)
4. Novas visualizações (heatmap, funnel, gauge)
5. Métricas de performance (latência, erro)
6. Exportação de dados

### 🟢 MÉDIA (Fazer Depois)
7. Alertas e notificações
8. Análise preditiva
9. Compartilhamento e colaboração

---

## 🛠️ Dependências e Bibliotecas

### Bibliotecas Necessárias

#### Já Instaladas:
- ✅ `recharts` - Gráficos principais
- ✅ `date-fns` - Manipulação de datas
- ✅ `lucide-react` - Ícones

#### Instalar:
- 🆕 `react-datepicker` ou `@radix-ui/react-calendar` - Date picker
- 🆕 `react-gauge-chart` - Gauge charts
- 🆕 `react-heatmap-grid` ou `@nivo/heatmap` - Heatmaps
- 🆕 `jspdf` + `html2canvas` - Exportação PDF
- 🆕 `xlsx` ou `papaparse` - Exportação Excel/CSV

### APIs Necessárias

#### Modificar:
- 🔧 `/api/dashboard/metrics` - Adicionar suporte a filtros avançados
- 🔧 `/api/analytics` - Adicionar novas métricas

#### Criar:
- 🆕 `/api/analytics/alerts` - Gerenciar alertas
- 🆕 `/api/analytics/export` - Exportar dados
- 🆕 `/api/analytics/predictions` - Previsões ML

---

## 📝 Notas de Implementação

### Performance

- **Virtualização:** Usar `react-window` para listas longas
- **Memoização:** Usar `React.memo` e `useMemo` para cálculos pesados
- **Lazy Loading:** Carregar gráficos apenas quando visíveis (IntersectionObserver)

### Acessibilidade

- **ARIA Labels:** Todos os gráficos devem ter labels descritivos
- **Keyboard Navigation:** Suportar navegação por teclado
- **Screen Readers:** Garantir compatibilidade com leitores de tela

### Design System

- **Cores:** Usar paleta UZZ.AI (mint, blue, gold, silver)
- **Dark Theme:** Todos os gráficos devem suportar dark theme
- **Responsividade:** Funcionar bem em mobile, tablet e desktop

---

## ✅ Checklist de Conclusão

### Fase 1 - Fundação
- [ ] DateRangeSelector implementado e testado
- [ ] MonthYearSelector implementado e testado
- [ ] CustomDateRangePicker implementado e testado
- [ ] API atualizada com novos filtros
- [ ] Métricas adicionais implementadas
- [ ] Documentação atualizada

### Fase 2 - Melhorias Gráficos
- [ ] EnhancedLineChart implementado
- [ ] EnhancedBarChart implementado
- [ ] EnhancedAreaChart implementado
- [ ] Tooltip compartilhado implementado
- [ ] Exportação de imagens funcionando
- [ ] Performance otimizada

### Fase 3 - Novas Visualizações
- [ ] ActivityHeatmap implementado
- [ ] FunnelChart implementado
- [ ] GaugeChart implementado
- [ ] RadarChart implementado
- [ ] TreemapChart implementado

### Fase 4 - Métricas Avançadas
- [ ] Métricas de latência implementadas
- [ ] Métricas de cache implementadas
- [ ] Métricas de erro implementadas
- [ ] Breakdown de custo implementado
- [ ] Previsão de custo implementada

### Fase 5 - Features Avançadas
- [ ] ComparativeDashboard implementado
- [ ] MetricsAlerts implementado
- [ ] ExportDialog implementado
- [ ] DrillDownNavigator implementado
- [ ] ShareDialog implementado

---

## 📚 Referências

### Bibliotecas de Gráficos
- [Recharts](https://recharts.org/) - Gráficos React
- [Nivo](https://nivo.rocks/) - Gráficos avançados
- [React Gauge Chart](https://github.com/Martin36/react-gauge-chart)
- [React Heatmap Grid](https://github.com/arunghosh/react-grid-heatmap)

### Componentes UI
- [Radix UI Calendar](https://www.radix-ui.com/primitives/docs/components/calendar)
- [React Datepicker](https://reactdatepicker.com/)

### Exportação
- [jsPDF](https://github.com/parallax/jsPDF)
- [html2canvas](https://html2canvas.hertzen.com/)
- [SheetJS (xlsx)](https://sheetjs.com/)

---

**Última Atualização:** 2026-01-16  
**Autor:** Sistema de Planejamento  
**Versão:** 1.0

