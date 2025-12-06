# Routing Logic Documentation

**Phase 4: Integration with Webhook + Status-Based Routing**

## Overview

This document describes the status-based routing logic that determines how incoming WhatsApp messages are processed in the chatbot system. The routing happens in `src/flows/chatbotFlow.ts` and is based on the contact's current status.

## Status Types

The system recognizes 4 contact statuses:

| Status | Description | Who Processes | Usage |
|--------|-------------|---------------|-------|
| `bot` | Normal conversation with AI | AI Agent | Default, after flow completion |
| `humano` | Active human attendant | Human Agent | After explicit transfer |
| `transferido` | Transferred to human (legacy) | Human Agent | Backward compatibility |
| `fluxo_inicial` ⭐ | Navigating interactive flow | Flow Executor | **NEW - During active flow** |

## Routing Decision Tree

```
┌─────────────────────────────────────────┐
│ 1. Incoming WhatsApp Message            │
│    - Parse message (text/audio/image)   │
│    - Get/Create customer                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ 2. Check Contact Status                  │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┬───────────────┬─────────┐
       │               │               │         │
       ▼               ▼               ▼         ▼
┌──────────┐    ┌──────────┐   ┌──────────┐ ┌──────────┐
│ fluxo_   │    │ humano/  │   │   bot    │ │ bot +    │
│ inicial  │    │transferi-│   │          │ │first msg │
│          │    │   do     │   │          │ │          │
└────┬─────┘    └────┬─────┘   └────┬─────┘ └────┬─────┘
     │               │              │            │
     ▼               ▼              ▼            ▼
┌──────────┐    ┌──────────┐   ┌──────────┐ ┌──────────┐
│ Continue │    │  Send to │   │Check for │ │Check for │
│   Flow   │    │  Agent   │   │new flow  │ │trigger   │
│ (NODE 3.1│    │  (NODE 6)│   │ (NODE 15)│ │ (NODE 15)│
└──────────┘    └──────────┘   └────┬─────┘ └────┬─────┘
                                    │            │
                              ┌─────┴────────────┘
                              │
                              ▼
                         ┌──────────┐
                         │   AI     │
                         │Processing│
                         │(NODE 10+)│
                         └──────────┘
```

## Routing Logic in Code

### Location
**File:** `src/flows/chatbotFlow.ts`

### Stage 1: Immediate Routing (After NODE 3)

```typescript
// After checkOrCreateCustomer() - NODE 3

// ROUTE 1: Flow Interativo Ativo (maximum priority)
if (customer.status === 'fluxo_inicial') {
  console.log('🔄 Contact in interactive flow')
  
  const flowResult = await checkInteractiveFlow({
    clientId: config.id,
    phone: parsedMessage.phone,
    content: parsedMessage.content,
    isInteractiveReply: parsedMessage.type === 'interactive',
    interactiveResponseId: parsedMessage.interactiveResponseId,
  })

  if (flowResult.flowExecuted) {
    return { success: true } // ⚠️ EARLY RETURN - Don't process AI
  }
}

// ROUTE 2: Human handoff
// Handled by NODE 6 (checkHumanHandoffStatus)
// Status 'humano' or 'transferido' → stops bot processing
```

### Stage 2: Check for New Flow (Before AI - NODE 15)

```typescript
// After batching messages, before fetching chat history

if (customer.status === 'bot') {
  const flowResult = await checkInteractiveFlow({
    clientId: config.id,
    phone: parsedMessage.phone,
    content: batchedContent,
    isInteractiveReply: parsedMessage.type === 'interactive',
    interactiveResponseId: parsedMessage.interactiveResponseId,
    isFirstContact: customer.message_count === 0,
  })

  if (flowResult.flowExecuted || flowResult.flowStarted) {
    return { success: true } // ⚠️ EARLY RETURN - Flow started/continued
  }
}

// Continue to AI processing if no flow matched
```

## Status Transitions

### From `bot` to `fluxo_inicial`
**When:** Flow starts (via trigger match)
**Who:** FlowExecutor.startFlow()
**Effect:** Next message routes to FlowExecutor, AI blocked

```typescript
// In FlowExecutor.startFlow()
await supabase
  .from('clientes_whatsapp')
  .update({ status: 'fluxo_inicial' })
  .eq('telefone', phone)
```

### From `fluxo_inicial` to `bot`
**When:** 
- Flow completes naturally
- Transfer to Bot block executed

**Who:** FlowExecutor.transferToBot() or FlowExecutor.completeFlow()
**Effect:** Next message routes to AI

```typescript
// In FlowExecutor.transferToBot()
await supabase
  .from('clientes_whatsapp')
  .update({ status: 'bot' })
  .eq('telefone', phone)
```

### From `fluxo_inicial` to `humano`
**When:** Transfer to Human block executed
**Who:** FlowExecutor.transferToHuman()
**Effect:** Next message routes to human agent

```typescript
// In FlowExecutor.transferToHuman()
await supabase
  .from('clientes_whatsapp')
  .update({ status: 'humano' })
  .eq('telefone', phone)

// Notify agent
await notifyAgent(phone, clientId)
```

## Flow Triggers

