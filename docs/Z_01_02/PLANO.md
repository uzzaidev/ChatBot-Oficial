# 📋 Plano de Modificações - Seção de Conversas

## 🎯 Objetivo Geral
Modernizar a interface da seção de conversas seguindo o design do arquivo `Test UX UI   CONVERSAS.html`, com foco em:
1. Cores dos balões de mensagem mais claras (estilo WhatsApp Web oficial)
2. Header reorganizado em grid 3x3 com filtros customizáveis

---

## 📦 PARTE 1: Mudança de Cores dos Balões de Mensagem

### 1.1. Análise do Estado Atual
**Arquivo:** `src/components/MessageBubble.tsx` (linha 519)

**Cores Atuais:**
- **Mensagens Enviadas (outgoing):**
  ```tsx
  bg-gradient-to-br from-primary to-secondary
  ```
  - `primary` = `#1ABC9C` (verde menta UZZ.AI)
  - `secondary` = `#2E86AB` (azul UZZ.AI)
  - Resultado: Gradiente verde-azul escuro

- **Mensagens Recebidas (incoming):**
  ```tsx
  bg-[hsl(var(--message-incoming-bg))]
  ```
  - **Dark mode:** `--message-incoming-bg: 210 14% 20%` = `#2d3338` (cinza escuro)
  - **Light mode:** `--message-incoming-bg: 0 0% 100%` = branco

### 1.2. Cores do HTML de Referência
**Arquivo:** `Test UX UI   CONVERSAS.html`

- **Mensagens Enviadas:** `#005c4b` (linha 401) - Verde escuro WhatsApp oficial
- **Mensagens Recebidas:** `#202c33` (linha 395) - Cinza escuro WhatsApp

### 1.3. Modificações Necessárias

#### 1.3.1. Atualizar `globals.css`
**Arquivo:** `src/app/globals.css`

**Adicionar novas variáveis CSS:**
```css
/* Message bubble colors (WhatsApp-style) - ATUALIZAR */
/* Dark mode */
:root {
  --message-outgoing-bg: 153 57% 18%; /* #005c4b - Verde WhatsApp oficial */
  --message-incoming-bg: 210 14% 20%; /* #2d3338 - Cinza escuro (mantém atual) */
  --message-incoming-text: 210 40% 98%; /* Light text (mantém atual) */
}

/* Light mode */
.light {
  --message-outgoing-bg: 153 57% 18%; /* #005c4b - Verde WhatsApp oficial (mesma cor) */
  --message-incoming-bg: 0 0% 100%; /* Branco (mantém atual) */
  --message-incoming-text: 220 13% 18%; /* Dark text (mantém atual) */
}
```

**Explicação HSL para #005c4b:**
- Hex: `#005c4b`
- RGB: `rgb(0, 92, 75)`
- HSL: `hsl(153, 100%, 18%)` → Tailwind format: `153 100% 18%`
- Ajustado para: `153 57% 18%` (saturação reduzida para melhor leitura)

#### 1.3.2. Atualizar `MessageBubble.tsx`
**Arquivo:** `src/components/MessageBubble.tsx` (linha 516-519)

**Mudança:**
```tsx
// ❌ ANTES (linha 517-519)
const bubbleStyles = isIncoming
  ? 'bg-[hsl(var(--message-incoming-bg))] shadow-md border border-border'
  : 'bg-gradient-to-br from-primary to-secondary shadow-lg'

// ✅ DEPOIS
const bubbleStyles = isIncoming
  ? 'bg-[hsl(var(--message-incoming-bg))] shadow-md border border-border'
  : 'bg-[hsl(var(--message-outgoing-bg))] shadow-lg'
```

**Resultado:**
- ✅ Mensagens enviadas: Verde sólido `#005c4b` (não mais gradiente)
- ✅ Mensagens recebidas: Cinza escuro `#2d3338` (dark) / Branco (light)
- ✅ Funciona em ambos os modos (claro e escuro)
- ✅ Texto branco nas mensagens enviadas permanece legível

---

