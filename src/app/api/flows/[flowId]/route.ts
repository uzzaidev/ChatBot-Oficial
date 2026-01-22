/**
 * Interactive Flows API - Single Flow Operations
 * 
 * GET    /api/flows/[flowId] - Get a specific flow
 * PUT    /api/flows/[flowId] - Update a flow
 * DELETE /api/flows/[flowId] - Delete a flow
 * 
 * @phase Phase 2 - Data Structure
 * @created 2025-12-06
 */

import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  InteractiveFlowDB,
  InteractiveFlow,
  UpdateFlowRequest
} from '@/types/interactiveFlows'

export const dynamic = 'force-dynamic'

type Params = Promise<{
  flowId: string
}>

/**
 * GET /api/flows/[flowId]
 *
 * Get details of a specific flow
 *
 * Returns:
 * - 200: { flow: InteractiveFlow }
 * - 401: Unauthorized
 * - 403: Forbidden (flow belongs to different client)
 * - 404: Flow not found
 * - 500: Server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createServerClient()
    const { flowId } = await params

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch flow
    const { data: flowDB, error: flowError } = await supabase
      .from('interactive_flows')
      .select('*')
      .eq('id', flowId)
      .single()

    if (flowError || !flowDB) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    // Check ownership
    if (flowDB.client_id !== profile.client_id) {
      return NextResponse.json(
        { error: 'Forbidden: Flow belongs to different client' },
        { status: 403 }
      )
    }

    const flow = transformDBToFlow(flowDB as InteractiveFlowDB)

    return NextResponse.json({ flow })
  } catch (error: any) {
    console.error('Unexpected error in GET /api/flows/[flowId]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/flows/[flowId]
 * 
 * Update an existing flow
 * 
 * Request body: UpdateFlowRequest (all fields optional)
 * 
 * Returns:
 * - 200: { flow: InteractiveFlow }
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Flow not found
 * - 500: Server error
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createServerClient()
    const { flowId } = await params

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if flow exists and user has access
    const { data: existingFlow, error: fetchError } = await supabase
      .from('interactive_flows')
      .select('client_id, blocks')
      .eq('id', flowId)
      .single()

    if (fetchError || !existingFlow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    if (existingFlow.client_id !== profile.client_id) {
      return NextResponse.json(
        { error: 'Forbidden: Flow belongs to different client' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: UpdateFlowRequest = await req.json()

    // Build update object (only include provided fields)
    const updateData: any = {}

    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.isActive !== undefined) {
      updateData.is_active = body.isActive
    }

    if (body.triggerType !== undefined) {
      updateData.trigger_type = body.triggerType
    }

    if (body.triggerKeywords !== undefined) {
      updateData.trigger_keywords = body.triggerKeywords || null
    }

    if (body.triggerQrCode !== undefined) {
      updateData.trigger_qr_code = body.triggerQrCode || null
    }

    if (body.blocks !== undefined) {
      if (!Array.isArray(body.blocks) || body.blocks.length === 0) {
        return NextResponse.json(
          { error: 'blocks must be a non-empty array' },
          { status: 400 }
        )
      }
      updateData.blocks = body.blocks
    }

    if (body.edges !== undefined) {
      if (!Array.isArray(body.edges)) {
        return NextResponse.json(
          { error: 'edges must be an array' },
          { status: 400 }
        )
      }
      updateData.edges = body.edges
    }

    if (body.startBlockId !== undefined) {
      updateData.start_block_id = body.startBlockId

      // Validate startBlockId exists in blocks (if blocks are being updated)
      const blocksToValidate = body.blocks || existingFlow.blocks
      if (
        blocksToValidate &&
        Array.isArray(blocksToValidate) &&
        !blocksToValidate.some((b: any) => b.id === body.startBlockId)
      ) {
        return NextResponse.json(
          { error: 'startBlockId must reference an existing block' },
          { status: 400 }
        )
      }
    }

    // If no fields to update, return current flow
    if (Object.keys(updateData).length === 0) {
      const { data: flowDB } = await supabase
        .from('interactive_flows')
        .select('*')
        .eq('id', flowId)
        .single()

      const flow = transformDBToFlow(flowDB as InteractiveFlowDB)
      return NextResponse.json({ flow })
    }

    // Update flow
    const { data: flowDB, error: updateError } = await supabase
      .from('interactive_flows')
      .update(updateData)
      .eq('id', flowId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating flow:', updateError)
      return NextResponse.json(
        { error: 'Failed to update flow', details: updateError.message },
        { status: 500 }
      )
    }

    const flow = transformDBToFlow(flowDB as InteractiveFlowDB)

    return NextResponse.json({ flow })
  } catch (error: any) {
    console.error('Unexpected error in PUT /api/flows/[flowId]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/flows/[flowId]
 * 
 * Delete a flow
 * 
 * Note: This will also delete all associated flow_executions due to CASCADE
 * 
 * Returns:
 * - 204: No content (success)
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Flow not found
 * - 500: Server error
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const supabase = await createServerClient()
    const { flowId } = await params

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if flow exists and user has access
    const { data: existingFlow, error: fetchError } = await supabase
      .from('interactive_flows')
      .select('client_id')
      .eq('id', flowId)
      .single()

    if (fetchError || !existingFlow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    if (existingFlow.client_id !== profile.client_id) {
      return NextResponse.json(
        { error: 'Forbidden: Flow belongs to different client' },
        { status: 403 }
      )
    }

    // Delete flow (will cascade to flow_executions)
    const { error: deleteError } = await supabase
      .from('interactive_flows')
      .delete()
      .eq('id', flowId)

    if (deleteError) {
      console.error('Error deleting flow:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete flow', details: deleteError.message },
        { status: 500 }
      )
    }

    // Return 204 No Content
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/flows/[flowId]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Transform database record to API format
 */
const transformDBToFlow = (flowDB: InteractiveFlowDB): InteractiveFlow => {
  return {
    id: flowDB.id,
    clientId: flowDB.client_id,
    name: flowDB.name,
    description: flowDB.description || undefined,
    isActive: flowDB.is_active,
    triggerType: flowDB.trigger_type,
    triggerKeywords: flowDB.trigger_keywords || undefined,
    triggerQrCode: flowDB.trigger_qr_code || undefined,
    blocks: flowDB.blocks,
    edges: flowDB.edges,
    startBlockId: flowDB.start_block_id,
    createdBy: flowDB.created_by || undefined,
    createdAt: new Date(flowDB.created_at),
    updatedAt: new Date(flowDB.updated_at)
  }
}
