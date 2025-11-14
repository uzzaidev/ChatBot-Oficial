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
    const { data: enabledData } = await supabase
      .from('bot_configurations')
      .select('config_value')
      .eq('client_id', clientId)
      .eq('config_key', enabledConfigKey)
      .single()

    if (enabledData) {
      config.enabled = enabledData.config_value?.enabled !== false
    }

    // Fetch node configuration if it exists
    if (configKey) {
      const { data: configData } = await supabase
        .from('bot_configurations')
        .select('config_value')
        .eq('client_id', clientId)
        .eq('config_key', configKey)
        .single()

      if (configData) {
        config = { ...config, ...configData.config_value }
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
      
      const { error: enabledError } = await supabase
        .from('bot_configurations')
        .upsert(
          {
            client_id: clientId,
            config_key: enabledConfigKey,
            config_value: { enabled },
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
    }

    // Handle configuration updates
    if (config && configKey) {
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

// Helper function to determine category from config key
function getCategoryFromKey(configKey: string): string {
  if (configKey.includes('prompt')) return 'prompts'
  if (configKey.includes('threshold') || configKey.includes('max_') || configKey.includes('delay')) return 'thresholds'
  if (configKey.includes('personality')) return 'personality'
  if (configKey.includes('use_') || configKey.includes('enabled')) return 'rules'
  return 'rules'
}