## 📦 PARTE 2: Reorganização do Header em Grid 3x3

### 2.1. Análise do Estado Atual
**Arquivo:** `src/components/ConversationsHeader.tsx`

**Layout Atual:**
- Grid responsivo: `grid-flow-col` (mobile) → `grid-cols-3` (tablet) → `grid-cols-5` (desktop)
- 5 cards fixos: TODAS, BOT, HUMANO, EM FLOW, TRANSFERIDO
- Altura: `p-2 md:p-2.5` (~40-50px)
- Props: `statusFilter`, `onStatusChange`

### 2.2. Novo Design (Grid 3x3)

**Layout Alvo:**
```
┌─────────────┬─────────────┬─────────────┐
│   TODAS     │    BOT      │   HUMANO    │  <- Linha 1
├─────────────┼─────────────┼─────────────┤
│  EM FLOW    │ TRANSFERIDO │  + EDITAR   │  <- Linha 2
└─────────────┴─────────────┴─────────────┘
```

**Especificações:**
- Grid fixo: `grid-cols-3` em todos os tamanhos (desktop)
- Mobile: `grid-cols-2` com scroll ou stack vertical
- Altura dos cards: `h-[60px] md:h-[65px]` (compacto)
- Card "+ Editar": Borda tracejada, sem número, ícone de ajustes

### 2.3. Modificações Necessárias

#### 2.3.1. Atualizar Layout Grid
**Arquivo:** `src/components/ConversationsHeader.tsx` (linha 42-43)

**Mudança:**
```tsx
// ❌ ANTES (linha 42-43)
<div className="overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
  <div className="grid grid-flow-col auto-cols-[minmax(120px,1fr)] md:grid-flow-row md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-2.5 min-w-max md:min-w-0">

// ✅ DEPOIS
<div className="overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-2.5">
```

**Justificativa:**
- `grid-cols-2` no mobile (2 colunas, 3 linhas)
- `grid-cols-3` no desktop (3 colunas, 2 linhas)
- Remove `grid-flow-col` (não precisa mais de scroll horizontal)
- Remove `lg:grid-cols-5` (não precisa mais de 5 colunas)

#### 2.3.2. Ajustar Altura dos Cards
**Atualizar todas as tags `<button>` dos cards:**

```tsx
// ❌ ANTES (exemplo linha 45)
<button className={cn(
  "relative p-2 md:p-2.5 rounded-lg border transition-all duration-200 text-left group",
  // ...
)}>

// ✅ DEPOIS
<button className={cn(
  "relative p-2.5 md:p-3 rounded-lg border transition-all duration-200 text-left group h-[60px] md:h-[65px]",
  // ...
)}>
```

**Aplicar em:**
- Card TODAS (linha 45)
- Card BOT (linha 68)
- Card HUMANO (linha 90)
- Card EM FLOW (linha 112)
- Card TRANSFERIDO (linha 134)

#### 2.3.3. Adicionar Card "+ Editar"
**Adicionar após o card TRANSFERIDO (após linha 152):**

```tsx
{/* Card + EDITAR / NOVO */}
<button
  onClick={() => setShowFilterModal(true)}
  className={cn(
    "relative p-2.5 md:p-3 rounded-lg border-2 border-dashed transition-all duration-200 group h-[60px] md:h-[65px]",
    "bg-surface border-border/50 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-1"
  )}
>
  <Settings className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
  <div className="text-[10px] md:text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
    Editar
  </div>
</button>
```

**Imports necessários:**
```tsx
import { MessageCircle, Bot, User, Workflow, ArrowRight, Settings } from 'lucide-react'
```

### 2.4. Criar Modal de Filtros Personalizáveis

#### 2.4.1. Novo Componente: `FilterEditorModal.tsx`
**Criar:** `src/components/FilterEditorModal.tsx`

**Funcionalidades:**
1. **Gerenciar Categorias Padrão:**
   - Checkboxes para ativar/desativar: Todas, Bot, Humano, Em Flow, Transferido
   - Reordenar categorias (drag & drop)