Flows can be triggered in 3 ways:

### 1. `always` Trigger
**When:** Every new message from contact with status `bot`
**Use case:** First contact greeting flow
**Priority:** Highest (checked first)

### 2. `keyword` Trigger
**When:** Message contains specific keyword(s)
**Use case:** "menu", "help", "support"
**Priority:** Second (after `always`)
**Matching:** Case-insensitive, includes substring match

### 3. `manual` Trigger
**When:** Admin manually starts flow
**Use case:** Agent-initiated flows
**Priority:** N/A (not auto-triggered)

## Example Scenarios

### Scenario 1: First Contact Auto-Start

```
1. User sends: "Oi"
2. Status: bot (new contact)
3. Routing:
   - NODE 3: Create customer (status = bot)
   - NODE 15: checkInteractiveFlow
   - Trigger "always" matched → Start flow
   - Status changes: bot → fluxo_inicial
   - Send first flow message
4. Next message routes to FlowExecutor (status = fluxo_inicial)
```

### Scenario 2: User Clicks Button

```
1. User clicks: "Falar com atendente"
2. Status: fluxo_inicial (in flow)
3. Routing:
   - NODE 3.1: Continue flow via FlowExecutor
   - FlowExecutor detects button click
   - Executes "Transfer to Human" block
   - Status changes: fluxo_inicial → humano
   - Notifies agent
4. Next message routes to human agent (status = humano)
```

### Scenario 3: Keyword Trigger

```
1. User sends: "menu"
2. Status: bot (was talking to AI)
3. Routing:
   - NODE 15: checkInteractiveFlow
   - Keyword "menu" matched → Start flow
   - Status changes: bot → fluxo_inicial
   - Send flow menu
4. Next message routes to FlowExecutor (status = fluxo_inicial)
```

## Critical Rules

### 🚨 Agent Blocking During Flow

While status = `fluxo_inicial`:
- Human agent CANNOT respond
- Dashboard blocks agent input
- Messages route only to FlowExecutor
- This prevents conflicts between human and automated responses

### 🔄 Early Returns

The routing logic uses **early returns** to prevent cascading execution:

```typescript
// WRONG - Don't do this
if (status === 'fluxo_inicial') {
  await continueFlow()
  // ❌ Code continues to AI processing
}
await generateAIResponse() // ❌ This would execute!

// RIGHT - Use early returns
if (status === 'fluxo_inicial') {
  await continueFlow()
  return { success: true } // ✅ Stops here
}
await generateAIResponse() // ✅ Never reached
```

### 📊 Status Query Performance

Indexes ensure fast status lookups:

```sql
CREATE INDEX idx_clientes_whatsapp_status
  ON clientes_whatsapp(client_id, status)
  WHERE status IN ('humano', 'transferido', 'fluxo_inicial');
```

## Debugging Status Issues

### Check Current Status

```bash
# API endpoint
GET /api/test/flow-execution/status?phone=5554999999999&clientId=<client-id>

# Returns:
{
  "data": {
    "customer": {
      "status": "fluxo_inicial",
      "phone": "5554999999999"
    },
    "execution": {
      "id": "...",
      "flowName": "Atendimento Inicial",
      "status": "active"
    }
  }
}
```

### Common Issues

**Issue:** Status stuck in `fluxo_inicial`
**Cause:** Flow execution not completed
**Fix:** Check `flow_executions` table for active execution

**Issue:** Messages not routing to flow
**Cause:** Status is `bot` but flow should be active
**Fix:** Verify flow trigger matches user message

**Issue:** Agent can respond during flow
**Cause:** Dashboard not checking status properly
**Fix:** Verify frontend checks status before enabling input

## Testing Status Routing

Use the test endpoint to verify routing:

```bash
# 1. Start flow (status → fluxo_inicial)
POST /api/test/flow-execution
{
  "action": "start",
  "flowId": "...",
  "phone": "5554999999999",
  "clientId": "..."
}

# 2. Check status
GET /api/test/flow-execution/status?phone=5554999999999&clientId=...

# 3. Continue flow (stays fluxo_inicial)
POST /api/test/flow-execution
{
  "action": "continue",
  "phone": "5554999999999",
  "clientId": "...",
  "userResponse": "Opção 1",
  "interactiveResponseId": "opt_1"
}

# 4. Transfer to bot (status → bot)
POST /api/test/flow-execution
{
  "action": "transfer_bot",
  "executionId": "..."
}

# 5. Verify status changed
GET /api/test/flow-execution/status?phone=5554999999999&clientId=...
```

## References

- **Implementation:** `src/flows/chatbotFlow.ts` (NODE 3.1 and NODE 15)
- **Flow Executor:** `src/lib/flows/flowExecutor.ts`
- **Check Flow Node:** `src/nodes/checkInteractiveFlow.ts`
- **Status Migration:** `supabase/migrations/20251206_add_fluxo_inicial_status.sql`
- **Test Endpoint:** `src/app/api/test/flow-execution/route.ts`

---

**Document Version:** 1.0  
**Phase:** 4 - Integration with Webhook + Status-Based Routing  
**Last Updated:** 2025-12-06
