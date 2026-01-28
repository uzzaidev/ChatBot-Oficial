# Plano: Clear Mode (Modo Claro) + Dark Mode Toggle

> **Data:** 27/01/2026
> **Status:** Em andamento
> **Impacto:** 3 arquivos novos, ~28 arquivos modificados
>
> ### Progresso de Implementação
> - [x] **Fase 0: Infraestrutura** (27/01/2026) - `next-themes` instalado, `ThemeProvider` criado, `layout.tsx` atualizado, `globals.css` theme-aware, `tailwind.config.ts` com cores `surface`. Build OK.
> - [x] **Fase 1: Toggle no Header** (27/01/2026) - `ThemeToggle.tsx` criado, adicionado no header desktop e mobile (ao lado do sino). Build OK.
> - [ ] **Fase 2: Migração de Componentes**
> - [ ] **Fase 3: Transição Suave + Acessibilidade**
> - [ ] **Fase 4: Verificação**

---

## Biblioteca: `next-themes`
- Padrão do ecossistema Next.js + shadcn/ui
- Persiste escolha no `localStorage` automaticamente (key: `uzzapp-theme`)
- Previne flash de tema errado no carregamento (FOUC) via script inline
- ~2KB gzipped

---

## Fase 0: Infraestrutura

### 0.1 Instalar next-themes
```bash
npm install next-themes
```

### 0.2 Criar `src/components/ThemeProvider.tsx`
```tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### 0.3 Modificar `src/app/layout.tsx`
- Remover classe `dark` hardcoded do `<body className="font-inter dark">` → `<body className="font-inter">`
- Adicionar `suppressHydrationWarning` no `<html>`
- Envolver children com `<ThemeProvider>`:
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem={false}
  themes={['dark', 'light']}
  storageKey="uzzapp-theme"
>
  {children}
</ThemeProvider>
```

### 0.4 Atualizar `src/app/globals.css`

#### 0.4.1 Body (linha ~84): trocar hardcoded
```css
/* ANTES */
body { @apply bg-[#0f1419] text-white; }

/* DEPOIS */
body { @apply bg-background text-foreground; }
```

#### 0.4.2 Novas CSS variables - adicionar ao `:root` (dark):
```css
:root {
  /* ... variáveis existentes ... */

  /* Novas - superfícies */
  --surface: 215 18% 15%;
  --surface-alt: 215 18% 13%;
  --surface-elevated: 216 22% 15%;
  --surface-sunken: 210 27% 6%;

  /* Novas - texto semântico */
  --text-primary: 0 0% 100%;
  --text-secondary: 0 0% 100% / 0.7;
  --text-tertiary: 0 0% 100% / 0.5;

  /* Novas - bordas semânticas */
  --border-subtle: 0 0% 100% / 0.05;
  --border-medium: 0 0% 100% / 0.1;

  /* Novas - scrollbar */
  --scrollbar-track: 0 0% 100% / 0.02;
  --scrollbar-thumb: 170 76% 39% / 0.3;
  --scrollbar-thumb-hover: 170 76% 39% / 0.5;

  /* Novas - sombras */
  --shadow-color: 0 0% 0%;
}
```

#### 0.4.3 Adicionar ao `.light`:
```css
.light {
  /* ... variáveis existentes ... */
  --primary: 170 76% 33%;           /* Escurecido para contraste WCAG AA em fundo branco */
  --secondary: 203 68% 35%;         /* Idem */
  --accent: 170 76% 33%;
  --foreground: 220 13% 18%;        /* Texto escuro */
  --muted-foreground: 220 9% 42%;   /* Garantir 4.5:1 contraste */

  /* Novas - superfícies */
  --surface: 220 14% 96%;
  --surface-alt: 220 14% 98%;
  --surface-elevated: 0 0% 100%;
  --surface-sunken: 220 14% 94%;

  /* Novas - texto semântico */
  --text-primary: 220 13% 18%;
  --text-secondary: 220 9% 35%;
  --text-tertiary: 220 9% 55%;

  /* Novas - bordas semânticas */
  --border-subtle: 220 13% 95%;
  --border-medium: 220 13% 91%;

  /* Novas - scrollbar */
  --scrollbar-track: 0 0% 0% / 0.03;
  --scrollbar-thumb: 170 76% 39% / 0.25;
  --scrollbar-thumb-hover: 170 76% 39% / 0.4;

  /* Novas - sombras */
  --shadow-color: 220 13% 10%;
}
```

