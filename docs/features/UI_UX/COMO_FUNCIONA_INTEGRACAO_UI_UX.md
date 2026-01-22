# 🎨 Como Funciona a Integração UI/UX do Projeto

**Última Atualização:** 2026-01-16  
**Status:** ✅ Sistema Completo e Funcional

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Bibliotecas e Ferramentas](#bibliotecas-e-ferramentas)
4. [Sistema de Cores](#sistema-de-cores)
5. [Componentes UI](#componentes-ui)
6. [Temas e Estilos](#temas-e-estilos)
7. [Layout e Navegação](#layout-e-navegação)
8. [Responsividade](#responsividade)
9. [Como Usar](#como-usar)

---

## 🎯 Visão Geral

O projeto utiliza uma **arquitetura moderna de UI/UX** baseada em:

- **shadcn/ui** - Componentes React reutilizáveis
- **Tailwind CSS** - Framework de estilização utilitária
- **Radix UI** - Primitivos acessíveis (usado pelo shadcn)
- **Recharts** - Gráficos e visualizações
- **Dark Theme** - Tema escuro como padrão

### Princípios de Design

- ✅ **Dark Theme** como padrão (cores escuras UZZ.AI)
- ✅ **Identidade Visual UZZ.AI** (mint, blue, gold, silver, black)
- ✅ **Componentes Modulares** e reutilizáveis
- ✅ **Responsivo** (mobile-first)
- ✅ **Acessível** (ARIA, keyboard navigation)

---

## 🏗️ Arquitetura do Sistema

### Estrutura de Arquivos

```
src/
├── app/
│   ├── globals.css          # Estilos globais e variáveis CSS
│   └── layout.tsx           # Layout raiz com fontes e providers
├── components/
│   ├── ui/                  # Componentes shadcn/ui (26 componentes)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   └── DashboardLayoutClient.tsx  # Layout principal do dashboard
└── lib/
    └── utils.ts             # Funções utilitárias (cn, etc.)
```

### Fluxo de Estilização

```
1. globals.css
   └── Define variáveis CSS (--uzzai-mint, --background, etc.)
   
2. tailwind.config.ts
   └── Estende Tailwind com cores UZZ.AI e fontes
   
3. Componentes React
   └── Usam classes Tailwind + variáveis CSS
   
4. Renderização
   └── Next.js compila tudo em CSS otimizado
```

---

## 📦 Bibliotecas e Ferramentas

### 1. **shadcn/ui** (Sistema de Componentes)

**O que é:** Coleção de componentes React baseados em Radix UI

**Como funciona:**
- Componentes são **copiados** para `src/components/ui/` (não instalados via npm)
- Cada componente é **customizável** e pode ser editado diretamente
- Baseado em **Radix UI** para acessibilidade

**Componentes Instalados (26):**
```typescript
✅ alert-dialog    ✅ badge         ✅ button
✅ card            ✅ checkbox     ✅ dialog
✅ dropdown-menu   ✅ input        ✅ label
✅ popover         ✅ progress     ✅ scroll-area
✅ select          ✅ separator    ✅ sheet
✅ slider          ✅ switch       ✅ table
✅ tabs            ✅ textarea     ✅ toast
✅ toaster         ✅ tooltip      ✅ toggle-switch
✅ slider-control  ✅ avatar
```

**Configuração:** `components.json`
```json
{
  "style": "default",
  "rsc": true,  // React Server Components
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  }
}
```

### 2. **Tailwind CSS** (Framework de Estilos)

**O que é:** Framework CSS utilitário

**Configuração:** `tailwind.config.ts`

**Cores UZZ.AI Definidas:**
```typescript
'uzz-mint': '#1ABC9C'      // Verde menta (cor principal)
'uzz-blue': '#2E86AB'      // Azul (cor secundária)
'uzz-black': '#1C1C1C'     // Preto
'uzz-silver': '#B0B0B0'    // Prata
'uzz-gold': '#FFD700'      // Ouro
```

**Uso:**
```tsx
<div className="bg-uzz-mint text-white">
  Texto com cor mint
</div>
```

### 3. **Radix UI** (Primitivos Acessíveis)

**O que é:** Biblioteca de componentes acessíveis (usada pelo shadcn)

**Componentes usados:**
- `@radix-ui/react-dialog` - Modais
- `@radix-ui/react-dropdown-menu` - Menus dropdown
- `@radix-ui/react-select` - Seletores
- `@radix-ui/react-tooltip` - Tooltips
- E mais...

**Benefícios:**
- ✅ Acessibilidade (ARIA)
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support

### 4. **Recharts** (Gráficos)

**O que é:** Biblioteca de gráficos React

**Uso no Projeto:**
- Dashboard com gráficos customizáveis
- Analytics e métricas
- Visualizações de dados

**Exemplo:**
```tsx
import { LineChart, Line, XAxis, YAxis } from 'recharts'

<LineChart data={data}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line dataKey="value" stroke="#1ABC9C" />
</LineChart>
```

---

## 🎨 Sistema de Cores

### Variáveis CSS (globals.css)

```css
:root {
  /* Cores da Marca UZZ.AI */
  --uzzai-mint: #1ABC9C;
  --uzzai-blue: #2E86AB;
  --uzzai-black: #1C1C1C;
  --uzzai-silver: #B0B0B0;
  --uzzai-gold: #FFD700;
  
  /* Cores de Status */
  --status-success: #10B981;
  --status-warning: #F59E0B;
  --status-danger: #EF4444;
  --status-info: #3B82F6;
  
  /* Dark Theme (padrão) */
  --background: #0f1419;
  --foreground: 210 40% 98%;
  --card: #1a1f26;
  --primary: 170 76% 39%; /* UZZ.AI Mint */
  --secondary: 203 68% 41%; /* UZZ.AI Blue */
}
```

### Classes Utilitárias Tailwind

**Gradientes:**
```tsx
<div className="bg-gradient-uzz">        // Mint → Blue
<div className="bg-gradient-mint">       // Mint transparente
<div className="bg-gradient-blue">      // Blue transparente
```

**Sombras com Glow:**
```tsx
<div className="shadow-glow">           // Glow mint
<div className="shadow-glow-blue">      // Glow blue
<div className="shadow-glow-gold">      // Glow gold
```

**Cards:**
```tsx
<div className="metric-card">           // Card com borda gradiente no topo
<div className="metric-card-glow">      // Card com efeito hover glow
```

---

## 🧩 Componentes UI

### Estrutura de um Componente shadcn/ui

**Exemplo: `button.tsx`**

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Define variantes usando CVA (Class Variance Authority)
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Como Usar Componentes

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Título</CardTitle>
      </CardHeader>
      <Button variant="default">Clique aqui</Button>
    </Card>
  )
}
```

---

## 🌓 Temas e Estilos

### Dark Theme (Padrão)

**Aplicado em:** `layout.tsx`
```tsx
<body className="font-inter dark">
```

**Cores do Dark Theme:**
- Background: `#0f1419` (muito escuro)
- Cards: `#1a1f26` (escuro)
- Texto: Branco (`210 40% 98%`)
- Bordas: `rgba(255, 255, 255, 0.1)`

### Light Theme (Opcional)

**Definido em:** `globals.css`
```css
.light {
  --background: 0 0% 100%;
  --foreground: 180 3% 15%;
  /* ... */
}
```

**Para ativar:** Adicionar classe `light` no `<html>`

### Customizações CSS

**Classes Customizadas em `globals.css`:**

```css
/* Navegação */
.nav-section-header {
  font-size: 11px;
  font-weight: 700;
  color: var(--uzzai-silver);
  text-transform: uppercase;
}

/* Cards de Métricas */
.metric-card {
  background: linear-gradient(180deg, #1e2530 0%, #1a1f26 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.metric-card::before {
  /* Borda gradiente no topo */
  background: linear-gradient(90deg, var(--uzzai-mint), var(--uzzai-blue));
}
```

---

## 📐 Layout e Navegação

### Estrutura do Layout

```
┌─────────────────────────────────────┐
│  DashboardLayoutClient              │
├──────────┬──────────────────────────┤
│ Sidebar  │ Main Content             │
│ (260px)  │ (flex-1)                 │
│          │                          │
│ - Logo   │ - Header (se houver)     │
│ - Nav    │ - {children}             │
│ - User   │                          │
└──────────┴──────────────────────────┘
```

### Componente: `DashboardLayoutClient.tsx`

**Responsabilidades:**
- Gerencia sidebar (colapsável)
- Layout responsivo (mobile/desktop)
- Navegação entre páginas

**Sidebar Desktop:**
```tsx
<aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen 
                  bg-sidebar-dark border-r border-uzz-mint/10">
  <DashboardNavigation />
</aside>
```

**Sidebar Mobile:**
```tsx
<Sheet> {/* Componente shadcn/ui */}
  <SheetContent>
    <DashboardNavigation />
  </SheetContent>
</Sheet>
```

### Componente: `DashboardNavigation.tsx`

**Funcionalidades:**
- Lista de itens de navegação
- Seções hierárquicas (PRINCIPAL, GESTÃO, etc.)
- Badges (new, beta, admin, dev)
- Tooltips (quando colapsado)
- Estado ativo (highlight)

**Estrutura:**
```tsx
<nav>
  <div className="nav-section-header">PRINCIPAL</div>
  <NavItem href="/dashboard" icon={<Home />} label="Dashboard" />
  <NavItem href="/analytics" icon={<Chart />} label="Analytics" badge="new" />
  
  <div className="nav-section-header">GESTÃO</div>
  <NavItem href="/contacts" icon={<Users />} label="Contatos" />
</nav>
```

---

## 📱 Responsividade

### Breakpoints Tailwind

```css
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

### Estratégia Mobile-First

**Desktop:**
```tsx
<div className="hidden md:flex">  {/* Esconde no mobile */}
  Sidebar fixa
</div>
```

**Mobile:**
```tsx
<div className="md:hidden">       {/* Mostra apenas no mobile */}
  <Sheet>                        {/* Menu hambúrguer */}
    <SheetContent>
      Navegação
    </SheetContent>
  </Sheet>
</div>
```

### Safe Area Insets (Mobile)

**Para dispositivos com notch:**
```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}
```

**Uso:**
```tsx
<div style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
  Conteúdo
</div>
```

---

## 🚀 Como Usar

### 1. Criar um Novo Componente

```tsx
// src/components/MyComponent.tsx
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MyComponent() {
  return (
    <Card className="bg-card-dark">
      <CardHeader>
        <CardTitle className="font-poppins text-uzz-mint">
          Título
        </CardTitle>
      </CardHeader>
      <Button variant="default" className="bg-uzz-mint">
        Botão
      </Button>
    </Card>
  )
}
```

### 2. Usar Cores UZZ.AI

```tsx
// Background
<div className="bg-uzz-mint">
<div className="bg-uzz-blue">
<div className="bg-gradient-uzz">  {/* Gradiente mint → blue */}

// Texto
<p className="text-uzz-mint">
<p className="text-uzz-silver">

// Bordas
<div className="border-uzz-mint">
```

### 3. Criar um Card de Métrica

```tsx
<div className="metric-card">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-uzz-silver text-sm">Total</p>
      <p className="text-2xl font-bold text-white">1,234</p>
    </div>
    <div className="icon-bg-gradient">
      <Chart className="h-6 w-6 text-uzz-mint" />
    </div>
  </div>
</div>
```

### 4. Adicionar um Gráfico

```tsx
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

<Card className="chart-container-dark">
  <CardHeader>
    <CardTitle>Gráfico de Vendas</CardTitle>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" stroke="#B0B0B0" />
        <YAxis stroke="#B0B0B0" />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#1ABC9C" 
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

### 5. Usar Badges e Tooltips

```tsx
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

<Badge variant="new">Novo</Badge>

<Tooltip>
  <TooltipTrigger>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Texto do tooltip</p>
  </TooltipContent>
</Tooltip>
```

---

## 📚 Recursos Adicionais

### Documentação Oficial

- **shadcn/ui:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com
- **Radix UI:** https://www.radix-ui.com
- **Recharts:** https://recharts.org

### Arquivos de Referência no Projeto

- `src/app/globals.css` - Estilos globais
- `tailwind.config.ts` - Configuração Tailwind
- `components.json` - Configuração shadcn
- `src/components/ui/` - Componentes base
- `ATLETICAS-SISTEMA-COMPLETO-V1.html` - Referência visual

---

## ✅ Checklist para Novos Componentes

Ao criar um novo componente, verifique:

- [ ] Usa componentes shadcn/ui quando possível
- [ ] Aplica cores UZZ.AI (`uzz-mint`, `uzz-blue`, etc.)
- [ ] É responsivo (mobile-first)
- [ ] Usa dark theme corretamente
- [ ] Tem estados hover/focus
- [ ] É acessível (ARIA, keyboard)
- [ ] Segue padrões do projeto

---

## 🎯 Resumo

**O sistema de UI/UX funciona assim:**

1. **globals.css** define variáveis CSS e classes customizadas
2. **tailwind.config.ts** estende Tailwind com cores UZZ.AI
3. **shadcn/ui** fornece componentes base reutilizáveis
4. **Componentes customizados** combinam shadcn + Tailwind + CSS
5. **Layout** gerencia estrutura e navegação
6. **Dark theme** é aplicado globalmente
7. **Responsividade** é garantida via Tailwind breakpoints

**Resultado:** Sistema consistente, acessível e fácil de manter! 🎨

