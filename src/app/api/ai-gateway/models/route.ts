/**
 * AI Gateway Models API Route
 * 
 * GET /api/ai-gateway/models - List available AI models
 * POST /api/ai-gateway/models - Add new model
 * PUT /api/ai-gateway/models - Update model
 * DELETE /api/ai-gateway/models - Delete model
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const capability = searchParams.get('capability')

    const supabase = createServerClient()

    let query = supabase
      .from('ai_models_registry')
      .select('*')
      .eq('enabled', true)
      .order('provider')
      .order('model_name')

    // Filter by capability if specified
    if (capability === 'vision') {
      query = query.eq('supports_vision', true)
    } else if (capability === 'tools') {
      query = query.eq('supports_tools', true)
    }

    const { data: models, error } = await query

    if (error) throw error

    return NextResponse.json({ models: models || [] })
  } catch (error: any) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      provider,
      modelName,
      displayName,
      costPer1kInputTokens,
      costPer1kOutputTokens,
      maxContextWindow,
      maxOutputTokens,
      supportsVision,
      supportsTools,
      enabled,
    } = body

    // Validate required fields
    if (!provider || !modelName || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, modelName, displayName' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Insert new model
    const { data, error } = await supabase
      .from('ai_models_registry')
      .insert({
        provider,
        model_name: modelName,
        display_name: displayName,
        cost_per_1k_input_tokens: costPer1kInputTokens || 0,
        cost_per_1k_output_tokens: costPer1kOutputTokens || 0,
        max_context_window: maxContextWindow || 4096,
        max_output_tokens: maxOutputTokens || 2048,
        supports_vision: supportsVision || false,
        supports_tools: supportsTools || false,
        enabled: enabled !== false, // Default true
        verified: false, // Becomes true after testing
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, model: data })
  } catch (error: any) {
    console.error('Error creating model:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create model' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update model
    const { data, error } = await supabase
      .from('ai_models_registry')
      .update({
        display_name: updates.displayName,
        cost_per_1k_input_tokens: updates.costPer1kInputTokens,
        cost_per_1k_output_tokens: updates.costPer1kOutputTokens,
        max_context_window: updates.maxContextWindow,
        max_output_tokens: updates.maxOutputTokens,
        supports_vision: updates.supportsVision,
        supports_tools: updates.supportsTools,
        enabled: updates.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, model: data })
  } catch (error: any) {
    console.error('Error updating model:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update model' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Soft delete - just disable the model
    const { error } = await supabase
      .from('ai_models_registry')
      .update({ enabled: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting model:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete model' },
      { status: 500 }
    )
  }
}
