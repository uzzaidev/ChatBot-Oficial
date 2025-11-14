# 🎛️ Flow Architecture Manager - Visual Interface Documentation

> **Deployment Status**: Ready for testing on Vercel

## Overview

The Flow Architecture Manager is an interactive visual interface for managing the complete multi-agent chatbot processing pipeline. It provides a Mermaid-based flowchart that shows all nodes (agents) in the system, their connections, and allows click-to-configure interactions.

## Features

### ✨ Core Capabilities

1. **Visual Flow Representation**
   - Interactive Mermaid diagram showing complete processing pipeline
   - Color-coded nodes by category (Preprocessing, Analysis, Auxiliary, Generation, Output)
   - Dynamic connections showing data flow between nodes

2. **Click-to-Configure**
   - Click any node to open its configuration panel
   - Edit prompts, temperature, thresholds, and other settings
   - Enable/disable nodes with visual feedback

3. **Real-time Updates**
   - Changes sync to Supabase `bot_configurations` table
   - Diagram auto-refreshes when nodes are enabled/disabled
   - Visual feedback for save operations

4. **User-Friendly Interface**
   - Fullscreen mode for better visualization
   - ⚙️ icon indicates configurable nodes
   - Clear categorization with color coding
   - Responsive design for all screen sizes

## Architecture

### Node Categories

1. **Preprocessing** (Blue) - Nodes 1-6
   - Filter Status Updates
   - Parse Message
   - Check/Create Customer
   - Process Media
   - Normalize Message
   - Batch Messages

2. **Analysis** (Yellow) - Nodes 9-10
   - Get Chat History
   - Get RAG Context

3. **Auxiliary Agents** (Purple) - Nodes 9.5, 9.6, 11.5
   - Check Continuity
   - Classify Intent
   - Detect Repetition

4. **Generation** (Green) - Node 11
   - Generate AI Response (Main LLM)

5. **Output** (Red) - Nodes 12-14
   - Format Response
   - Send WhatsApp Message

### Data Flow

```
Preprocessing → Analysis → Auxiliary → Generation → Post-Processing → Output
```

## Usage

### Accessing the Interface

1. Navigate to **Dashboard** → **Arquitetura do Fluxo** (or `/dashboard/flow-architecture`)
2. The Mermaid diagram loads automatically showing all nodes

### Viewing the Flow

- **Color Legend**: Displayed at the top shows node categories
- **Node Labels**: Name + ⚙️ icon for configurable nodes
- **Connections**: Arrows show data dependencies
- **Fullscreen**: Click "Tela Cheia" button for expanded view

### Configuring Nodes

1. **Click on a node** in the diagram
2. Configuration panel opens with:
   - **Status Toggle**: Enable/disable the node
   - **Settings**: Node-specific configuration fields
   - **Save Button**: Persist changes to database

3. **Available Configurations** (depending on node type):
   - **Prompts**: System prompts for AI agents
   - **Temperature**: Creativity level (0.0 - 2.0)
   - **Thresholds**: Similarity thresholds, time limits
   - **Toggles**: Enable/disable features (use_llm, etc.)

### Example: Configuring the Intent Classifier

1. Click on "Classify Intent" node
2. Toggle "Use LLM for Classification" on/off
3. Edit prompt if LLM is enabled
4. Click "Salvar Configurações"
5. Diagram automatically updates

## Technical Implementation

### Components

**Main Component**: `src/components/FlowArchitectureManager.tsx`
- React functional component with hooks
- Mermaid.js integration for diagram rendering
- Dialog-based configuration panel
- State management for nodes and configurations

**API Routes**: `src/app/api/flow/nodes/[nodeId]/route.ts`
- `GET /api/flow/nodes/[nodeId]` - Fetch node configuration
- `PATCH /api/flow/nodes/[nodeId]` - Update node configuration

**Page**: `src/app/dashboard/flow-architecture/page.tsx`
- Dashboard integration
- Simple wrapper for FlowArchitectureManager component

### Database Schema

Configurations are stored in `bot_configurations` table:

