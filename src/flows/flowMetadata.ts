/**
 * Flow Metadata - Single Source of Truth
 * 
 * This file defines all nodes in the chatbot flow architecture.
 * Both chatbotFlow.ts and FlowArchitectureManager.tsx import from here
 * to ensure 100% synchronization.
 * 
 * When adding a new node:
 * 1. Add it to this FLOW_METADATA array
 * 2. Implement the node function in src/nodes/
 * 3. Import and use it in chatbotFlow.ts
 * 4. The diagram will automatically show the new node
 */

export interface FlowNodeMetadata {
  id: string
  name: string
  description: string
  category: 'preprocessing' | 'analysis' | 'generation' | 'output' | 'auxiliary'
  configKey?: string // Key in bot_configurations table
  enabled: boolean // Default enabled state
  hasConfig: boolean // Whether this node has editable configuration
  configurable: boolean // Whether this node can be enabled/disabled
  dependencies?: string[] // Node IDs that this node depends on
  optionalDependencies?: string[] // Alternative paths if primary dependency is disabled
  bypassable: boolean // Whether this node can be bypassed if disabled
}

/**
 * Complete flow architecture metadata
 * Order matters - represents execution order in the flow
 */
export const FLOW_METADATA: FlowNodeMetadata[] = [
  // ========================================
  // PREPROCESSING NODES (1-8)
  // ========================================
  {
    id: 'filter_status',
    name: 'Filter Status Updates',
    description: 'Filtra status updates do WhatsApp',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required
    bypassable: false,
  },
  {
    id: 'parse_message',
    name: 'Parse Message',
    description: 'Extrai informações da mensagem',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required
    bypassable: false,
    dependencies: ['filter_status'],
  },
  {
    id: 'check_customer',
    name: 'Check/Create Customer',
    description: 'Verifica ou cria cliente no banco',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required
    bypassable: false,
    dependencies: ['parse_message'],
  },
  {
    id: 'process_media',
    name: 'Process Media',
    description: 'Processa áudio/imagem/documento',
    category: 'preprocessing',
    enabled: true,
    hasConfig: true,
    configurable: true, // Can be disabled
    configKey: 'media_processing:config',
    bypassable: true,
    dependencies: ['check_customer'],
  },
  {
    id: 'normalize_message',
    name: 'Normalize Message',
    description: 'Normaliza conteúdo da mensagem',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required
    bypassable: false,
    dependencies: ['process_media'],
  },
  {
    id: 'push_to_redis',
    name: 'Push to Redis',
    description: 'Envia mensagem para fila Redis',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    configurable: true, // Can be disabled for testing
    bypassable: true,
    dependencies: ['normalize_message'],
  },
  {
    id: 'save_user_message',
    name: 'Save User Message',
    description: 'Salva mensagem do usuário no histórico',
    category: 'preprocessing',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required for history
    bypassable: false,
    dependencies: ['push_to_redis'],
  },
  {
    id: 'batch_messages',
    name: 'Batch Messages',
    description: 'Agrupa mensagens sequenciais',
    category: 'preprocessing',
    enabled: true,
    hasConfig: true,
    configurable: true, // Can be disabled
    configKey: 'batching:delay_seconds',
    bypassable: true,
    dependencies: ['save_user_message'],
  },
  
  // ========================================
  // ANALYSIS NODES (9-10)
  // ========================================
  {
    id: 'get_chat_history',
    name: 'Get Chat History',
    description: 'Busca histórico de conversas',
    category: 'analysis',
    enabled: true,
    hasConfig: true,
    configurable: true, // Can be disabled
    configKey: 'chat_history:max_messages',
    bypassable: true,
    dependencies: ['batch_messages'],
    optionalDependencies: ['save_user_message'], // Bypass if batch is disabled
  },
  {
    id: 'get_rag_context',
    name: 'Get RAG Context',
    description: 'Busca contexto relevante (vector search)',
    category: 'analysis',
    enabled: true,
    hasConfig: true,
    configurable: true, // Can be disabled
    configKey: 'rag:enabled',
    bypassable: true,
    dependencies: ['batch_messages'],
    optionalDependencies: ['save_user_message'], // Bypass if batch is disabled
  },

  // ========================================
  // AUXILIARY AGENTS (9.5, 9.6)
  // ========================================
  {
    id: 'check_continuity',
    name: 'Check Continuity',
    description: 'Detecta nova conversa vs continuação',
    category: 'auxiliary',
    enabled: true,
    hasConfig: true,
    configurable: true, // Can be disabled
    configKey: 'continuity:new_conversation_threshold_hours',
    bypassable: true,
    dependencies: ['get_chat_history'],
    optionalDependencies: ['batch_messages', 'save_user_message'], // Bypass if history is disabled
  },
  {
    id: 'classify_intent',
    name: 'Classify Intent',
    description: 'Classifica intenção do usuário',
    category: 'auxiliary',
    enabled: true,
    hasConfig: true,
    configurable: true, // Can be disabled
    configKey: 'intent_classifier:use_llm',
    bypassable: true,
    dependencies: ['batch_messages'],
    optionalDependencies: ['save_user_message'], // Bypass if batch is disabled
  },
  
  // ========================================
  // GENERATION NODE (11)
  // ========================================
  {
    id: 'generate_response',
    name: 'Generate AI Response',
    description: 'Gera resposta com LLM (Groq/OpenAI)',
    category: 'generation',
    enabled: true,
    hasConfig: true,
    configurable: false, // Cannot be disabled - core functionality
    configKey: 'personality:config',
    bypassable: false,
    dependencies: ['check_continuity', 'classify_intent', 'get_rag_context'],
    optionalDependencies: ['batch_messages', 'save_user_message'], // Ultimate bypass if all analysis disabled
  },

  // ========================================
  // POST-PROCESSING NODES (11.5, 11.6)
  // ========================================
  {
    id: 'detect_repetition',
    name: 'Detect Repetition',
    description: 'Detecta respostas repetitivas',
    category: 'auxiliary',
    enabled: true,
    hasConfig: true,
    configurable: true, // Can be disabled
    configKey: 'repetition_detector:similarity_threshold',
    bypassable: true,
    dependencies: ['generate_response'],
  },
  {
    id: 'save_ai_message',
    name: 'Save AI Message',
    description: 'Salva resposta da IA no histórico',
    category: 'auxiliary',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required for history
    bypassable: false,
    dependencies: ['detect_repetition'],
    optionalDependencies: ['generate_response'], // Bypass if repetition disabled
  },

  // ========================================
  // OUTPUT NODES (12-14)
  // ========================================
  {
    id: 'format_response',
    name: 'Format Response',
    description: 'Formata resposta para WhatsApp',
    category: 'output',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required
    bypassable: false,
    dependencies: ['save_ai_message'],
    optionalDependencies: ['generate_response'], // Bypass if save disabled
  },
  {
    id: 'send_whatsapp',
    name: 'Send WhatsApp Message',
    description: 'Envia mensagem via Meta API',
    category: 'output',
    enabled: true,
    hasConfig: false,
    configurable: false, // Always runs - required
    bypassable: false,
    dependencies: ['format_response'],
  },
]

