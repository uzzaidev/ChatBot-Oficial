# Backend Monitor - Real-Time Message Flow Visualization

## 📋 Overview

The Backend Monitor is a new dashboard page that provides real-time visualization of message flow through the chatbot system, displayed in a terminal-style interface. This allows developers and administrators to debug and understand how messages are processed through each node in the workflow.

**Latest Update:** Improved status detection, WhatsApp status indicators, and missing output warnings (commit 7f89b0a)

## 🎯 Purpose

- **Debug in Production**: Monitor message flow without accessing server logs or terminal
- **Real-Time Visibility**: See exactly where messages are in the processing pipeline
- **Parallel Execution Tracking**: Monitor multiple concurrent message flows simultaneously
- **Detailed Tracing**: View input/output data for each node execution with timestamps
- **WhatsApp Status Tracking**: Monitor message delivery status (sent/delivered/read/failed)
- **Missing Data Detection**: Identify when nodes don't log output data
- **User-Friendly**: Terminal-style output that's familiar to developers but accessible via browser

## 🔗 Access

Navigate to: **`/dashboard/backend`**

Or click **"Backend Monitor"** in the dashboard navigation (Terminal icon 🖥️)

## 🎨 Features

### 1. Terminal-Style Interface
- **Black background with green text** - Classic terminal aesthetic
- **Monospace font** - Easy to read code and JSON
- **Color-coded output**:
  - 🟢 Green: Success status and output data
  - 🔵 Blue: Input data
  - 🔴 Red: Errors
  - 🟡 Yellow: Running/in-progress
  - ⚪ Gray: Metadata and timestamps

### 2. Execution List Sidebar
Shows all active message processing executions:
- **Execution ID** (first 8 characters)
- **Status badge** (success/error/running)
- **STATUS badge** (purple, for WhatsApp status updates)
- **Number of nodes executed**
- **Start timestamp**
- **Phone number** (if available in metadata)
- Click any execution to view its detailed flow

### 3. Terminal Output (Main Panel)
Displays the complete flow trace for selected execution:

```
╔════════════════════════════════════════════════════════════════╗
║ CHATBOT BACKEND MONITOR - MESSAGE FLOW TRACE
║ Execution: abc123de-f456-7890-ghij-klmnopqrstuv
║ Started: 16/11/2024 14:30:45
║ Phone: 5511999999999
╚════════════════════════════════════════════════════════════════╝

[14:30:45.123] ✓ parseMessage (15ms)
→ INPUT:
  {
    "from": "5511999999999",
    "type": "text",
    "content": "Olá, preciso de ajuda!"
  }
← OUTPUT:
  {
    "phone": "5511999999999",
    "name": "João Silva",
    "message": "Olá, preciso de ajuda!"
  }

[14:30:45.145] ✓ fetchCustomerData (23ms)
→ INPUT:
  {
    "phone": "5511999999999"
  }
← OUTPUT:
  {
    "customer_id": "cust_abc123",
    "status": "bot",
    "conversation_id": "conv_xyz789"
  }

[14:30:45.201] ✓ generateAIResponse (142ms)
→ INPUT:
  {
    "message": "Olá, preciso de ajuda!",
    "history": [...]
  }
⚠ OUTPUT: (dados não registrados pelo node)

[14:30:45.500] ✓ Filter Status Updates (5ms) 📱 DELIVERED
→ INPUT:
  {
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{"status": "delivered", ...}]
        }
      }]
    }]
  }
  }

[14:30:45.201] ✓ generateAIResponse (142ms)
→ INPUT:
  {
    "message": "Olá, preciso de ajuda!",
    "history": [...]
  }
← OUTPUT:
  {
    "response": "Olá! Como posso ajudá-lo?",
    "tokens_used": 156
  }

─────────────────────────────────────────────────────────────────
End of execution log - Status: success
● Monitoring live...
```

### 4. Real-Time Controls

**🔄 Live / ⏸️ Pausado**
- Toggle auto-refresh (polls every 2 seconds)
- Live indicator shows when monitoring is active

**📜 Auto-scroll ON / OFF**
- Automatically scrolls to bottom as new logs arrive
- Useful for monitoring long-running executions

**🔃 Atualizar**
- Manual refresh button
- Useful when auto-refresh is paused

## 📊 Data Displayed

For each node execution, you see:

1. **Timestamp** - High precision (HH:MM:SS.mmm)
2. **Status Icon**:
   - ✓ Success
   - ✗ Error
   - ⋯ Running
3. **Node Name** - e.g., parseMessage, generateAIResponse, sendWhatsApp
4. **Duration** - Execution time in milliseconds
5. **WhatsApp Status Badge** - 📱 SENT/DELIVERED/READ/FAILED (purple badge)
6. **Input Data** - JSON data received by the node
7. **Output Data** - JSON data produced by the node
8. **Missing Output Warning** - ⚠ When node succeeds but doesn't log output
9. **Error Details** - Full error object if node failed

### WhatsApp Status Badges

When a node processes a WhatsApp status update, it displays a purple badge:
- 📱 **SENT** - Message was sent to WhatsApp
- 📱 **DELIVERED** - Message was delivered to recipient's device
- 📱 **READ** - Message was read by recipient
- 📱 **FAILED** - Message failed to send

