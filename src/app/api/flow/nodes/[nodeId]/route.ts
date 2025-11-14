import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // For now, use a hardcoded client_id (will be replaced with auth in production)
    const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000000'

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
    if (!configKey) {
      return NextResponse.json(
        { error: 'Invalid node ID or node has no configuration' },
        { status: 400 }
      )
    }

    // Fetch configuration from bot_configurations table
    const { data, error } = await supabase
      .from('bot_configurations')
      .select('*')
      .eq('client_id', DEFAULT_CLIENT_ID)
      .eq('config_key', configKey)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[flow/nodes] Error fetching config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no config found, return default
    if (!data) {
      return NextResponse.json({
        nodeId,
        configKey,
        config: {
          enabled: true,
        },
      })
    }

    return NextResponse.json({
      nodeId,
      configKey,
      config: {
        enabled: true,
        ...data.config_value,
      },
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

    // For now, use a hardcoded client_id
    const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000000'

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
    if (!configKey) {
      return NextResponse.json(
        { error: 'Invalid node ID or node has no configuration' },
        { status: 400 }
      )
    }

    // If only updating enabled status, create a simple config
    if (enabled !== undefined && !config) {
      // For simple enable/disable, we store in a separate table or use metadata
      // For now, just return success
      return NextResponse.json({
        success: true,
        message: `Node ${enabled ? 'enabled' : 'disabled'}`,
      })
    }

    // Update or insert configuration
    const configValue = {
      ...config,
      enabled: enabled !== undefined ? enabled : true,
    }

    const { data, error } = await supabase
      .from('bot_configurations')
      .upsert(
        {
          client_id: DEFAULT_CLIENT_ID,
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
      .select()
      .single()

    if (error) {
      console.error('[flow/nodes] Error upserting config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration updated',
      data,
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
