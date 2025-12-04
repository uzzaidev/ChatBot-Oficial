/**
 * API Endpoint: Get Document Chunks
 *
 * GET /api/documents/chunks?filename=example.pdf
 *
 * Returns all chunks for a specific document.
 * Multi-tenant: Only returns chunks for user's client_id.
 *
 * Query Parameters:
 * - filename: Name of the document
 *
 * Response:
 * - 200: Array of chunks with content and metadata
 * - 401: Unauthorized
 * - 404: Document not found
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: 'User profile not found or missing client_id' },
        { status: 403 }
      )
    }

    const clientId = profile.client_id

    // 3. Get filename from query params
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing filename parameter' },
        { status: 400 }
      )
    }

    // 4. Fetch chunks from database
    const supabaseServiceRole = createServiceRoleClient()
    const supabaseAny = supabaseServiceRole as any

    const { data: chunks, error: fetchError } = await supabaseAny
      .from('documents')
      .select('id, content, metadata, original_file_url, original_file_path')
      .eq('client_id', clientId)
      .eq('metadata->>filename', filename)
      .order('metadata->>chunkIndex', { ascending: true })

    if (fetchError) {
      console.error('[GetChunks] ❌ Error fetching chunks:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch chunks' },
        { status: 500 }
      )
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // 5. Format response
    const formattedChunks = chunks.map((chunk: any) => ({
      id: chunk.id,
      content: chunk.content,
      chunkIndex: chunk.metadata?.chunkIndex || 0,
      tokenCount: chunk.metadata?.tokenCount || 0,
      metadata: chunk.metadata,
      originalFileUrl: chunk.original_file_url,
    }))

    return NextResponse.json({
      success: true,
      filename,
      chunks: formattedChunks,
      totalChunks: chunks.length,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GetChunks] ❌ Error:', errorMessage)

    return NextResponse.json(
      { error: `Failed to get chunks: ${errorMessage}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/chunks
 *
 * Add a manual chunk to an existing document.
 *
 * Request Body:
 * - filename: Name of the document
 * - content: Text content of the chunk
 * - tags: Optional array of tags/keywords for better RAG retrieval
 *
 * Response:
 * - 200: Chunk added successfully
 * - 401: Unauthorized
 * - 500: Server error
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get user's client_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.client_id) {
      return NextResponse.json(
        { error: 'User profile not found or missing client_id' },
        { status: 403 }
      )
    }

    const clientId = profile.client_id

    // 3. Parse request body
    const body = await request.json()
    const { filename, content, tags } = body

    if (!filename || !content) {
      return NextResponse.json(
        { error: 'Missing filename or content' },
        { status: 400 }
      )
    }

    // 4. Get OpenAI API key from config
    const supabaseServiceRole = createServiceRoleClient()
    const supabaseConfigAny = supabaseServiceRole as any
    const { data: clientConfig, error: configError } = await supabaseConfigAny
      .from('clients')
      .select('openai_api_key_secret_id')
      .eq('id', clientId)
      .single()

    if (configError || !clientConfig || !clientConfig.openai_api_key_secret_id) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 400 }
      )
    }

    const { data: openaiApiKey, error: vaultError } = await supabaseConfigAny.rpc('get_client_secret', {
      secret_id: clientConfig.openai_api_key_secret_id
    })

    if (vaultError || !openaiApiKey) {
      return NextResponse.json(
        { error: 'Failed to get OpenAI API key from vault' },
        { status: 500 }
      )
    }

    // 5. Generate embedding for the manual chunk
    const { generateEmbedding } = await import('@/lib/openai')
    const embeddingResult = await generateEmbedding(content, openaiApiKey)

    // 6. Get existing document info
    const supabaseAny = supabaseServiceRole as any
    const { data: existingChunks } = await supabaseAny
      .from('documents')
      .select('metadata, original_file_url, original_file_path, original_file_size, original_mime_type')
      .eq('client_id', clientId)
      .eq('metadata->>filename', filename)
      .limit(1)
      .single()

    // 7. Insert manual chunk
    const { data: newChunk, error: insertError } = await supabaseAny
      .from('documents')
      .insert({
        content,
        embedding: embeddingResult.embedding,
        metadata: {
          filename,
          documentType: existingChunks?.metadata?.documentType || 'general',
          source: 'manual',
          addedBy: user.email || user.id,
          addedAt: new Date().toISOString(),
          tags: tags || [],
          isManual: true,
        },
        client_id: clientId,
        original_file_url: existingChunks?.original_file_url || null,
        original_file_path: existingChunks?.original_file_path || null,
        original_file_size: existingChunks?.original_file_size || null,
        original_mime_type: existingChunks?.original_mime_type || null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[AddManualChunk] ❌ Error inserting chunk:', insertError)
      return NextResponse.json(
        { error: 'Failed to add chunk' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chunkId: newChunk.id,
      embeddingTokens: embeddingResult.usage.total_tokens,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[AddManualChunk] ❌ Error:', errorMessage)

    return NextResponse.json(
      { error: `Failed to add chunk: ${errorMessage}` },
      { status: 500 }
    )
  }
}
