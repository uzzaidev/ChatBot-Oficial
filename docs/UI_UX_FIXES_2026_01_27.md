# UI/UX Fixes - 27 de Janeiro de 2026

Correções de interface e experiência do usuário aplicadas ao dashboard UzzAi.

---

## Issue 1: Broadcast blinking infinito
**Arquivo:** `src/components/ConversationList.tsx`
- Removido `animate-pulse` que piscava infinitamente em mensagens de broadcast
- Mantida indicação visual via borda azul + background para mensagens não lidas

## Issue 2: Sidebar hover transparente
**Arquivo:** `src/components/DashboardNavigation.tsx`
- Trocado `hover:bg-uzz-mint/10` (transparente) por `hover:bg-[#1a2a28]` (cor sólida)

## Issue 3 + 5: Dois headers na pagina inicial / Header muda ao trocar paginas
**Arquivo:** `src/components/DashboardClient.tsx`
- Removido header duplicado que existia dentro do DashboardClient
- Agora retorna apenas `<DashboardMetricsView />` — o header unico fica no DashboardLayoutClient

## Issue 4: Sidebar conversas sem botao de logout
**Arquivo:** `src/components/ConversationPageClient.tsx`
- Adicionado `LogoutButton` ao lado do botao Home no header da sidebar de conversas

## Issue 6: Erro DialogContent (acessibilidade)
**Arquivos:** `DashboardLayoutClient.tsx`, `ConversationPageClient.tsx`, `ConversationsIndexClient.tsx`
- Adicionado `<SheetTitle className="sr-only">` em todos os SheetContent que faltavam titulo para acessibilidade (Radix UI exige)

## Issue 7: Remover "Sistema Online" (mock)
**Arquivo:** `src/components/ConversationsHeader.tsx`
- Removido indicador fake "Sistema Online" com dot verde pulsante

## Issue 8: Graficos bugados
**Arquivo:** `src/components/CustomizableChart.tsx`
- Removido componente `<Brush>` dos 4 tipos de grafico (causava area de selecao confusa)
- Removidos estados `brushStartIndex`/`brushEndIndex`
- Simplificado margin bottom
- Melhorado estilo do tooltip (background escuro, borda mint, bordas arredondadas)

## Issue 9: Tabs budget sem separacao visual
**Arquivo:** `src/app/dashboard/admin/budget-plans/page.tsx`
- Adicionado estilos ao TabsList e TabsTrigger com dark theme
- Tabs ativas agora tem destaque visual claro

## Issue 10: Fundos dos modais se misturam com a pagina
**Arquivo:** `src/app/dashboard/settings/page.tsx`
- Adicionado background gradient + overlay escuro nos modais de revalidacao

## Issue 11: Card TTS sem background
**Arquivo:** `src/app/dashboard/settings/page.tsx`
- Adicionado `bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10` ao Card de TTS

## Issue 12: Status de mensagens enviadas invisivel (checkmarks)
**Arquivo:** `src/components/MessageBubble.tsx`
- Corrigidas cores dos icones de status que eram branco sobre fundo branco
- `pending/queued/sending`: `text-gray-400`
- `sent`: `text-gray-400`
- `delivered`: `text-gray-500`
- `read`: `text-blue-400` (mantido)
- `failed`: `text-red-400` (mantido)

## Issue 13a: Mobile - Dois headers em conversas
**Arquivo:** `src/components/ConversationsIndexClient.tsx`
- Header KPI agora esconde no mobile quando uma conversa esta selecionada (`hidden lg:block`)
- Evita duplicacao de headers e hamburger buttons

## Issue 13b: Mensagens cortadas no mobile
**Arquivo:** `src/components/MessageBubble.tsx`
- Mudado `max-w-[70%]` para `max-w-[85%] sm:max-w-[75%] md:max-w-[70%]` (responsivo)

## Issue 14: Elementos outgoing invisiveis (branco no branco)
**Arquivos:** `MessageActionMenu.tsx`, `MessageBubble.tsx`
- Corrigidas cores do botao de acoes (seta dropdown): `bg-gray-100 hover:bg-gray-200 text-gray-500`
- Corrigidas cores do container de documento: `bg-gray-50 hover:bg-gray-100 border-gray-200`
- Corrigidas cores de filename (`text-gray-900`), filesize (`text-gray-500`), download icon (`text-gray-400`)
- Corrigidas cores de template badge, footer, botoes para outgoing messages
- Corrigido legacy media container de `bg-white/10` para `bg-gray-50`
- **Nota:** O fundo branco das mensagens outgoing foi mantido por decisao do usuario

## Issue 15: CORS error em audio do WhatsApp
**Arquivo:** `src/components/AudioMessage.tsx`
- Removido `crossOrigin="anonymous"` do elemento `<audio>` que causava erro CORS com URLs do WhatsApp

## Issue 16: Sticky date header duplicado
**Arquivo:** `src/components/ConversationDetail.tsx`
- Adicionada verificacao no `calculateStickyDate`: se o inline date separator ainda esta visivel na viewport, o sticky header nao aparece
- Evita mostrar "Hoje" duas vezes (sticky + inline)

## Issue 17: Mobile sidebar - Home sobrepoe X de fechar
**Arquivo:** `src/components/ConversationsIndexClient.tsx`
- Movido botao Home para a esquerda (ao lado do titulo "Conversas")
- Liberado canto superior direito para o X nativo do Sheet (Radix UI)

## Issue 18: BUG RAIZ - Cards e tooltips transparentes (CSS variables)
**Arquivo:** `src/app/globals.css`
- **Causa raiz:** Variaveis CSS usavam valores HEX (`#1a1f26`) mas o `tailwind.config.ts` envolve com `hsl()`, gerando `hsl(#1a1f26)` = CSS invalido = background transparente
- Convertidos valores para formato HSL:
  - `--background: 210 27% 8%` (era `#0f1419`)
  - `--card: 215 18% 13%` (era `#1a1f26`)
  - `--popover: 216 22% 15%` (era `#1e2530`)
  - `--border: 210 14% 30%` (era `rgba(255,255,255,0.1)`)
  - `--input: 210 14% 20%` (era `rgba(255,255,255,0.05)`)
- **Impacto:** Corrige automaticamente 94+ Cards e todos os tooltips/popovers do app

## Avatar da lista de conversas
**Arquivo:** `src/components/ConversationList.tsx`
- Reduzido avatar de `h-12 w-12` para `h-8 w-8` (com texto `text-xs`)
- Removido dot verde pulsante infinito, agora so aparece estatico quando `isVeryRecent && hasUnread`

---

## Arquivos modificados (resumo)

| Arquivo | Issues |
|---------|--------|
| `src/app/globals.css` | 18 |
| `src/app/dashboard/admin/budget-plans/page.tsx` | 9, 10 |
| `src/app/dashboard/settings/page.tsx` | 10, 11 |
| `src/components/AudioMessage.tsx` | 15 |
| `src/components/ConversationDetail.tsx` | 16 |
| `src/components/ConversationList.tsx` | 1, avatar |
| `src/components/ConversationPageClient.tsx` | 4, 6 |
| `src/components/ConversationsHeader.tsx` | 7 |
| `src/components/ConversationsIndexClient.tsx` | 6, 13a, 17 |
| `src/components/CustomizableChart.tsx` | 8 |
| `src/components/DashboardClient.tsx` | 3, 5 |
| `src/components/DashboardLayoutClient.tsx` | 6 |
| `src/components/DashboardNavigation.tsx` | 2 |
| `src/components/MessageActionMenu.tsx` | 14 |
| `src/components/MessageBubble.tsx` | 12, 13b, 14 |