```sql
CREATE TABLE bot_configurations (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  config_key TEXT NOT NULL,          -- e.g., 'personality:config'
  config_value JSONB NOT NULL,       -- flexible JSON configuration
  is_default BOOLEAN DEFAULT false,
  description TEXT,
  category TEXT,                     -- 'prompts', 'rules', 'thresholds', 'personality'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, config_key)
);
```

### Node Configuration Mapping

| Node ID | Config Key | Description |
|---------|-----------|-------------|
| `process_media` | `media_processing:config` | Media processing settings |
| `batch_messages` | `batching:delay_seconds` | Batching delay in seconds |
| `get_chat_history` | `chat_history:max_messages` | Maximum history messages |
| `get_rag_context` | `rag:enabled` | Enable RAG context retrieval |
| `check_continuity` | `continuity:new_conversation_threshold_hours` | New conversation threshold |
| `classify_intent` | `intent_classifier:use_llm` | Use LLM for classification |
| `generate_response` | `personality:config` | Main personality/prompt |
| `detect_repetition` | `repetition_detector:similarity_threshold` | Repetition threshold |

## Future Enhancements

### Phase 2 Features (Planned)

1. **Real-time Collaboration**
   - Multiple users editing simultaneously
   - Live cursor positions
   - Conflict resolution

2. **Node Metrics**
   - Show execution count
   - Average latency
   - Error rate overlay

3. **Drag-and-Drop**
   - Reorder nodes visually
   - Add custom nodes
   - Create branches dynamically

4. **Version Control**
   - Configuration history
   - Rollback to previous versions
   - A/B testing configurations

5. **Advanced Features**
   - Export/import flow configurations
   - Template library for common patterns
   - Visual debugging mode
   - Performance bottleneck highlighting

## Best Practices

### For Administrators

1. **Before Disabling Nodes**:
   - Understand dependencies
   - Test in staging environment first
   - Document reason for disabling

2. **When Editing Prompts**:
   - Keep prompts concise and clear
   - Test with sample conversations
   - Version control critical changes

3. **Configuration Management**:
   - Use descriptive names
   - Document custom configurations
   - Regular backups of configurations

### For Developers

1. **Adding New Nodes**:
   ```typescript
   // In FlowArchitectureManager.tsx
   const NEW_NODE: FlowNode = {
     id: 'my_new_node',
     name: 'My New Node',
     description: 'Description of what this node does',
     category: 'auxiliary', // or 'preprocessing', 'analysis', etc.
     enabled: true,
     hasConfig: true,
     configKey: 'my_node:config',
     dependencies: ['previous_node_id'], // optional
   }
   ```

2. **Adding Configuration Fields**:
   - Update `NodeConfig` interface
   - Add config key mapping in API route
   - Add UI fields in configuration panel
   - Update database if needed

3. **Testing**:
   - Test enable/disable functionality
   - Verify configuration persistence
   - Check diagram rendering
   - Validate data flow

## Troubleshooting

### Common Issues

**Diagram Not Rendering**
- Clear browser cache
- Check browser console for Mermaid errors
- Verify all nodes have valid IDs and dependencies

**Configuration Not Saving**
- Check network tab for API errors
- Verify Supabase credentials in `.env.local`
- Check bot_configurations table exists

**Node Click Not Working**
- Ensure SVG elements are properly rendered
- Check browser console for JavaScript errors
- Verify click handlers are attached

### Debug Mode

Enable verbose logging:
```typescript
// In FlowArchitectureManager.tsx
const DEBUG = true; // Set to true for debugging

if (DEBUG) {
  console.log('Rendering diagram:', diagram)
  console.log('Node clicked:', nodeId)
}
```

## Related Documentation

- [CHATBOT_FLOW_ARCHITECTURE.md](/docs/CHATBOT_FLOW_ARCHITECTURE.md) - Complete flow architecture
- [BOT_CONFIGURATION_USAGE.md](/docs/BOT_CONFIGURATION_USAGE.md) - Configuration system guide
- [Mermaid Documentation](https://mermaid.js.org/intro/) - Diagram syntax reference

## Support

For issues or questions:
1. Check this documentation
2. Review existing GitHub issues
3. Create new issue with:
   - Description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser console logs
   - Screenshots (if applicable)

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Status**: ✅ Production Ready
