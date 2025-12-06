# Backend Monitor - Visual UI Guide

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard Header                                                            │
│ Backend Monitor                                                     [🔄][📜][🔃] │
│ Monitoramento em tempo real do fluxo de mensagens - Estilo terminal        │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┬────────────────────────────────────────────────────────┐
│ Execuções Ativas   │ Terminal Output                                        │
│ (Sidebar)          │ (Main Panel - 75% width)                               │
│                    │                                                        │
│ [SUCCESS]    12    │ ╔══════════════════════════════════════════════════╗  │
│ abc123de...        │ ║ CHATBOT BACKEND MONITOR - MESSAGE FLOW TRACE    ║  │
│ 14:30:45          │ ║ Execution: abc123de-f456-7890-ghij-klmnopqrstuv ║  │
│ 📱 5511999999999   │ ║ Started: 16/11/2024 14:30:45                    ║  │
│                    │ ║ Phone: 5511999999999                             ║  │
│ [RUNNING]     8    │ ╚══════════════════════════════════════════════════╝  │
│ def456gh...        │                                                        │
│ 14:31:12          │ [14:30:45.123] ✓ parseMessage (15ms)                  │
│ 📱 5521988888888   │ → INPUT:                                               │
│                    │   {                                                    │
│ [ERROR]       5    │     "from": "5511999999999",                          │
│ ghi789jk...        │     "type": "text",                                    │
│ 14:29:33          │     "content": "Olá, preciso de ajuda!"               │
│ 📱 5531977777777   │   }                                                    │
│                    │ ← OUTPUT:                                              │
│                    │   {                                                    │
│                    │     "phone": "5511999999999",                         │
│                    │     "name": "João Silva",                              │
│                    │     "message": "Olá, preciso de ajuda!"               │
│                    │   }                                                    │
│                    │                                                        │
│                    │ [14:30:45.145] ✓ fetchCustomerData (23ms)             │
│                    │ → INPUT:                                               │
│                    │   { "phone": "5511999999999" }                        │
│                    │ ← OUTPUT:                                              │
│                    │   {                                                    │
│                    │     "customer_id": "cust_abc123",                     │
│                    │     "status": "bot",                                   │
│                    │     "conversation_id": "conv_xyz789"                  │
│                    │   }                                                    │
│                    │                                                        │
│                    │ [14:30:45.201] ✓ generateAIResponse (142ms)           │
│                    │ → INPUT:                                               │
│                    │   {                                                    │
│                    │     "message": "Olá, preciso de ajuda!",              │
│                    │     "history": [...]                                   │
│                    │   }                                                    │
│                    │ ← OUTPUT:                                              │
│                    │   {                                                    │
│                    │     "response": "Olá! Como posso ajudá-lo?",          │
│                    │     "tokens_used": 156                                │
│                    │   }                                                    │
│                    │                                                        │
│                    │ ───────────────────────────────────────────────────── │
│                    │ End of execution log - Status: success                │
│                    │ ● Monitoring live...                                  │
│                    │                                                        │
└────────────────────┴────────────────────────────────────────────────────────┘
```

## Color Scheme

The terminal uses the following color coding (when properly rendered in browser):

### Status Indicators
- ✅ **Success (✓)**: `text-green-400` - Bright green
- ❌ **Error (✗)**: `text-red-400` - Bright red  
- ⚠️ **Running (⋯)**: `text-yellow-400` - Bright yellow
- ⚪ **Idle**: `text-gray-400` - Gray

### Data Display
- 🔵 **Input data (→ INPUT)**: `text-blue-300` - Blue
- 🟢 **Output data (← OUTPUT)**: `text-green-300` - Green
- 🔴 **Error data (✗ ERROR)**: `text-red-300` - Red
- ⚫ **JSON content**: `text-gray-300` - Light gray
- ⚪ **Timestamps**: `text-gray-500` - Dark gray

### Background
- **Main terminal**: `bg-black` - Pure black (#000000)
- **Sidebar items**: `border-border hover:bg-muted` - Light hover effect
- **Selected execution**: `border-primary bg-primary/10` - Blue highlight

## Sidebar Execution Cards

Each execution in the sidebar displays:

```
┌──────────────────┐
│ [SUCCESS]    12  │ ← Status badge + node count
│ abc123de...      │ ← First 8 chars of execution_id
│ 14:30:45        │ ← Start timestamp (HH:MM:SS)
│ 📱 5511999999999 │ ← Phone number (if available)
└──────────────────┘
```

### Badge Colors
- **SUCCESS**: Green badge (`bg-green-500`)
- **ERROR**: Red badge (`bg-red-500`)
- **RUNNING**: Yellow badge (`bg-yellow-500`)

### Selected State
- Blue border (`border-primary`)
- Light blue background (`bg-primary/10`)

## Terminal Header

The terminal header uses ASCII box-drawing characters:

```
╔════════════════════════════════════════════════════════════════╗
║ CHATBOT BACKEND MONITOR - MESSAGE FLOW TRACE
║ Execution: abc123de-f456-7890-ghij-klmnopqrstuv
║ Started: 16/11/2024 14:30:45.123
║ Phone: 5511999999999
╚════════════════════════════════════════════════════════════════╝
```

Characters used:
- `╔` `╗` `╚` `╝` - Corners (double-line box drawing)
- `═` - Horizontal line (double-line)
- `║` - Vertical line (double-line)

## Terminal Footer

```
─────────────────────────────────────────────────────────────────
End of execution log - Status: success
● Monitoring live...
```

- `─` - Horizontal separator (single-line)
- `●` - Live indicator (animated pulse when active)

## Log Entry Format

Each node execution follows this pattern:

```
[HH:MM:SS.mmm] ✓ nodeName (XXms)
→ INPUT:
  { json data }