#### 0.4.4 Scrollbar (linhas ~89-106): trocar hardcoded
```css
::-webkit-scrollbar-track {
  background: hsl(var(--scrollbar-track));
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--scrollbar-thumb));
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--scrollbar-thumb-hover));
}
```

#### 0.4.5 Classes custom: atualizar para usar variáveis
```css
.bg-card-dark {
  background: linear-gradient(180deg, hsl(var(--surface)) 0%, hsl(var(--surface-alt)) 100%);
}

.bg-sidebar-dark {
  background: linear-gradient(180deg, hsl(var(--surface-alt)) 0%, hsl(var(--background)) 100%);
}

.metric-card {
  background: linear-gradient(180deg, hsl(var(--surface)) 0%, hsl(var(--surface-alt)) 100%);
  border: 1px solid hsl(var(--border-medium));
  /* ... resto igual ... */
}

.metric-card:hover {
  box-shadow: 0 12px 24px hsl(var(--shadow-color) / 0.15);
}

.chart-container-dark {
  background: linear-gradient(180deg, hsl(var(--surface)) 0%, hsl(var(--surface-alt)) 100%);
  border: 1px solid hsl(var(--border-medium));
}

.chart-tooltip-dark {
  background: hsl(var(--surface-elevated) / 0.95) !important;
  border: 1px solid hsl(var(--primary) / 0.3) !important;
}

.shadow-glow { box-shadow: 0 0 15px hsl(var(--primary) / 0.15); }
.shadow-glow-blue { box-shadow: 0 0 15px hsl(var(--secondary) / 0.15); }

.bg-pattern-dots {
  background-image: radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.05) 1px, transparent 0);
}
```

### 0.5 Atualizar `tailwind.config.ts`
Adicionar em `extend.colors`:
```typescript
surface: {
  DEFAULT: "hsl(var(--surface))",
  alt: "hsl(var(--surface-alt))",
  elevated: "hsl(var(--surface-elevated))",
  sunken: "hsl(var(--surface-sunken))",
},
```

---

## Fase 1: Toggle no Header

### 1.1 Criar `src/components/ThemeToggle.tsx`
```tsx
'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  )
}
```

### 1.2 Adicionar em `src/components/DashboardLayoutClient.tsx`
- Importar `ThemeToggle`
- Posicionar ao lado do `NotificationBell` no header (desktop e mobile)

---

## Fase 2: Migração de Componentes

### Tabela de mapeamento completa:

| Valor Hardcoded | Substituição Semântica |
|---|---|
| `bg-[#0f1419]` | `bg-background` |
| `bg-[#1a1f26]` | `bg-card` |
| `bg-[#252525]` | `bg-surface` |
| `bg-[#1e2530]` | `bg-popover` |
| `bg-[#151515]` | `bg-surface-sunken` |
| `text-white` (contexto de tema) | `text-foreground` |
| `text-white/50` ou `text-white/60` | `text-muted-foreground` |
| `text-white/80` | `text-foreground/80` |
| `text-[#B0B0B0]` | `text-muted-foreground` |
| `text-[#9ca3af]` | `text-muted-foreground` |
| `text-[#1ABC9C]` | `text-primary` |
| `text-[#2E86AB]` | `text-secondary` |
| `border-white/5` | `border-border/50` |
| `border-white/10` | `border-border` |
| `border-[#252525]` | `border-surface` |
| `hover:bg-white/10` | `hover:bg-muted` |
| `hover:bg-white/5` | `hover:bg-muted/50` |
| `bg-white/5` | `bg-muted/30` |
| `bg-white/10` | `bg-muted/50` |
| `style={{ background: 'rgba(28,28,28,0.98)' }}` | `className="bg-card/[0.98]"` |
| `style={{ background: 'linear-gradient(135deg, #252525, #1C1C1C)' }}` | `className="bg-surface"` |
| `style={{ background: 'linear-gradient(135deg, #2E86AB, #1ABC9C)' }}` | Manter (é cor da marca, não muda) |
| `style={{ color: '#1ABC9C' }}` | `className="text-primary"` |
| `style={{ color: '#2E86AB' }}` | `className="text-secondary"` |
| `style={{ color: '#B0B0B0' }}` | `className="text-muted-foreground"` |
| `style={{ color: '#9b59b6' }}` | Manter (status color, mesma em ambos) |
| `style={{ color: '#fb923c' }}` | Manter (status color, mesma em ambos) |
| `from-[#252525] to-[#1f2a28]` | `from-surface to-surface-alt` |
| `from-[#1ABC9C] to-[#2E86AB]` | `from-primary to-secondary` (gradiente da marca) |

