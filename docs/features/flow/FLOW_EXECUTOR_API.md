# Flow Executor API Documentation

**Phase 3: Executor + Status Control**

This document describes how to use the `FlowExecutor` class to execute interactive flows and manage contact status transitions.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Methods](#core-methods)
5. [Block Types](#block-types)
6. [Status Control](#status-control)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## Overview

The `FlowExecutor` class manages the execution of interactive flows:

- **Starts flows** and creates execution state
- **Executes blocks** (messages, lists, buttons, conditions, etc.)
- **Controls status transitions** (bot → fluxo_inicial → bot/humano)
- **Handles user responses** and navigates the flow

### Status Flow

```
┌─────────┐
│   bot   │ ← Contact receives AI responses
└────┬────┘
     │ Flow starts
     ↓
┌─────────────────┐
│ fluxo_inicial   │ ← Contact navigating flow (agent blocked)
└────┬────────────┘
     │ User responds
     ↓
 ┌───┴────┐
 │ Choice │
 └───┬────┘
     ├──→ Transfer to Bot ──→ status = 'bot'
     ├──→ Transfer to Human ──→ status = 'humano'
     └──→ End Flow ──→ status = 'bot' (default)
```

---

## Installation

The FlowExecutor is already available in the codebase:

```typescript
import { FlowExecutor } from '@/lib/flows/flowExecutor'
```

**Dependencies:**
- Supabase (database access)
- WhatsApp Interactive Messages library

---

## Quick Start

### Example: Start a Flow

```typescript
import { FlowExecutor } from '@/lib/flows/flowExecutor'

const executor = new FlowExecutor()

// Start a flow for a contact
const execution = await executor.startFlow(
  'flow-uuid',           // Flow ID
  'client-uuid',         // Client ID
  '5554999999999'        // Phone number
)

console.log('Flow started:', execution.id)
// Status automatically changed to 'fluxo_inicial'
```

### Example: Continue a Flow

```typescript
// User clicks a button (ID: 'btn_sales')
await executor.continueFlow(
  'client-uuid',
  '5554999999999',
  '',                    // No text response
  'btn_sales'            // Interactive response ID
)
// Flow advances to next block based on button choice
```

---

## Core Methods

### `startFlow(flowId, clientId, phone)`

Starts a new flow execution.

**Parameters:**
- `flowId` (string): ID of the flow to start
- `clientId` (string): Client ID
- `phone` (string): Contact phone number (international format)

**Returns:** `Promise<FlowExecution>`

**What it does:**
1. Fetches flow from database
2. Checks for existing active execution (throws if exists)
3. Creates new execution record
4. ⭐ Changes contact status to `'fluxo_inicial'`
5. Executes first block

**Example:**

```typescript
try {
  const execution = await executor.startFlow(
    'abc-123',
    'client-xyz',
    '5554991234567'
  )
  console.log('Execution ID:', execution.id)
} catch (error) {
  console.error('Failed to start flow:', error)
}
```

---

### `continueFlow(clientId, phone, userResponse, interactiveId)`

Continues an active flow based on user response.

**Parameters:**
- `clientId` (string): Client ID
- `phone` (string): Contact phone number
- `userResponse` (string): User's text response
- `interactiveResponseId` (string | undefined): ID from button/list click

**Returns:** `Promise<void>`

**What it does:**
1. Fetches active execution
2. Finds current block
3. Determines next block based on response
4. Updates execution state (variables, history)
5. Executes next block

**Example:**

```typescript
// User clicks list item "opt_support"
await executor.continueFlow(
  'client-xyz',
  '5554991234567',
  'Suporte Técnico',  // Title of selected item
  'opt_support'       // ID of selected item
)
```

---

## Block Types

The FlowExecutor supports **11 block types**:

### 1. `start` - Flow Start

**Purpose:** Entry point of the flow (no action).

**Behavior:** Automatically advances to next block.

---

### 2. `message` - Text Message

**Purpose:** Send a simple text message.

**Data Fields:**
- `messageText` (string): Message content

**Example:**

```json
{
  "id": "block-1",
  "type": "message",
  "data": {
    "messageText": "Olá! Como posso ajudar?"
  }
}
```

---

### 3. `interactive_list` - Interactive List

**Purpose:** Send a WhatsApp list with multiple options (up to 10 sections, 100 items).

**Data Fields:**
- `listHeader` (string?): Header text
- `listBody` (string): Body text
- `listFooter` (string?): Footer text
- `listButtonText` (string): Button text (e.g., "Ver opções")
- `listSections` (ListSection[]): Sections with rows

**Example:**

```json
{
  "id": "block-2",
  "type": "interactive_list",
  "data": {
    "listBody": "Selecione um departamento:",
    "listButtonText": "Ver opções",
    "listSections": [
      {
        "title": "Atendimento",
        "rows": [
          {
            "id": "opt_support",
            "title": "Suporte",
            "description": "Problemas técnicos",
            "nextBlockId": "block-3"
          }
        ]
      }
    ]
  }
}
```

---

### 4. `interactive_buttons` - Reply Buttons

**Purpose:** Send up to 3 reply buttons.

**Data Fields:**
- `buttonsBody` (string): Body text
- `buttonsFooter` (string?): Footer text
- `buttons` (ReplyButton[]): Buttons (max 3)

**Example:**

```json
{
  "id": "block-4",
  "type": "interactive_buttons",
  "data": {
    "buttonsBody": "Deseja continuar?",
    "buttons": [
      {
        "id": "btn_yes",
        "title": "Sim",
        "nextBlockId": "block-5"
      },
      {
        "id": "btn_no",
        "title": "Não",
        "nextBlockId": "block-6"
      }
    ]
  }
}
```

---

### 5. `condition` - Conditional Branch

**Purpose:** Evaluate conditions and branch to different blocks.

**Data Fields:**
- `conditions` (Condition[]): Array of conditions
- `defaultNextBlockId` (string?): Fallback if no condition matches

**Operators:**
- `==` - Equal
- `!=` - Not equal
- `>` - Greater than
- `<` - Less than
- `contains` - String contains
- `not_contains` - String does not contain

**Example:**

```json
{
  "id": "block-7",
  "type": "condition",
  "data": {
    "conditions": [
      {
        "variable": "department",
        "operator": "==",
        "value": "support",
        "nextBlockId": "block-support"
      },
      {
        "variable": "department",
        "operator": "==",
        "value": "sales",
        "nextBlockId": "block-sales"
      }
    ],
    "defaultNextBlockId": "block-default"
  }
}
```

---

### 6. `action` - Execute Action

**Purpose:** Modify variables or add tags.

**Action Types:**
- `set_variable` - Set a variable value
- `increment` - Increment a variable
- `add_tag` - Add a tag (TODO)
- `remove_tag` - Remove a tag (TODO)

**Example:**

```json
{
  "id": "block-8",
  "type": "action",
  "data": {
    "actionType": "set_variable",
    "actionParams": {
      "name": "department",
      "value": "support"
    }
  }
}
```

---

### 7. `delay` - Wait

**Purpose:** Delay before next block.

**Data Fields:**
- `delaySeconds` (number): Seconds to wait

**Note:** Currently logs only (TODO: implement scheduler).

---

### 8. `webhook` - External Webhook

**Purpose:** Call an external HTTP endpoint.

**Data Fields:**
- `webhookUrl` (string): URL to call
- `webhookMethod` ('GET' | 'POST'): HTTP method
- `webhookHeaders` (object?): Custom headers
- `webhookBody` (object?): Request body

**Example:**

```json
{
  "id": "block-9",
  "type": "webhook",
  "data": {
    "webhookUrl": "https://api.example.com/notify",
    "webhookMethod": "POST",
    "webhookBody": {
      "event": "flow_completed"
    }
  }
}
```

---

### 9. `ai_handoff` - Transfer to Bot/AI

**Purpose:** Complete flow and transfer to AI agent.

**Behavior:**
- Status: `fluxo_inicial` → `bot`
- Flow status: `transferred_ai`
- Next message goes to AI

---

### 10. `human_handoff` - Transfer to Human

**Purpose:** Complete flow and transfer to human agent.

**Behavior:**
- Status: `fluxo_inicial` → `humano`
- Flow status: `transferred_human`
- Agent receives notification
- Next message goes to agent

---

### 11. `end` - Flow End

**Purpose:** Complete flow without explicit transfer.

**Behavior:**
- Status: `fluxo_inicial` → `bot` (default)
- Flow status: `completed`
- Next message goes to AI

---

## Status Control

### Status Values

| Status | Description | Who Responds |
|--------|-------------|--------------|
| `bot` | Normal AI conversation | AI Agent |
| `humano` | Human agent conversation | Human Agent |
| `transferido` | Legacy transfer status | Human Agent |
| `fluxo_inicial` ⭐ | Navigating flow | Flow Executor |

### When Status Changes

**Start flow:**
```
bot → fluxo_inicial
```

**Transfer to bot:**
```
fluxo_inicial → bot
```

**Transfer to human:**
```
fluxo_inicial → humano
```

**Complete flow (no transfer):**
```
fluxo_inicial → bot (default)
```

### Critical Rule

⚠️ **When status is `fluxo_inicial`, human agents CANNOT respond.**

This prevents agents from interfering while the contact navigates the flow.

---

## Error Handling

### Common Errors

**1. Flow not found**

```typescript
try {
  await executor.startFlow('invalid-id', 'client-id', 'phone')
} catch (error) {
  // Error: Flow not found or inactive: invalid-id
}
```

**2. Execution already exists**

```typescript
try {
  await executor.startFlow('flow-id', 'client-id', 'phone')
} catch (error) {
  // Error: Contact {phone} already has an active flow execution
}
```

**3. Invalid block configuration**

```typescript
// Missing required field
{
  "type": "interactive_list",
  "data": {
    // Missing listBody, listButtonText, listSections
  }
}
// Throws: Invalid list block configuration
```

### Error Handling Best Practices

1. **Always wrap in try-catch:**

```typescript
try {
  await executor.startFlow(flowId, clientId, phone)
} catch (error) {
  console.error('Flow error:', error)
  // Fallback: let AI handle the conversation
}
```

2. **Validate flow before starting:**

```typescript
const { data: flow } = await supabase
  .from('interactive_flows')
  .select('*')
  .eq('id', flowId)
  .eq('is_active', true)
  .single()

if (!flow) {
  throw new Error('Flow not active')
}
```

3. **Monitor execution logs:**

```typescript
console.log(`🔄 [FlowExecutor] ...`) // All logs prefixed
```

---

## Examples

### Complete Flow Example

**Scenario:** Support flow with transfer option

```typescript
const flow: InteractiveFlow = {
  id: 'flow-support',
  clientId: 'client-xyz',
  name: 'Support Flow',
  isActive: true,
  triggerType: 'keyword',
  triggerKeywords: ['suporte', 'ajuda'],
  startBlockId: 'start',
  blocks: [
    {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: {}
    },
    {
      id: 'msg-welcome',
      type: 'message',
      position: { x: 0, y: 100 },
      data: {
        messageText: 'Olá! Como posso ajudar?'
      }
    },
    {
      id: 'list-options',
      type: 'interactive_list',
      position: { x: 0, y: 200 },
      data: {
        listBody: 'Escolha uma opção:',
        listButtonText: 'Ver opções',
        listSections: [
          {
            title: 'Atendimento',
            rows: [
              {
                id: 'opt_faq',
                title: 'FAQ',
                nextBlockId: 'transfer-bot'
              },
              {
                id: 'opt_agent',
                title: 'Falar com atendente',
                nextBlockId: 'transfer-human'
              }
            ]
          }
        ]
      }
    },
    {
      id: 'transfer-bot',
      type: 'ai_handoff',
      position: { x: -100, y: 300 },
      data: {}
    },
    {
      id: 'transfer-human',
      type: 'human_handoff',
      position: { x: 100, y: 300 },
      data: {}
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'msg-welcome' },
    { id: 'e2', source: 'msg-welcome', target: 'list-options' }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

// Start flow
const executor = new FlowExecutor()
await executor.startFlow('flow-support', 'client-xyz', '5554999999999')

// User clicks "Falar com atendente"
await executor.continueFlow(
  'client-xyz',
  '5554999999999',
  'Falar com atendente',
  'opt_agent'
)
// Result: Status changes to 'humano', agent notified
```

---

## Integration with Webhook

**In your webhook handler:**

```typescript
// src/app/api/webhook/[clientId]/route.ts

import { FlowExecutor } from '@/lib/flows/flowExecutor'
import { parseInteractiveMessage } from '@/lib/whatsapp/interactiveMessages'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const message = body.entry[0]?.changes[0]?.value?.messages?.[0]
  const phone = message?.from
  
  // Check if message is interactive response
  const interactiveResponse = parseInteractiveMessage(message)
  
  if (interactiveResponse) {
    // User responded to flow - continue it
    const executor = new FlowExecutor()
    await executor.continueFlow(
      body.clientId,
      phone,
      interactiveResponse.title,
      interactiveResponse.id
    )
    return NextResponse.json({ success: true })
  }
  
  // Not interactive - check if should start flow
  // (Logic in Phase 4)
}
```

---

## Next Steps

This completes **Phase 3: Flow Executor + Status Control**.

**Phase 4** will integrate the executor with the webhook pipeline:
- Add `checkInteractiveFlow` node
- Implement routing by status
- Connect to chatbotFlow.ts

For more information, see:
- [`PLANO_FLOWS_INTERATIVOS.md`](./PLANO_FLOWS_INTERATIVOS.md)
- [`CHECKLIST_FLOWS_INTERATIVOS.md`](./CHECKLIST_FLOWS_INTERATIVOS.md)

---

**Last Updated:** 2025-12-06
**Author:** Luis Boff + Claude Code
**Phase:** 3 - Executor + Status Control
