import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/flow/nodes/[nodeId]
 * Fetch configuration for a specific node
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const { nodeId } = params
    const supabase = createRouteHandlerClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get client_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.client_id) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const clientId = profile.client_id

    // Map nodeId to config_key
    const configKeyMap: Record<string, string> = {
      process_media: 'media_processing:config',
      batch_messages: 'batching:delay_seconds',
      get_chat_history: 'chat_history:max_messages',
      get_rag_context: 'rag:enabled',
      check_continuity: 'continuity:new_conversation_threshold_hours',
      classify_intent: 'intent_classifier:use_llm',
      generate_response: 'personality:config',
      detect_repetition: 'repetition_detector:similarity_threshold',
    }

    const configKey = configKeyMap[nodeId]
    
    // Also check for node enabled state
    const enabledConfigKey = `flow:node_enabled:${nodeId}`
    
    let config: any = { enabled: true }

    // Fetch node enabled state
    const { data: enabledData, error: enabledFetchError } = await supabase
      .from('bot_configurations')
      .select('config_value')
      .eq('client_id', clientId)
      .eq('config_key', enabledConfigKey)
      .single()

    // If there's an error AND it's not just "not found", log it
    if (enabledFetchError && enabledFetchError.code !== 'PGRST116') {
      console.error('[flow/nodes] Error fetching enabled state:', enabledFetchError)
    }

    if (enabledData && enabledData.config_value) {
      // Handle both boolean and string values (defensive programming)
      const enabledValue = enabledData.config_value.enabled
      config.enabled = enabledValue === true || enabledValue === 'true'
      console.log(`[flow/nodes] ✓ Loaded node ${nodeId} enabled state: ${config.enabled} (raw: ${JSON.stringify(enabledValue)}) from database`)
    } else {
      console.log(`[flow/nodes] ℹ No database entry for node ${nodeId}, using default: enabled=true`)
    }

    // Special handling for generate_response node - fetch from clients table
    if (nodeId === 'generate_response') {
      // Fetch agent configuration from clients table (same as settings page)
      const { data: clientData } = await supabase
        .from('clients')
        .select('system_prompt, formatter_prompt, openai_model, groq_model, primary_model_provider, settings')
        .eq('id', clientId)
        .single()
      
      if (clientData) {
        // Merge all client fields into config
        config.system_prompt = clientData.system_prompt || ''
        config.formatter_prompt = clientData.formatter_prompt || ''
        config.openai_model = clientData.openai_model || 'gpt-4o'
        config.groq_model = clientData.groq_model || 'llama-3.3-70b-versatile'
        config.primary_model_provider = clientData.primary_model_provider || 'groq'
        
        // Also extract temperature and max_tokens from settings if available
        if (clientData.settings) {
          if (clientData.settings.temperature !== undefined) {
            config.temperature = clientData.settings.temperature
          }
          if (clientData.settings.max_tokens !== undefined) {
            config.max_tokens = clientData.settings.max_tokens
          }
        }
      }
    } else {
      // For other nodes, fetch from bot_configurations

      // 1. Fetch primary config key
      if (configKey) {
        const { data: configData, error: configFetchError } = await supabase
          .from('bot_configurations')
          .select('config_value')
          .eq('client_id', clientId)
          .eq('config_key', configKey)
          .single()

        // Log errors except "not found"
        if (configFetchError && configFetchError.code !== 'PGRST116') {
          console.error('[flow/nodes] Error fetching config:', configFetchError)
        }

        if (configData && configData.config_value !== null) {
          // Handle primitive values (number, boolean, string) vs objects
          if (typeof configData.config_value === 'object' && !Array.isArray(configData.config_value)) {
            // Already an object - merge all its keys
            config = { ...config, ...configData.config_value }
          } else {
            // Primitive value - extract field name from config_key
            // e.g., 'chat_history:max_messages' -> 'max_messages'
            const keyParts = configKey.split(':')
            const fieldName = keyParts[keyParts.length - 1]
            config[fieldName] = configData.config_value
          }
        }
      }

      // 2. Fetch ALL related configs for this node
      // This ensures we show all editable fields even if they're in different config keys
      const relatedConfigKeys = getRelatedConfigKeys(nodeId)
      if (relatedConfigKeys.length > 0) {
        const { data: relatedConfigs, error: relatedFetchError } = await supabase
          .from('bot_configurations')
          .select('config_key, config_value')
          .eq('client_id', clientId)
          .in('config_key', relatedConfigKeys)

        // Log errors (not using .single() so no "not found" code)
        if (relatedFetchError) {
          console.error('[flow/nodes] Error fetching related configs:', relatedFetchError)
        }

        if (relatedConfigs && relatedConfigs.length > 0) {
          // Merge all related configs into the main config object
          relatedConfigs.forEach((item) => {
            if (item.config_value !== null) {
              if (typeof item.config_value === 'object' && !Array.isArray(item.config_value)) {
                // It's an object - merge all its keys
                config = { ...config, ...item.config_value }
              } else {
                // It's a primitive value - extract the key name from config_key
                // e.g., 'continuity:new_conversation_threshold_hours' -> 'new_conversation_threshold_hours'
                const keyParts = item.config_key.split(':')
                const fieldName = keyParts[keyParts.length - 1]
                config[fieldName] = item.config_value
              }
            }
          })
        }
      }
    }

    return NextResponse.json({
      nodeId,
      configKey: configKey || enabledConfigKey,
      config,
    })
  } catch (error: any) {
    console.error('[flow/nodes] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/flow/nodes/[nodeId]
 * Update configuration for a specific node
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const { nodeId } = params
    const body = await request.json()
    const { enabled, config } = body

    const supabase = createRouteHandlerClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get client_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.client_id) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const clientId = profile.client_id

    // Map nodeId to config_key
    const configKeyMap: Record<string, string> = {
      process_media: 'media_processing:config',
      batch_messages: 'batching:delay_seconds',
      get_chat_history: 'chat_history:max_messages',
      get_rag_context: 'rag:enabled',
      check_continuity: 'continuity:new_conversation_threshold_hours',
      classify_intent: 'intent_classifier:use_llm',
      generate_response: 'personality:config',
      detect_repetition: 'repetition_detector:similarity_threshold',
    }

    const configKey = configKeyMap[nodeId]

    // Handle enabled/disabled state
    if (enabled !== undefined) {
      const enabledConfigKey = `flow:node_enabled:${nodeId}`
      
      // Ensure enabled is a boolean (defensive programming)
      const enabledBoolean = Boolean(enabled === true || enabled === 'true')
      
      const { error: enabledError } = await supabase
        .from('bot_configurations')
        .upsert(
          {
            client_id: clientId,
            config_key: enabledConfigKey,
            config_value: { enabled: enabledBoolean },
            is_default: false,
            category: 'rules',
            description: `Node enabled state for ${nodeId}`,
          },
          {
            onConflict: 'client_id,config_key',
          }
        )

      if (enabledError) {
        console.error('[flow/nodes] Error updating enabled state:', enabledError)
        return NextResponse.json({ error: enabledError.message }, { status: 500 })
      }
      
      console.log(`[flow/nodes] ✓ Node ${nodeId} enabled state updated to: ${enabledBoolean} (input: ${enabled}) for client: ${clientId}`)
    }

    // Handle configuration updates
    if (config) {
      if (nodeId === 'generate_response') {
        // Special handling for generate_response - save to clients table
        const updateData: any = { updated_at: new Date().toISOString() }
        
        if (config.system_prompt !== undefined) updateData.system_prompt = config.system_prompt
        if (config.formatter_prompt !== undefined) updateData.formatter_prompt = config.formatter_prompt
        if (config.openai_model !== undefined) updateData.openai_model = config.openai_model
        if (config.groq_model !== undefined) updateData.groq_model = config.groq_model
        if (config.primary_model_provider !== undefined) updateData.primary_model_provider = config.primary_model_provider
        
        // Update settings object with temperature and max_tokens
        if (config.temperature !== undefined || config.max_tokens !== undefined) {
          // First fetch current settings
          const { data: currentClient } = await supabase
            .from('clients')
            .select('settings')
            .eq('id', clientId)
            .single()
          
          const currentSettings = currentClient?.settings || {}
          const newSettings = { ...currentSettings }
          
          if (config.temperature !== undefined) newSettings.temperature = config.temperature
          if (config.max_tokens !== undefined) newSettings.max_tokens = config.max_tokens
          
          updateData.settings = newSettings
        }
        
        const { error: clientError } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', clientId)
        
        if (clientError) {
          console.error('[flow/nodes] Error updating client:', clientError)
          return NextResponse.json({ error: clientError.message }, { status: 500 })
        }
      } else if (configKey) {
        // For other nodes, save to bot_configurations
        const configValue = {
          ...config,
        }

        const { error: configError } = await supabase
          .from('bot_configurations')
          .upsert(
            {
              client_id: clientId,
              config_key: configKey,
              config_value: configValue,
              is_default: false,
              category: getCategoryFromKey(configKey),
              description: `Configuration for ${nodeId}`,
            },
            {
              onConflict: 'client_id,config_key',
            }
          )

        if (configError) {
          console.error('[flow/nodes] Error upserting config:', configError)
          return NextResponse.json({ error: configError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: enabled !== undefined 
        ? `Node ${enabled ? 'enabled' : 'disabled'}` 
        : 'Configuration updated',
    })
  } catch (error: any) {
    console.error('[flow/nodes] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get related config keys for a node
function getRelatedConfigKeys(nodeId: string): string[] {
  // Map nodes to their related configuration keys
  // This allows fetching all relevant configs for display in the UI
  const relatedKeysMap: Record<string, string[]> = {
    generate_response: [
      'personality:config',
      'personality:system_prompt',
      'personality:formatter_prompt',
      'model:primary_model_provider',
      'model:groq_model',
      'model:openai_model',
      'model:temperature',
      'model:max_tokens',
    ],
    classify_intent: [
      'intent_classifier:use_llm',
      'intent_classifier:prompt',
      'intent_classifier:intents',
      'intent_classifier:temperature',
    ],
    detect_repetition: [
      'repetition_detector:similarity_threshold',
      'repetition_detector:use_embeddings',
      'repetition_detector:check_last_n_responses',
      'repetition_detector:enabled',
    ],
    check_continuity: [
      'continuity:new_conversation_threshold_hours',
      'continuity:greeting_for_new_customer',
      'continuity:greeting_for_returning_customer',
      'continuity:enabled',
    ],
    get_chat_history: [
      'chat_history:max_messages',
      'chat_history:enabled',
    ],
    get_rag_context: [
      'rag:enabled',
      'rag:similarity_threshold',
      'rag:max_results',
    ],
    process_media: [
      'media_processing:config',
      'media_processing:enabled',
    ],
    batch_messages: [
      'batching:delay_seconds',
      'batching:enabled',
    ],
  }

  return relatedKeysMap[nodeId] || []
}

// Helper function to get default config values for a node (when no data in DB)
function getDefaultConfig(nodeId: string): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    check_continuity: {
      new_conversation_threshold_hours: 24,
      greeting_for_new_customer: 'Seja acolhedor e apresente o profissional brevemente. Esta é a PRIMEIRA interação com este cliente.',
      greeting_for_returning_customer: 'Continue de onde parou. NÃO se apresente novamente. O cliente já te conhece e vocês têm histórico de conversa.',
    },
    classify_intent: {
      use_llm: true,
      temperature: 0.1,
      prompt: {
        system: 'Você é um classificador de intenções. Analise a mensagem do usuário e identifique a intenção principal.',
        temperature: 0.1,
        max_tokens: 10,
      },
      intents: [
        { key: 'saudacao', label: 'Saudação', description: 'Cliente cumprimentando ou iniciando conversa' },
        { key: 'duvida_tecnica', label: 'Dúvida Técnica', description: 'Perguntas sobre como algo funciona' },
        { key: 'orcamento', label: 'Orçamento', description: 'Solicitação de preço ou cotação' },
        { key: 'agendamento', label: 'Agendamento', description: 'Marcar reunião ou horário' },
        { key: 'reclamacao', label: 'Reclamação', description: 'Insatisfação ou problema' },
        { key: 'agradecimento', label: 'Agradecimento', description: 'Gratidão pelo atendimento' },
        { key: 'despedida', label: 'Despedida', description: 'Finalização de conversa' },
        { key: 'transferencia', label: 'Transferência', description: 'Quer falar com humano' },
        { key: 'outro', label: 'Outro', description: 'Intenção não identificada' },
      ],
    },
    detect_repetition: {
      similarity_threshold: 0.70,
      check_last_n_responses: 3,
      use_embeddings: false,
    },
    get_chat_history: {
      max_messages: 15,
    },
    batch_messages: {
      delay_seconds: 10,
    },
    get_rag_context: {
      enabled: true,
      similarity_threshold: 0.7,
      max_results: 5,
    },
    process_media: {
      enabled: true,
    },
  }

  return defaults[nodeId] || {}
}

// Helper function to determine category from config key
function getCategoryFromKey(configKey: string): string {
  if (configKey.includes('prompt')) return 'prompts'
  if (configKey.includes('threshold') || configKey.includes('max_') || configKey.includes('delay')) return 'thresholds'
  if (configKey.includes('personality')) return 'personality'
  if (configKey.includes('model')) return 'personality'
  if (configKey.includes('use_') || configKey.includes('enabled')) return 'rules'
  return 'rules'
}