← OUTPUT:
  { json data }
```

### Spacing and Indentation
- Timestamp in brackets: `[14:30:45.123]`
- Status icon: ✓ / ✗ / ⋯
- Node name: Bold font
- Duration in parentheses: `(15ms)`
- Input/output labels indented 8 spaces
- JSON content indented 4 spaces from label

## Control Buttons

Located in the top-right header:

```
[🔄 Live]  [📜 Auto-scroll ON]  [🔃 Atualizar]
```

### Button States

**Auto-refresh:**
- Active: `[🔄 Live]` - Primary variant (blue)
- Inactive: `[⏸️ Pausado]` - Outline variant (gray)

**Auto-scroll:**
- Active: `[📜 Auto-scroll ON]` - Primary variant (blue)
- Inactive: `[📜 Auto-scroll OFF]` - Outline variant (gray)

**Manual refresh:**
- Always available: `[🔃 Atualizar]` - Outline variant

## Empty State

When no executions exist:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│               Nenhuma execução encontrada                   │
│            Aguardando mensagens...                         │
│                                                             │
│  Envie uma mensagem pelo WhatsApp para ver o fluxo         │
│                    em tempo real                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (≥768px)
- Two-panel layout: 25% sidebar + 75% terminal
- Both panels visible simultaneously
- Fixed heights with scroll areas

### Mobile (<768px)
- Stacked layout (not yet fully optimized)
- Sidebar on top, terminal below
- Full-width components

## Font Specifications

### Terminal Area
- Font family: Monospace system font stack
- Font size: `text-xs` (0.75rem / 12px)
- Line height: Compact for dense log display

### Sidebar
- Font family: Default system font
- Execution ID: Monospace font (`font-mono`)
- Labels: Regular weight
- Selected item: Bold

## Accessibility Features

- Keyboard navigation: Tab through executions
- ARIA labels: Provided by shadcn/ui components
- Color contrast: Meets WCAG AA standards
- Focus indicators: Visible on interactive elements
- Screen reader support: Semantic HTML structure

## Performance Considerations

- **Auto-scroll**: Only triggers on state changes
- **Polling interval**: 2 seconds (configurable)
- **Log limit**: 50 most recent per fetch
- **Execution list**: Shows all but only renders selected
- **JSON rendering**: Uses `<pre>` for native formatting

## Animation

- **Live indicator**: Pulse animation when monitoring active
- **Sidebar hover**: Smooth background transition
- **Execution selection**: Instant update (no transition)
- **Auto-scroll**: Smooth scroll behavior