### Nota sobre cores de status:
As cores de status (#1ABC9C humano, #2E86AB bot, #9b59b6 fluxo, #fb923c transferido) podem **permanecer hardcoded** pois são cores fixas da marca/identidade visual que funcionam em ambos os fundos. Apenas os **fundos, textos e bordas** precisam adaptar.

---

### Arquivos por prioridade com mudanças específicas:

#### P1 - Layout/Shell (afeta tudo)

**`src/components/DashboardLayoutClient.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~84 | `bg-[#0f1419]` | `bg-background` |
| ~92 | inline `background: linear-gradient(...)` | classe `bg-sidebar-dark` (já theme-aware) |
| ~108 | `bg-[#0f1419]` | `bg-background` |
| ~117 | `bg-[#1a1f26]` | `bg-card` |
| ~142 | inline style background | `bg-card border-b border-border/50` |
| ~152 | `text-white hover:bg-white/10` | `text-foreground hover:bg-muted` |
| ~184 | `bg-[#0f1419]` | `bg-background` |
| Header | - | Adicionar `<ThemeToggle />` ao lado de NotificationBell |

**`src/components/DashboardNavigation.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~44 | `hover:bg-[#1a2a28]` | `hover:bg-primary/10` |
| ~44 | `text-[#9ca3af]` | `text-muted-foreground` |

---

#### P2 - Conversas

**`src/components/ConversationsHeader.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~26 | `style={{ background: 'rgba(28,28,28,0.98)' }}` | `className="bg-card/[0.98]"` |
| ~51-52 | `from-[#252525] to-[#1f2a28]` | `from-surface to-surface-alt` |
| ~56 | `style={{ color: '#1ABC9C' }}` | `className="text-primary"` (condicional) |
| ~78 | `style={{ color: '#2E86AB' }}` | `className="text-secondary"` (condicional) |
| Todos KPIs | `style={{ color: statusFilter === 'x' ? '#COR' : '#B0B0B0' }}` | classes condicionais `text-primary`/`text-muted-foreground` |

**`src/components/ConversationList.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~100 | `from-[#1ABC9C]/10` | `from-primary/10` |
| ~103 | `bg-[#2E86AB]/5 border-l-[#2E86AB]` | `bg-secondary/5 border-l-secondary` |
| ~118,123,128 | `border-[#252525]` | `border-surface` |
| ~159 | `from-[#1ABC9C] to-[#2E86AB]` | `from-primary to-secondary` |
| ~185-203 | inline rgba styles para badges | classes Tailwind com opacity |

**`src/components/ConversationTable.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~62 | `border-[#1ABC9C]/30 text-[#1ABC9C] bg-[#1ABC9C]/10` | `border-primary/30 text-primary bg-primary/10` |
| ~69 | `border-[#9b59b6]/30 text-[#9b59b6] bg-[#9b59b6]/10` | Manter (status color fixo) |
| ~76 | `border-[#2E86AB]/30 text-[#2E86AB] bg-[#2E86AB]/10` | `border-secondary/30 text-secondary bg-secondary/10` |
| ~111 | `style={{ background: '#252525' }}` | `className="bg-surface"` |
| ~165 | inline gradient | Manter (avatar, cor fixa) |
| ~186-187 | `from-[#1ABC9C] to-[#2E86AB]` | `from-primary to-secondary` |
| ~170,175,180 | `border-[#252525]` | `border-surface` |

**`src/components/ConversationDetail.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~648 | `bg-silver-200/90 text-erie-black-700` | Manter (funciona em ambos) |
| ~681 | `border-[#1ABC9C]` | `border-primary` |

**`src/components/ConversationsIndexClient.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~299 | `focus:border-[#1ABC9C]` | `focus:border-primary` |
| ~409 | `bg-[#151515]` | `bg-surface-sunken` |
| ~510 | `from-[#2E86AB] to-[#1ABC9C]` | `from-secondary to-primary` |
| ~563-565 | inline gradient + borderColor | `bg-surface border-primary` |
| ~583 | `from-[#1ABC9C] to-[#2E86AB]` | `from-primary to-secondary` |

---

#### P3 - Mensagens

**`src/components/MessageBubble.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~513 | `from-[#1ABC9C] to-[#2E86AB]` | `from-primary to-secondary` |
| ~220-221 | `bg-silver-50` / `bg-gray-50` | Verificar contraste em light mode |
| Status icons | `text-gray-400`, `text-blue-400` etc. | Manter (funcionam em ambos) |

**`src/components/MessageActionMenu.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~104 | `bg-white/80 hover:bg-white` | `bg-card/80 hover:bg-card` |
| ~105 | `bg-gray-100` | `bg-muted` |
| ~116 | `bg-white dark:bg-zinc-800` | `bg-card` |

**`src/components/DateSeparator.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~16 | `bg-silver-200/80 text-erie-black-700` | Manter (contraste ok em ambos) |

---

#### P4 - Dashboard

**`src/components/ContactsClient.tsx`**
| Linha | Antes | Depois |
|-------|-------|--------|
| ~327-328 | `color: '#1ABC9C'` | `className="text-primary"` |
| ~531-559 | `border-[#1ABC9C]`, `border-[#2E86AB]`, `border-[#9b59b6]` | `border-primary`, `border-secondary`, manter purple |
| ~572 | `border-b-2 border-[#1ABC9C]` | `border-b-2 border-primary` |
| ~606 | `from-[#2E86AB] to-[#1ABC9C]` | `from-secondary to-primary` |
| ~634 | `bg-[#252525] border-white/10` | `bg-surface border-border` |
| ~746-748 | inline gradient + borderColor | `bg-surface border-primary` |

**`src/components/MetricCard.tsx`** - já atualizado via classe `.metric-card` na Fase 0

**`src/components/SendMessageForm.tsx`** - verificar inputs e botões

---

#### P5 - Charts

**Criar `src/hooks/useThemeColors.ts`:**
```tsx
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export const useThemeColors = () => {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = !mounted || theme === 'dark'

  return {
    isDark,
    heatmapEmpty: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    heatmapLow: 'rgba(26,188,156,0.3)',
    heatmapMedium: 'rgba(26,188,156,0.5)',
    heatmapHigh: 'rgba(26,188,156,0.7)',
    heatmapMax: 'rgba(26,188,156,1)',
    chartGrid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    chartText: isDark ? '#B0B0B0' : '#6B7280',
    cellBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    tooltipBg: isDark ? 'rgba(30,37,48,0.95)' : 'rgba(255,255,255,0.95)',
  }
}
```

**`src/components/charts/ActivityHeatmap.tsx`**
- Importar `useThemeColors`
- Substituir cores hardcoded no `getColor()` e inline styles
- `bg-[#1a1f26]` → `bg-card`

**`src/components/charts/FunnelChart.tsx`**
**`src/components/charts/TreemapChart.tsx`**
**`src/components/charts/GaugeChart.tsx`**
- Arrays de cores (`['#1ABC9C', '#2E86AB', ...]`) podem manter - são cores da marca
- Backgrounds e grids: usar `useThemeColors`

---

#### P6 - Landing Page

**`src/components/landing/Hero.tsx`**
| Antes | Depois |
|-------|--------|
| `bg-[#0f1419]` | `bg-background` |
| `from-[#0f1419] via-[#1a1f26]` | `from-background via-card` |
| `bg-[#1ABC9C]/20` | `bg-primary/20` |
| `text-[#1ABC9C]` | `text-primary` |

**`src/components/landing/Plans.tsx`**
| Antes | Depois |
|-------|--------|
| `border-[#1ABC9C]/50` | `border-primary/50` |
| `shadow-[#1ABC9C]/30` | `shadow-primary/30` |
| `from-[#1ABC9C] to-[#2E86AB]` | `from-primary to-secondary` |

**`src/components/landing/Security.tsx`**
**`src/components/landing/FinalCTA.tsx`**
**`src/components/landing/Highlights.tsx`**
- Mesmo padrão: trocar hex por tokens semânticos

---

#### P7 - shadcn/ui

**`src/components/ui/switch.tsx`**
| Antes | Depois |
|-------|--------|
| `data-[state=checked]:bg-[#1ABC9C]` | `data-[state=checked]:bg-primary` |
| `data-[state=checked]:shadow-[#1ABC9C]/30` | `data-[state=checked]:shadow-primary/30` |

**`src/components/ui/slider.tsx`**
| Antes | Depois |
|-------|--------|
| `from-[#1ABC9C] to-[#16a085]` | `from-primary to-primary/80` |
| `border-[#1ABC9C]` | `border-primary` |
| `ring-[#1ABC9C]/30` | `ring-primary/30` |

---

## Fase 3: Transição Suave + Acessibilidade

### 3.1 Transição CSS
Adicionar em `globals.css`:
```css
html.transitioning,
html.transitioning * {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.2s ease !important;
}
```
A classe `transitioning` é adicionada temporariamente pelo ThemeToggle ao trocar tema.

### 3.2 Contraste WCAG AA no Light Mode
- Primary (#1ABC9C → HSL 170 76% 33%): ratio 4.5:1 em branco
- Secondary (#2E86AB → HSL 203 68% 35%): ratio 4.5:1 em branco
- Muted foreground: HSL 220 9% 42% garante 4.5:1

### 3.3 Atualizar `src/lib/design-tokens.ts`
- Trocar qualquer referência a cores hardcoded por classes semânticas (text-foreground, bg-card, etc.)

---

## Fase 4: Verificação

### Checklist de teste:
1. `npm run dev` → verificar toggle (sol/lua) no header
2. Clicar no toggle → tema muda suavemente
3. Recarregar página → tema persiste (localStorage)
4. Verificar cada página em AMBOS os temas:
   - [ ] Dashboard principal
   - [ ] Lista de conversas
   - [ ] Detalhe de conversa (bubbles, menus)
   - [ ] Contatos
   - [ ] Charts/Analytics
   - [ ] Landing page
   - [ ] Configurações
5. Verificar scrollbars adaptam
6. Verificar gráficos legíveis em ambos
7. `npx tsc --noEmit` → sem erros
8. `npm run build` → build limpo

---

## Resumo Final

### Arquivos Novos (3)
| Arquivo | Propósito |
|---------|-----------|
| `src/components/ThemeProvider.tsx` | Wrapper next-themes |
| `src/components/ThemeToggle.tsx` | Botão sol/lua no header |
| `src/hooks/useThemeColors.ts` | Cores dinâmicas para charts |

### Arquivos Modificados (~28)
| Arquivo | Mudanças |
|---------|----------|
| `src/app/globals.css` | CSS variables, body, utilities, scrollbar |
| `src/app/layout.tsx` | ThemeProvider, remover dark class |
| `tailwind.config.ts` | Cores semânticas surface |
| `src/lib/design-tokens.ts` | Tokens semânticos |
| `src/components/DashboardLayoutClient.tsx` | 7 cores + ThemeToggle |
| `src/components/DashboardNavigation.tsx` | 2 cores |
| `src/components/ConversationsHeader.tsx` | 15+ cores/inline styles |
| `src/components/ConversationList.tsx` | 12 cores |
| `src/components/ConversationTable.tsx` | 18 cores |
| `src/components/ConversationDetail.tsx` | 2 cores |
| `src/components/ConversationsIndexClient.tsx` | 5 cores |
| `src/components/MessageBubble.tsx` | 3 cores |
| `src/components/MessageActionMenu.tsx` | 3 cores |
| `src/components/DateSeparator.tsx` | Verificar |
| `src/components/ContactsClient.tsx` | 16 cores |
| `src/components/MetricCard.tsx` | Via CSS class |
| `src/components/SendMessageForm.tsx` | Verificar inputs |
| `src/components/charts/ActivityHeatmap.tsx` | useThemeColors |
| `src/components/charts/FunnelChart.tsx` | Grids/texto |
| `src/components/charts/TreemapChart.tsx` | Grids/texto |
| `src/components/charts/GaugeChart.tsx` | Grids/texto |
| `src/components/landing/Hero.tsx` | 4 cores |
| `src/components/landing/Plans.tsx` | 5 cores |
| `src/components/landing/Security.tsx` | 3 cores |
| `src/components/landing/FinalCTA.tsx` | 2 cores |
| `src/components/landing/Highlights.tsx` | 3 cores |
| `src/components/ui/switch.tsx` | 2 cores |
| `src/components/ui/slider.tsx` | 3 cores |
