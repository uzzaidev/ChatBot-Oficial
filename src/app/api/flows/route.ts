/**
 * Interactive Flows API - List and Create
 * 
 * GET  /api/flows - List all flows for the authenticated client
 * POST /api/flows - Create a new flow
 * 
 * @phase Phase 2 - Data Structure
 * @created 2025-12-06
 */

import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  InteractiveFlowDB,
  InteractiveFlow,
  CreateFlowRequest,
  FlowListResponse
} from '@/types/interactiveFlows'

export const dynamic = 'force-dynamic'

/**
 * GET /api/flows
 * 
 * List all interactive flows for the authenticated user's client
 * 
 * Query params:
 * - active: 'true' | 'false' - Filter by active status (optional)
 * - triggerType: Filter by trigger type (optional)
 * - page: Page number for pagination (default: 1)
 * - perPage: Items per page (default: 50, max: 100)
 * 
 * Returns:
 * - 200: { flows: InteractiveFlow[], total: number }
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()

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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const activeFilter = searchParams.get('active')
    const triggerType = searchParams.get('triggerType')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = Math.min(
      parseInt(searchParams.get('perPage') || '50', 10),
      100
    )
    const offset = (page - 1) * perPage

    // Build query
    let query = supabase
      .from('interactive_flows')
      .select('*', { count: 'exact' })
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    // Apply filters
    if (activeFilter !== null) {
      query = query.eq('is_active', activeFilter === 'true')
    }

    if (triggerType) {
      query = query.eq('trigger_type', triggerType)
    }

    const { data: flowsDB, error: flowsError, count } = await query

    if (flowsError) {
      console.error('Error fetching flows:', flowsError)
      return NextResponse.json(
        { error: 'Failed to fetch flows' },
        { status: 500 }
      )
    }

    // Transform database records to API format
    const flows: InteractiveFlow[] = (flowsDB || []).map(transformDBToFlow)

    const response: FlowListResponse = {
      flows,
      total: count || 0
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Unexpected error in GET /api/flows:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/flows
 * 
 * Create a new interactive flow
 * 
 * Request body: CreateFlowRequest
 * 
 * Returns:
 * - 201: { flow: InteractiveFlow }
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()

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

    // Parse request body
    const body: CreateFlowRequest = await req.json()

    // Validate required fields
    const validationErrors: string[] = []

    if (!body.name || body.name.trim().length === 0) {
      validationErrors.push('name is required and cannot be empty')
    }

    if (!body.triggerType) {
      validationErrors.push('triggerType is required')
    }

    if (!body.blocks || !Array.isArray(body.blocks) || body.blocks.length === 0) {
      validationErrors.push('blocks must be a non-empty array')
    }

    if (!body.edges || !Array.isArray(body.edges)) {
      validationErrors.push('edges must be an array')
    }

    if (!body.startBlockId) {
      validationErrors.push('startBlockId is required')
    }

    // Validate startBlockId exists in blocks
    if (
      body.startBlockId &&
      body.blocks &&
      !body.blocks.some((b) => b.id === body.startBlockId)
    ) {
      validationErrors.push('startBlockId must reference an existing block')
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      )
    }

    // Insert flow
    const { data: flowDB, error: insertError } = await supabase
      .from('interactive_flows')
      .insert({
        client_id: profile.client_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        is_active: true, // New flows are active by default
        trigger_type: body.triggerType,
        trigger_keywords: body.triggerKeywords || null,
        trigger_qr_code: body.triggerQrCode || null,
        blocks: body.blocks,
        edges: body.edges,
        start_block_id: body.startBlockId,
        created_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating flow:', insertError)
      return NextResponse.json(
        { error: 'Failed to create flow', details: insertError.message },
        { status: 500 }
      )
    }

    const flow = transformDBToFlow(flowDB as InteractiveFlowDB)

    return NextResponse.json({ flow }, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error in POST /api/flows:', error)
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
