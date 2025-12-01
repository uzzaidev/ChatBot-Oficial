/**
 * API Endpoint: Upload Documents for RAG
 *
 * POST /api/documents/upload
 *
 * Receives PDF or TXT files, extracts text, processes with semantic chunking,
 * generates embeddings, and stores in vector database.
 *
 * Multi-tenant: Documents are isolated by client_id from user's profile.
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: FormData with 'file' field (PDF or TXT)
 * - Body: 'documentType' (optional) - 'catalog', 'manual', 'faq', etc.
 *
 * Response:
 * - 200: Document processed successfully
 * - 400: Invalid file type or missing file
 * - 401: Unauthorized
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { processDocumentWithChunking } from '@/nodes/processDocumentWithChunking'
import OpenAI from 'openai'
// pdf-parse v1.1.0 uses a function-based API that works in serverless environments
// It bundles an older version of pdf.js (v1.9.426) that doesn't require browser APIs like DOMMatrix
import pdfParse from 'pdf-parse'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
]

// Error messages for empty text extraction, keyed by MIME type
// Note: 'image/jpg' is included for compatibility with some systems that send this non-standard MIME type
const EMPTY_TEXT_ERROR_MESSAGES: Record<string, string> = {
  'application/pdf': 'O PDF não contém texto extraível. Verifique se não é um PDF de imagens ou protegido.',
  'text/plain': 'O arquivo de texto está vazio.',
  'image/jpeg': 'Não foi possível extrair texto da imagem.',
  'image/png': 'Não foi possível extrair texto da imagem.',
  'image/webp': 'Não foi possível extrair texto da imagem.',
  'image/jpg': 'Não foi possível extrair texto da imagem.',
}

/**
 * Extract text from image using OpenAI Vision API (GPT-4o)
 * Serverless-compatible, no canvas dependencies
 * REQUIRES client to have OpenAI API key configured in Vault
 */
const extractTextFromImage = async (buffer: Buffer, openaiApiKey: string): Promise<string> => {
  const openai = new OpenAI({ apiKey: openaiApiKey })

  // Convert buffer to base64
  const base64Image = buffer.toString('base64')
  const mimeType = 'image/jpeg' // OpenAI accepts various formats

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text from this image. Return ONLY the extracted text, nothing else. If there is no text, return "No text found".',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  })

  const extractedText = response.choices[0]?.message?.content || ''

  if (extractedText === 'No text found' || !extractedText.trim()) {
    throw new Error('No text found in image')
  }

  return extractedText
}

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

    // 3. Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('documentType') as string || 'general'

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file in request' },
        { status: 400 }
      )
    }

    // 4. Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }


    // 5. Extract text from file
    let text: string

    if (file.type === 'application/pdf') {
      // PDF extraction using pdf-parse v1.1.0 function-based API
      // Uses bundled pdf.js v1.9.426 which works in serverless environments without browser APIs
      // Note: pdf.js may emit warnings like "TT: undefined function: 32" for PDFs with custom fonts,
      // but these are non-fatal and text extraction still works
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        const pdfData = await pdfParse(buffer)
        text = pdfData?.text ?? ''
      } catch (pdfError) {
        const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : 'Erro PDF desconhecido'
        console.error('[Upload] ❌ PDF parsing error:', pdfErrorMessage)
        return NextResponse.json(
          { error: `Erro ao processar PDF: ${pdfErrorMessage}. Verifique se o arquivo não está corrompido ou protegido por senha.` },
          { status: 400 }
        )
      }
    } else if (file.type.startsWith('image/')) {
      // Get OpenAI key from Vault (REQUIRED for image OCR)
      const { data: clientConfigTemp } = await supabase
        .from('clients')
        .select('openai_api_key_secret_id')
        .eq('id', clientId)
        .single()

      if (!clientConfigTemp?.openai_api_key_secret_id) {
        return NextResponse.json(
          {
            error: 'API da OpenAI não configurada. Por favor, configure sua chave da OpenAI em Configurações para usar o serviço de OCR em imagens.'
          },
          { status: 400 }
        )
      }

      const { data: openaiKeyForOCR } = await supabase.rpc('get_secret', {
        secret_id: clientConfigTemp.openai_api_key_secret_id
      })

      if (!openaiKeyForOCR) {
        return NextResponse.json(
          {
            error: 'Erro ao recuperar chave da OpenAI. Por favor, reconfigure sua chave em Configurações.'
          },
          { status: 400 }
        )
      }

      // Image OCR extraction using OpenAI Vision (serverless-compatible)
      const buffer = Buffer.from(await file.arrayBuffer())
      console.log('[Upload] Extracting text from image using OpenAI Vision...')
      text = await extractTextFromImage(buffer, openaiKeyForOCR)
      console.log('[Upload] Text extracted successfully from image')
    } else {
      // text/plain
      text = await file.text()
    }

    if (!text || text.trim().length === 0) {
      // Provide more helpful error message based on file type
      const specificError = EMPTY_TEXT_ERROR_MESSAGES[file.type] || 'Arquivo vazio ou falha na extração de texto'
      return NextResponse.json(
        { error: specificError },
        { status: 400 }
      )
    }

    // 6. Get client config for OpenAI API key (REQUIRED for embeddings)
    const { data: clientConfig } = await supabase
      .from('clients')
      .select('openai_api_key_secret_id')
      .eq('id', clientId)
      .single()

    if (!clientConfig?.openai_api_key_secret_id) {
      return NextResponse.json(
        {
          error: 'API da OpenAI não configurada. Por favor, configure sua chave da OpenAI em Configurações para usar o serviço de embeddings.'
        },
        { status: 400 }
      )
    }

    const { data: openaiApiKey } = await supabase.rpc('get_secret', {
      secret_id: clientConfig.openai_api_key_secret_id
    })

    if (!openaiApiKey) {
      return NextResponse.json(
        {
          error: 'Erro ao recuperar chave da OpenAI. Por favor, reconfigure sua chave em Configurações.'
        },
        { status: 400 }
      )
    }

    // 7. Process document with chunking
    const result = await processDocumentWithChunking({
      text,
      clientId,
      metadata: {
        filename: file.name,
        documentType,
        source: 'upload',
        uploadedBy: user.email || user.id,
        fileSize: file.size,
        mimeType: file.type,
      },
      openaiApiKey,
    })


    // 8. Return success response
    return NextResponse.json({
      success: true,
      filename: file.name,
      chunks: result.chunksCreated,
      embeddings: result.embeddingsGenerated,
      stats: result.stats,
      usage: result.usage,
      documentIds: result.documentIds,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Upload] ❌ Error:', errorMessage)

    return NextResponse.json(
      { error: `Failed to process document: ${errorMessage}` },
      { status: 500 }
    )
  }
}