2. **Adicionar Categorias Customizadas:**
   - Categorias sugeridas padrão:
     - 📱 **Origem:** WhatsApp, Instagram, Facebook, Site
     - 🏷️ **Tags:** VIP, Urgente, Follow-up, Aguardando Pagamento
     - 📊 **Estágios:** Lead Novo, Qualificado, Negociação, Fechado
   - Input para criar tag customizada
   - Seletor de cor para a borda/ícone
   - Ícone personalizável (biblioteca de ícones)

3. **Persistência:**
   - Salvar configuração no `localStorage` (por usuário)
   - Futuro: Salvar no banco (tabela `user_preferences`)

**Estrutura do Componente:**
```tsx
interface FilterConfig {
  id: string
  label: string
  icon: string
  color: string
  enabled: boolean
  isCustom: boolean
  filterType: 'status' | 'source' | 'tag' | 'stage'
  filterValue: string
}

interface FilterEditorModalProps {
  isOpen: boolean
  onClose: () => void
  currentFilters: FilterConfig[]
  onSave: (filters: FilterConfig[]) => void
}
```

**Layout do Modal:**
```
┌─────────────────────────────────────────┐
│  Personalizar Categorias           [X]  │
├─────────────────────────────────────────┤
│  📌 Categorias Padrão                   │
│  ☑ Todas  ☑ Bot  ☑ Humano              │
│  ☑ Em Flow  ☑ Transferido               │
│                                         │
│  📱 Filtros por Origem                  │
│  ☐ WhatsApp  ☐ Instagram  ☐ Facebook   │
│                                         │
│  🏷️ Tags Customizadas                   │
│  ☐ VIP  ☐ Urgente  ☐ Follow-up         │
│  [+ Criar Nova Tag]                     │
│                                         │
│  📊 Estágios do Funil                   │
│  ☐ Lead Novo  ☐ Qualificado            │
│  ☐ Negociação  ☐ Fechado                │
├─────────────────────────────────────────┤
│            [Cancelar]  [Salvar]         │
└─────────────────────────────────────────┘
```

#### 2.4.2. Integração com `ConversationsHeader`
**Arquivo:** `src/components/ConversationsHeader.tsx`

**Adicionar State:**
```tsx
const [showFilterModal, setShowFilterModal] = useState(false)
const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([
  { id: 'all', label: 'TODAS', icon: 'MessageCircle', color: 'primary', enabled: true, isCustom: false, filterType: 'status', filterValue: 'all' },
  { id: 'bot', label: 'BOT', icon: 'Bot', color: 'secondary', enabled: true, isCustom: false, filterType: 'status', filterValue: 'bot' },
  // ... outros padrão
])
```

**Renderizar cards dinamicamente:**
```tsx
{activeFilters.filter(f => f.enabled).map((filter) => (
  <button
    key={filter.id}
    onClick={() => onStatusChange(filter.filterValue as any)}
    className={cn(/* ... */)}
  >
    {/* Renderizar conteúdo do card baseado em filter.* */}
  </button>
))}
```

### 2.5. Ajustes de Responsividade

**Mobile (< 768px):**
- Grid: `grid-cols-2` (2 colunas, 3 linhas para 6 cards)
- Altura: `h-[60px]`
- Padding: `p-2.5`
- Font size números: `text-xl`

**Tablet (768px - 1024px):**
- Grid: `grid-cols-3` (3 colunas, 2 linhas)
- Altura: `h-[60px]`
- Padding: `p-2.5`

**Desktop (> 1024px):**
- Grid: `grid-cols-3` (3 colunas, 2 linhas)
- Altura: `h-[65px]`
- Padding: `p-3`
- Font size números: `text-2xl`

---

## 📋 Checklist de Implementação

### PARTE 1: Cores dos Balões ✅

- [ ] **1.1** Adicionar variável `--message-outgoing-bg` em `globals.css` (dark mode)
- [ ] **1.2** Adicionar variável `--message-outgoing-bg` em `globals.css` (light mode)
- [ ] **1.3** Atualizar `bubbleStyles` em `MessageBubble.tsx` para usar nova variável
- [ ] **1.4** Testar em dark mode
- [ ] **1.5** Testar em light mode
- [ ] **1.6** Verificar contraste de texto (deve manter branco legível)