/**
 * Get metadata for a specific node
 */
export function getNodeMetadata(nodeId: string): FlowNodeMetadata | undefined {
  return FLOW_METADATA.find(node => node.id === nodeId)
}

/**
 * Get all nodes of a specific category
 */
export function getNodesByCategory(category: FlowNodeMetadata['category']): FlowNodeMetadata[] {
  return FLOW_METADATA.filter(node => node.category === category)
}

/**
 * Get all configurable nodes (can be enabled/disabled)
 */
export function getConfigurableNodes(): FlowNodeMetadata[] {
  return FLOW_METADATA.filter(node => node.configurable)
}

/**
 * Get nodes that depend on a specific node
 */
export function getDependentNodes(nodeId: string): FlowNodeMetadata[] {
  return FLOW_METADATA.filter(node => 
    node.dependencies?.includes(nodeId) || 
    node.optionalDependencies?.includes(nodeId)
  )
}

/**
 * Validate metadata consistency
 * Run this in development to ensure all dependencies exist
 */
export function validateMetadata(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const nodeIds = new Set(FLOW_METADATA.map(n => n.id))
  
  FLOW_METADATA.forEach(node => {
    // Check dependencies exist
    node.dependencies?.forEach(depId => {
      if (!nodeIds.has(depId)) {
        errors.push(`Node '${node.id}' has invalid dependency '${depId}'`)
      }
    })
    
    // Check optional dependencies exist
    node.optionalDependencies?.forEach(depId => {
      if (!nodeIds.has(depId)) {
        errors.push(`Node '${node.id}' has invalid optional dependency '${depId}'`)
      }
    })
    
    // Check configurable nodes have configKey
    if (node.hasConfig && !node.configKey) {
      errors.push(`Node '${node.id}' has hasConfig=true but no configKey`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Validate metadata on import in development
if (process.env.NODE_ENV === 'development') {
  const validation = validateMetadata()
  if (!validation.valid) {
    console.warn('⚠️ Flow metadata validation errors:', validation.errors)
  }
}
