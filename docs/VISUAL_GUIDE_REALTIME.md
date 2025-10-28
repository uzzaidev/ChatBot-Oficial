# Visual Guide: Real-time Notifications

## Feature Overview

This guide shows how the real-time notification feature looks and behaves in the dashboard.

## Visual States

### 1. Normal Conversation (No Unread)
```
┌─────────────────────────────────────────────┐
│  👤  João Silva               2h atrás      │
│      Obrigado pela ajuda!        [Bot]     │
└─────────────────────────────────────────────┘
```
- White/gray background
- Normal font weight
- No indicator

### 2. Active Conversation (Currently Open)
```
┌─────────────────────────────────────────────┐
│  👤  Maria Santos             1h atrás      │
│      Como faço o pedido?         [Bot]     │
│                    ⬆️ Gray background       │
└─────────────────────────────────────────────┘
```
- Gray background (`bg-gray-100`)
- Indicates this conversation is currently selected
- Shown in the right panel

### 3. Unread Message (Not Currently Open)
```
┌─────────────────────────────────────────────┐
│  👤  Pedro Costa              Agora    •    │
│      Quando vai chegar?          [Bot]     │
│  ⬆️ Blue background + Bold text + Bullet    │
└─────────────────────────────────────────────┘
```
- Light blue background (`bg-blue-50`)
- **Bold** name and message preview
- Blue bullet indicator (`•`) on the right
- First 2 seconds: pulse animation

## User Journey Example

### Scenario: You're viewing Client A, Client B sends a message

**Step 1: Initial State**
```
┌─ Conversations ──────────────────┐  ┌─ Chat with João Silva ──────┐
│                                  │  │                              │
│  👤  João Silva     (ACTIVE)     │  │  Messages shown here...      │
│                                  │  │                              │
│  👤  Maria Santos                │  │                              │
│                                  │  │                              │
│  👤  Pedro Costa                 │  │                              │
│                                  │  │                              │
└──────────────────────────────────┘  └──────────────────────────────┘
```

**Step 2: Pedro sends a WhatsApp message**
```
                  WhatsApp → Meta API → Webhook → Database
                                ↓
                        Supabase Realtime fires
                                ↓
                        Dashboard detects change
```

**Step 3: Dashboard Updates (2 seconds pulse)**
```
┌─ Conversations ──────────────────┐  ┌─ Chat with João Silva ──────┐
│                                  │  │                              │
│  👤  João Silva     (ACTIVE)     │  │  Messages shown here...      │
│                                  │  │  (João's chat still open)    │
│  👤  Maria Santos                │  │                              │
│                                  │  │                              │
│  👤  Pedro Costa    Agora    •   │  │  ⬅️ No change here           │
│      Quando vai chegar?   [Bot]  │  │                              │
│      ⬆️ PULSING + BLUE + BOLD     │  │                              │
└──────────────────────────────────┘  └──────────────────────────────┘
```

**Step 4: After 2 seconds (pulse stops, but still marked unread)**
```
┌─ Conversations ──────────────────┐  ┌─ Chat with João Silva ──────┐
│                                  │  │                              │
│  👤  João Silva     (ACTIVE)     │  │  Messages shown here...      │
│                                  │  │                              │
│  👤  Maria Santos                │  │                              │
│                                  │  │                              │
│  👤  Pedro Costa    Agora    •   │  │                              │
│      Quando vai chegar?   [Bot]  │  │                              │
│      ⬆️ BLUE + BOLD (no pulse)    │  │                              │
└──────────────────────────────────┘  └──────────────────────────────┘
```

**Step 5: User clicks on Pedro's conversation**
```
┌─ Conversations ──────────────────┐  ┌─ Chat with Pedro Costa ─────┐
│                                  │  │                              │
│  👤  João Silva                  │  │  [Pedro]: Quando vai chegar? │
│                                  │  │                              │
│  👤  Maria Santos                │  │  [Bot]: Seu pedido está...   │
│                                  │  │                              │
│  👤  Pedro Costa    (ACTIVE)     │  │  ⬅️ Pedro's chat now open     │
│      Quando vai chegar?   [Bot]  │  │     Unread indicator GONE    │
│      ⬆️ GRAY (no blue, no bullet) │  │                              │
└──────────────────────────────────┘  └──────────────────────────────┘
```

## CSS Classes Used

### Unread Conversation
```tsx
className={cn(
  "flex items-center gap-3 p-3 cursor-pointer transition-colors duration-300",
  "bg-blue-50",  // Light blue background
  // Children elements:
  "font-bold"    // Bold text for name and preview
)}
```

### Pulse Animation (First 2 Seconds)
```tsx
className={cn(
  // ... base classes
  "animate-pulse"  // Tailwind's built-in pulse animation
)}
```

### Unread Indicator Bullet
```tsx
<div className="bg-primary text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-semibold">
  •
</div>
```

## Color Palette

- **Normal**: White/light gray (`bg-white` / `hover:bg-gray-50`)
- **Active**: Gray (`bg-gray-100`)
- **Unread**: Light blue (`bg-blue-50`)
- **Bullet**: Primary color (`bg-primary` - usually blue)
- **Status badges**: Green (Bot), Yellow (Waiting), Blue (Human)

## Mobile Responsive

On mobile devices (< lg breakpoint):
- Conversation list appears in a drawer (Sheet component)
- Same visual indicators apply
- User can swipe to open drawer and see unread messages
- Clicking conversation closes drawer and shows chat

## Animation Timing

- **Pulse duration**: 2 seconds
- **Transition duration**: 300ms (`duration-300`)
- **Background fade**: Smooth color transition
- **Cleanup**: Automatic after timeout

## Accessibility

- Visual indicators are supplemented by:
  - Color contrast meets WCAG AA standards
  - Bold text provides additional visual weight
  - Bullet indicator provides extra visual cue
  - No reliance on color alone (multiple indicators)

## Performance Considerations

- Uses `Set` for O(1) lookup of unread conversations
- Only animates `colors` property (not `all`)
- Automatic cleanup prevents memory leaks
- Minimal re-renders (only affected conversation updates)

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Requires WebSocket support (for Supabase Realtime)
- Falls back gracefully if realtime fails (polling still works)

## Testing Checklist

When testing this feature, verify:

- [ ] Blue background appears for unread conversation
- [ ] Text becomes bold for unread conversation
- [ ] Bullet indicator appears on the right
- [ ] Pulse animation runs for ~2 seconds
- [ ] Pulse stops after 2 seconds (but stays blue)
- [ ] Clicking conversation clears all indicators
- [ ] Indicators don't appear for currently active conversation
- [ ] Multiple unread conversations can exist simultaneously
- [ ] Reload page clears all unread indicators (no persistence)

## Known Limitations

1. **No persistence**: Unread state is lost on page reload
2. **No counter**: Only shows `•` not number of messages
3. **No sound**: Silent notification
4. **No browser notification**: Stays within the app

These limitations are intentional for Phase 1. Future enhancements can address them if needed.
