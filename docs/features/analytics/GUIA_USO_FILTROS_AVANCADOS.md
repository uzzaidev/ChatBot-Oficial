# 📅 Guia de Uso - Filtros Temporais Avançados

**Data:** 2026-01-16  
**Versão:** 1.0

---

## 🎯 Visão Geral

Os filtros temporais avançados permitem que você visualize métricas e gráficos para períodos específicos com total flexibilidade.

---

## 🚀 Componentes Disponíveis

### 1. `DateRangeSelector`

**Uso:** Seletor rápido com presets predefinidos

```tsx
import { DateRangeSelector, type DateRange } from '@/components/DateRangeSelector'

const [dateRange, setDateRange] = useState<DateRange>({
  start: new Date(),
  end: new Date(),
  preset: 'last30Days'
})

<DateRangeSelector
  value={dateRange}
  onChange={setDateRange}
/>
```

**Presets Disponíveis:**
- Hoje, Ontem
- Esta Semana, Semana Passada
- Este Mês, Mês Passado
- Este Ano, Ano Passado
- Últimos 7/30/60/90 dias
- Últimos 3/6 meses

---

### 2. `MonthYearSelector`

**Uso:** Selecionar um mês/ano específico

```tsx
import { MonthYearSelector } from '@/components/MonthYearSelector'

const [month, setMonth] = useState(1) // Janeiro
const [year, setYear] = useState(2026)
const [compare, setCompare] = useState(false)

<MonthYearSelector
  selectedMonth={month}
  selectedYear={year}
  onMonthChange={setMonth}
  onYearChange={setYear}
  compareWithPrevious={compare}
  onCompareToggle={setCompare}
/>
```

**Helper Functions:**
```tsx
import { getMonthYearDateRange, getPreviousMonthYear } from '@/components/MonthYearSelector'

// Obter range de datas para um mês/ano
const { start, end } = getMonthYearDateRange(1, 2026) // Janeiro 2026

// Obter mês/ano anterior
const { month, year } = getPreviousMonthYear(1, 2026) // Dezembro 2025
```

---

### 3. `CustomDateRangePicker`

**Uso:** Selecionar range customizado com date picker

```tsx
import { CustomDateRangePicker, type SavedDateRange } from '@/components/CustomDateRangePicker'

const [startDate, setStartDate] = useState<Date>()
const [endDate, setEndDate] = useState<Date>()
const [savedRanges, setSavedRanges] = useState<SavedDateRange[]>([])

const handleSaveRange = (name: string, start: Date, end: Date) => {
  const newRange: SavedDateRange = {
    id: Date.now().toString(),
    name,
    start,
    end
  }
  setSavedRanges([...savedRanges, newRange])
  // Salvar no localStorage ou backend
}

<CustomDateRangePicker
  startDate={startDate}
  endDate={endDate}
  onRangeChange={(start, end) => {
    setStartDate(start)
    setEndDate(end)
  }}
  savedRanges={savedRanges}
  onSaveRange={handleSaveRange}
  maxRangeDays={730} // Máximo 2 anos
/>
```

---

### 4. `AdvancedDateFilters` (Recomendado)

**Uso:** Componente unificado que integra todos os filtros

```tsx
import { AdvancedDateFilters, type DateFilterValue, getEffectiveDateRange } from '@/components/AdvancedDateFilters'

const [dateFilter, setDateFilter] = useState<DateFilterValue>({
  mode: 'preset',
  dateRange: {
    start: new Date(),
    end: new Date(),
    preset: 'last30Days'
  }
})

// Obter range efetivo para usar na API
const { start, end } = getEffectiveDateRange(dateFilter)

<AdvancedDateFilters
  value={dateFilter}
  onChange={setDateFilter}
  savedRanges={savedRanges}
  onSaveRange={handleSaveRange}
/>
```

---

## 🔧 Integração com API

### Formato de Query Params

A API `/api/dashboard/metrics` aceita 3 formatos:

#### 1. Range Customizado (Recomendado)
```typescript
GET /api/dashboard/metrics?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.999Z
```

#### 2. Mês/Ano Específico
```typescript
GET /api/dashboard/metrics?month=1&year=2026
```

#### 3. Dias (Legado - Compatibilidade)
```typescript
GET /api/dashboard/metrics?days=30
```

---

## 📝 Exemplo Completo

```tsx
'use client'

import { useState } from 'react'
import { AdvancedDateFilters, type DateFilterValue, getEffectiveDateRange } from '@/components/AdvancedDateFilters'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'

export function MyAnalyticsDashboard() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    mode: 'preset',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: 'last30Days'
    }
  })

  // Obter range efetivo
  const { start, end } = getEffectiveDateRange(dateFilter)

  // Preparar parâmetros para hook
  const hookParams = (() => {
    if (dateFilter.mode === 'monthYear' && dateFilter.month && dateFilter.year) {
      return { month: dateFilter.month, year: dateFilter.year }
    }
    return { startDate: start, endDate: end }
  })()

  const { metrics, loading, error } = useDashboardMetrics(hookParams)

  return (
    <div>
      {/* Filtros */}
      <AdvancedDateFilters
        value={dateFilter}
        onChange={setDateFilter}
      />

      {/* Métricas */}
      {loading && <div>Carregando...</div>}
      {error && <div>Erro: {error}</div>}
      {metrics && (
        <div>
          {/* Renderizar métricas */}
        </div>
      )}
    </div>
  )
}
```

---

## 🎨 Customização

Todos os componentes seguem o tema dark e podem ser customizados via `className`:

```tsx
<AdvancedDateFilters
  value={dateFilter}
  onChange={setDateFilter}
  className="my-custom-class"
/>
```

---

## ⚠️ Validações

- **Range máximo:** 730 dias (2 anos)
- **Data início:** Deve ser anterior à data fim
- **Mês:** 1-12
- **Ano:** Últimos 5 anos até 2 anos no futuro

---

## 💡 Dicas

1. **Performance:** Para ranges grandes (> 365 dias), considere agregação mensal
2. **UX:** Use presets para ações rápidas e custom para análises específicas
3. **Armazenamento:** Salve ranges favoritos no localStorage ou backend
4. **Comparação:** Use a função `compareWithPrevious` para análise temporal

---

**Última Atualização:** 2026-01-16