### PARTE 2: Header Grid 3x3 ✅

#### 2.1. Layout Base
- [ ] **2.1.1** Alterar grid para `grid-cols-2 md:grid-cols-3`
- [ ] **2.1.2** Adicionar altura fixa `h-[60px] md:h-[65px]` em todos os cards
- [ ] **2.1.3** Ajustar padding para `p-2.5 md:p-3`
- [ ] **2.1.4** Adicionar import do ícone `Settings`
- [ ] **2.1.5** Adicionar card "+ Editar" após TRANSFERIDO

#### 2.2. Modal de Filtros
- [ ] **2.2.1** Criar arquivo `src/components/FilterEditorModal.tsx`
- [ ] **2.2.2** Criar interface `FilterConfig`
- [ ] **2.2.3** Implementar UI do modal (shadcn Dialog)
- [ ] **2.2.4** Implementar seção "Categorias Padrão" com checkboxes
- [ ] **2.2.5** Implementar seção "Filtros por Origem"
- [ ] **2.2.6** Implementar seção "Tags Customizadas"
- [ ] **2.2.7** Implementar seção "Estágios do Funil"
- [ ] **2.2.8** Implementar botão "+ Criar Nova Tag"
- [ ] **2.2.9** Implementar seletor de cor (color picker)
- [ ] **2.2.10** Implementar seletor de ícone
- [ ] **2.2.11** Implementar drag & drop para reordenar
- [ ] **2.2.12** Implementar lógica de salvar/cancelar
- [ ] **2.2.13** Implementar persistência no localStorage

#### 2.3. Integração
- [ ] **2.3.1** Adicionar state `showFilterModal` em `ConversationsHeader`
- [ ] **2.3.2** Adicionar state `activeFilters` em `ConversationsHeader`
- [ ] **2.3.3** Implementar função `handleSaveFilters`
- [ ] **2.3.4** Carregar configuração do localStorage ao montar
- [ ] **2.3.5** Renderizar cards dinamicamente baseado em `activeFilters`
- [ ] **2.3.6** Conectar click do card "+ Editar" ao modal

#### 2.4. Testes
- [ ] **2.4.1** Testar layout em mobile (2 colunas)
- [ ] **2.4.2** Testar layout em tablet (3 colunas)
- [ ] **2.4.3** Testar layout em desktop (3 colunas)
- [ ] **2.4.4** Testar abrir/fechar modal
- [ ] **2.4.5** Testar ativar/desativar categorias
- [ ] **2.4.6** Testar criar tag customizada
- [ ] **2.4.7** Testar persistência (recarregar página)
- [ ] **2.4.8** Testar filtro funcionando (trocar categoria)

---

## 🎨 Referências Visuais

### Cores - Antes vs Depois

**Mensagens Enviadas:**
- ❌ Antes: Gradiente `#1ABC9C` → `#2E86AB` (verde menta → azul)
- ✅ Depois: Sólido `#005c4b` (verde escuro WhatsApp)

**Mensagens Recebidas:**
- ✅ Mantém: `#2d3338` (dark) / branco (light)

### Layout Header - Antes vs Depois

**Antes (5 cards em linha):**
```
[TODAS] [BOT] [HUMANO] [EM FLOW] [TRANSFERIDO]
```

**Depois (6 cards em grid 3x2):**
```
[TODAS]    [BOT]       [HUMANO]
[EM FLOW]  [TRANSF.]   [+ EDITAR]
```

---

## 📝 Notas Técnicas

### Cores HSL vs Hex
- Tailwind CSS v3 usa formato HSL sem wrapper `hsl()`
- Exemplo: `--color: 153 57% 18%` (não `hsl(153, 57%, 18%)`)
- Uso: `bg-[hsl(var(--color))]`

### Variáveis CSS Existentes
**NÃO modificar:**
- `--primary` (usado em outros lugares)
- `--secondary` (usado em outros lugares)
- `--message-incoming-bg` (apenas para mensagens recebidas)