These status updates are also marked with a "STATUS" badge in the sidebar for easy identification.

### Missing Output Warning

When a node completes successfully but didn't log output data, you'll see:
```
⚠ OUTPUT: (dados não registrados pelo node)
```

This indicates the n8n workflow needs to be updated to log the node's output using `logger.logNodeSuccess(nodeName, outputData)`.

### Execution Status Detection

The system intelligently determines execution status:
1. If any node has an error → Status: **ERROR**
2. If `_END` node exists → Uses its status
3. If all non-system nodes completed → Status: **SUCCESS**
4. Otherwise → Status: **RUNNING**

This prevents false "running" status for completed executions.

## 🔍 Use Cases

### 1. Debug Failed Messages
When a message doesn't reach the user:
- Select the execution in sidebar
- Check which node failed (red ✗)
- View the error details
- See the input data that caused the failure

### 2. Performance Analysis
- Check duration_ms for each node
- Identify bottlenecks (nodes taking >1000ms)
- Optimize slow nodes

### 3. Data Flow Verification
- Verify correct data is passed between nodes
- Check transformations are working
- Ensure no data loss in the pipeline

### 4. Parallel Execution Monitoring
When multiple messages arrive simultaneously:
- Each execution appears in sidebar
- Click to switch between different flows
- Compare how different messages are processed

## 🛠️ Technical Details

### API Endpoint
**`GET /api/backend/stream`**

Query parameters:
- `execution_id` - Filter to specific execution
- `limit` - Number of logs to fetch (default: 100)
- `since` - ISO timestamp for incremental updates

Response format:
```json
{
  "success": true,
  "executions": [
    {
      "execution_id": "uuid",
      "logs": [...],
      "started_at": "2024-11-16T14:30:45.123Z",
      "last_update": "2024-11-16T14:30:47.456Z",
      "status": "success",
      "metadata": { "from": "5511999999999" },
      "node_count": 12
    }
  ],
  "total": 1,
  "timestamp": "2024-11-16T14:30:50.000Z"
}
```

### Database Schema
Uses the existing `execution_logs` table:
```sql
CREATE TABLE execution_logs (
  id BIGSERIAL PRIMARY KEY,
  execution_id UUID NOT NULL,
  node_name TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  error JSONB,
  status TEXT CHECK (status IN ('running', 'success', 'error')),
  duration_ms INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);
```

### Component Architecture
- **Page**: `src/app/dashboard/backend/page.tsx` (Client Component)
- **API**: `src/app/api/backend/stream/route.ts` (Server Component)
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Auto-refresh**: setInterval with 2-second polling
- **Data Merging**: Maintains execution history while adding new logs

## 🚀 How It Works

1. **Message arrives** via WhatsApp webhook
2. **n8n workflow starts processing** and logs to `execution_logs` table
3. **Backend Monitor polls** the API every 2 seconds
4. **API groups logs** by execution_id
5. **UI updates** sidebar with new executions
6. **User selects execution** to view detailed flow
7. **Terminal displays** all nodes with input/output/errors
8. **Auto-scroll** keeps latest logs visible

## 🎯 Comparison with Existing Debug Page

| Feature | `/dashboard/debug` | `/dashboard/backend` (NEW) |
|---------|-------------------|---------------------------|
| **Style** | Cards with tables | Terminal output |
| **Focus** | Test messages | Production monitoring |
| **Layout** | 3-column grid | 2-panel (sidebar + terminal) |
| **Updates** | Manual/polling | Live auto-refresh |
| **Parallel tracking** | Single execution view | Multi-execution sidebar |
| **Developer UX** | Dashboard-like | Console/log-like |

## 📝 Future Enhancements

Possible improvements:
- [ ] Filter by status (success/error/running)
- [ ] Search by phone number
- [ ] Date range filtering
- [ ] Export logs to file
- [ ] WebSocket for real-time updates (instead of polling)
- [ ] Node execution graph visualization
- [ ] Performance metrics dashboard
- [ ] Alert on error patterns

## 🐛 Troubleshooting

### No executions showing
- Ensure `execution_logs` table exists (run migration `002_execution_logs.sql`)
- Check that logging is enabled in the workflow
- Send a test message to generate logs

### API returns empty array
- Check Supabase credentials are configured
- Verify RLS policies allow reading `execution_logs`
- Check database connection

### Terminal not updating
- Verify auto-refresh is ON (should show "🔄 Live")
- Check browser console for API errors
- Try manual refresh button

## 📚 Related Documentation

- **Migration**: `migrations/002_execution_logs.sql`
- **Logger Library**: `src/lib/logger.ts`
- **Types**: `src/lib/types.ts` (ExecutionLog interface)
- **Existing Debug Page**: `src/app/dashboard/debug/page.tsx`

## 👥 User Feedback

This feature was requested to provide:
> "uma pagina de backend... que sempre que receba uma mensagem ou algo, mostre o caminho dela, se possível em tempo real, como se fosse o terminal rodando com console.log mas para o usuario, para ele poder ver o caminho que esta fazendo desde quando recebe a mensagem ate ser enviado"

The implementation delivers exactly this: a terminal-style, real-time view of message flow through the system, with support for parallel message tracking and detailed debugging information.
