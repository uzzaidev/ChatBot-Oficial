# Plano de Migração de Cores para Tema Claro/Escuro

> **Data:** 28/01/2026
> **Status:** Em progresso (Alta Prioridade Completa ✓)

---

## O Que Já Foi Feito

### Infraestrutura (Completo)
- [x] `next-themes` instalado
- [x] `ThemeProvider.tsx` criado
- [x] `ThemeToggle.tsx` criado e adicionado ao header
- [x] `globals.css` atualizado com variáveis CSS para ambos os temas
- [x] `tailwind.config.ts` atualizado com tokens semânticos

### Componentes Migrados (Completo)
- [x] `ConversationList.tsx`
- [x] `ConversationTable.tsx`
- [x] `ConversationPageClient.tsx`
- [x] Landing pages (Hero, Plans, Security, FinalCTA, Highlights)
- [x] `budget-plans/page.tsx`
- [x] Charts:
  - [x] `ActivityHeatmap.tsx`
  - [x] `FunnelChart.tsx`
  - [x] `TreemapChart.tsx`
  - [x] `GaugeChart.tsx`
  - [x] `RadarChart.tsx`

### Alta Prioridade (Completo - 28/01/2026)
- [x] `src/app/(auth)/login/page.tsx` - cores de tema atualizadas
- [x] `src/app/(auth)/register/page.tsx` - cores de tema atualizadas
- [x] `src/components/AnalyticsClient.tsx` - cores de tema atualizadas
- [x] `src/components/ExportDialog.tsx` - cores de tema + useTheme para exports
- [x] `src/components/CustomDateRangePicker.tsx` - cores de tema atualizadas
- [x] `src/components/MonthYearSelector.tsx` - cores de tema atualizadas
- [x] `src/components/NotificationBell.tsx` - cores de tema atualizadas

---

## Arquivos Pendentes

### MÉDIA PRIORIDADE

#### 1. `src/components/CustomizableChart.tsx` (~5 instâncias)
```
Já usa useTheme() mas com hex hardcoded:
- Linha 60: tooltipBg = isDark ? '#1e2530' : '#ffffff'
- Linha 62-64: tooltipLabelColor, tooltipItemColor, legendColor
- Linha 87: backgroundColor canvas
```

#### 2. `src/components/ChartConfigModal.tsx` (~5 instâncias)
```
- focus:bg-white/10 focus:text-white → focus:bg-muted focus:text-foreground
```

#### 3. `src/components/ConversationMetricCard.tsx` (~7 instâncias)
```
- text-white → text-foreground
```

#### 4. `src/components/AdvancedDateFilters.tsx` (~4 instâncias)
```
- text-uzz-silver → text-muted-foreground
```

#### 5. `src/components/InteractiveListMessage.tsx` (~6 instâncias)
```
- text-white → text-foreground
```

#### 6. `src/components/InteractiveButtonsMessage.tsx` (~4 instâncias)
```
- text-white → text-foreground
```

#### 7. `src/components/AudioMessage.tsx` (~2 instâncias)
```
- 'rgba(255,255,255,0.3)' → theme-aware
- '#3b82f6' → text-secondary
```

#### 8. `src/components/FlowNodeBlock.tsx` (~3 instâncias)
```
- border-blue-500 → border-primary (loading spinner)
```

---

### BAIXA PRIORIDADE

#### 9. `src/app/components-showcase/page.tsx` (~28 instâncias)
```
Página de demonstração - não é crítica
- text-white → text-foreground
- bg-white/5 → bg-muted/30
- hover:bg-white/5 → hover:bg-muted/50
```

---

## Cores que DEVEM Permanecer Fixas

### Cores de Séries em Gráficos
Estas são cores de dados que identificam cada série:
- OpenAI: `#10b981` (verde)
- Groq: `#8b5cf6` (roxo)
- Meta: `#f59e0b` (laranja)
- Whisper: `#3b82f6` (azul)

Arquivos OK (não precisam mudar):
- `DailyUsageChart.tsx`
- `WeeklyUsageChart.tsx`
- `LatencyChart.tsx`
- `ModelComparisonChart.tsx`
- `ProviderBreakdownChart.tsx`

### Cores de Categoria em Flow Diagrams
Cores que identificam tipos de nós:
- Preprocessing: `#3B82F6`
- Analysis: `#F59E0B`
- Generation: `#10B981`
- Output: `#EF4444`

Arquivos OK:
- `FlowArchitectureCanvas.tsx`
- `FlowCanvas.tsx`

### Cores de Status
Cores que identificam status de conversa:
- Humano: `#1ABC9C`
- Bot: `#2E86AB`
- Fluxo: `#9b59b6`
- Transferido: `#fb923c`

---

## Tabela de Mapeamento de Cores

| Valor Hardcoded | Substituição Semântica |
|-----------------|------------------------|
| `bg-[#0f1419]` | `bg-background` |
| `bg-[#1a1f26]` | `bg-card` |
| `bg-[#1e2530]` | `bg-popover` |
| `bg-[#252525]` | `bg-surface` |
| `text-white` | `text-foreground` |
| `text-white/50`, `text-white/60` | `text-muted-foreground` |
| `text-uzz-silver` | `text-muted-foreground` |
| `text-uzz-mint` | `text-primary` |
| `border-white/5` | `border-border/50` |
| `border-white/10` | `border-border` |
| `hover:bg-white/10` | `hover:bg-muted` |
| `hover:bg-white/5` | `hover:bg-muted/50` |
| `bg-white/5` | `bg-muted/30` |
| `bg-white/10` | `bg-muted/50` |
| `focus:text-white` | `focus:text-foreground` |
| `focus:bg-white/10` | `focus:bg-muted` |

---

## Como Continuar

### Ordem Recomendada
1. Auth pages (login/register) - impacto direto em novos usuários
2. AnalyticsClient + ExportDialog - dashboard principal
3. Date pickers (CustomDateRangePicker, MonthYearSelector)
4. NotificationBell - header
5. Demais componentes de média prioridade
6. Showcase page (se necessário)

### Comando para Verificar
```bash
# Verificar se TypeScript compila sem erros
npx tsc --noEmit

# Verificar build completo
npm run build
```

### Teste Manual
1. Abrir o app em `http://localhost:3000`
2. Clicar no toggle de tema (sol/lua no header)
3. Verificar cada página em ambos os temas
4. Verificar que cores adaptam corretamente

---

## Estatísticas

- **Total de arquivos identificados:** ~45+
- **Arquivos já migrados:** ~22
- **Arquivos pendentes (média/baixa prioridade):** ~9
- **Alta prioridade:** ✅ 100% completo
- **Instâncias de cores hardcoded restantes:** ~70+

---

## Última Atualização

**28/01/2026** - Completados todos os arquivos de alta prioridade:
- Auth pages (login, register)
- AnalyticsClient
- ExportDialog (com useTheme para exports)
- CustomDateRangePicker
- MonthYearSelector
- NotificationBell