**CRIAR nova variável:**
- `--message-outgoing-bg` (específica para mensagens enviadas)

### Persistência de Filtros
**Fase 1 (atual):** localStorage
```ts
localStorage.setItem('conversationFilters', JSON.stringify(filters))
```

**Fase 2 (futuro):** Banco de dados
```sql
CREATE TABLE user_filter_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  filter_config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Ícones Disponíveis
**Lucide React:**
- MessageCircle, Bot, User, Workflow, ArrowRight (já usados)
- Settings, Filter, Tag, Star, Flag, Calendar (novos)
- Instagram, Facebook, Globe, Smartphone (redes sociais)
- TrendingUp, DollarSign, CheckCircle (estágios)

---

## ⚠️ Avisos Importantes

1. **NÃO modificar** estrutura de props de `ConversationsHeader` (mantém compatibilidade)
2. **NÃO quebrar** funcionalidade de filtro atual (statusFilter/onStatusChange)
3. **NÃO alterar** cores de texto (branco nas enviadas, dinâmico nas recebidas)
4. **MANTER** acessibilidade (contraste WCAG AA)
5. **TESTAR** em ambos os temas (dark e light)
6. **VALIDAR** responsividade em todos os breakpoints

---

## 🚀 Ordem de Implementação Sugerida

1. **Dia 1 - Cores dos Balões (PARTE 1):**
   - Implementar variável CSS
   - Atualizar MessageBubble
   - Testar em ambos os temas
   - **Tempo estimado:** 30 minutos

2. **Dia 2 - Layout Grid (PARTE 2.1):**
   - Alterar grid do header
   - Ajustar altura dos cards
   - Adicionar card "+ Editar"
   - **Tempo estimado:** 1 hora

3. **Dia 3 - Modal de Filtros (PARTE 2.2):**
   - Criar componente FilterEditorModal
   - Implementar UI básica (checkboxes)
   - Implementar salvar/cancelar
   - **Tempo estimado:** 3 horas

4. **Dia 4 - Filtros Customizados (PARTE 2.2 cont.):**
   - Implementar criar tag customizada
   - Implementar seletor de cor/ícone
   - Implementar drag & drop
   - **Tempo estimado:** 2 horas

5. **Dia 5 - Integração e Testes (PARTE 2.3 e 2.4):**
   - Integrar modal com header
   - Implementar renderização dinâmica
   - Testar responsividade
   - Testar persistência
   - **Tempo estimado:** 2 horas

**Total:** ~9 horas de desenvolvimento

---

## ✅ Critérios de Aceitação

### Parte 1 - Cores
- [ ] Mensagens enviadas usam verde `#005c4b` sólido (não gradiente)
- [ ] Mensagens recebidas mantêm cor atual
- [ ] Texto branco legível em mensagens enviadas
- [ ] Funciona em dark mode e light mode
- [ ] Sem regressões visuais

### Parte 2 - Header Grid
- [ ] Header mostra 6 cards em grid 3x2 (desktop)
- [ ] Header mostra 6 cards em grid 2x3 (mobile)
- [ ] Altura dos cards: ~60-65px
- [ ] Card "+ Editar" tem borda tracejada
- [ ] Click em "+ Editar" abre modal

### Parte 3 - Modal de Filtros
- [ ] Modal abre/fecha corretamente
- [ ] Checkboxes ativam/desativam categorias
- [ ] Tags customizadas podem ser criadas
- [ ] Seletor de cor funciona
- [ ] Seletor de ícone funciona
- [ ] Configuração persiste no localStorage
- [ ] Cards renderizam dinamicamente baseado na config

### Responsividade
- [ ] Layout funciona em mobile (320px - 767px)
- [ ] Layout funciona em tablet (768px - 1023px)
- [ ] Layout funciona em desktop (1024px+)
- [ ] Sem scroll horizontal no header

---

**Última atualização:** 2026-02-01
**Versão:** 1.0
**Responsável:** Claude Code
