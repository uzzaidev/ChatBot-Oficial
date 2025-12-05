import { NextRequest, NextResponse } from 'next/server'
import { getClientIdFromSession } from '@/lib/supabase-server'
import { getClientConfig } from '@/lib/config'
import { uploadFileToStorage } from '@/lib/storage'
import { sendWhatsAppImage, sendWhatsAppAudio, sendWhatsAppDocument } from '@/nodes'
import { saveChatMessage } from '@/nodes/saveChatMessage'
import { convertAudioToWhatsAppFormat } from '@/lib/audio-converter'

export const dynamic = 'force-dynamic'

// Configurações para suportar conversão de áudio
export const maxDuration = 30 // 30 segundos para conversão de áudio

/**
 * POST /api/commands/send-media
 *
 * Envia mídia (imagem, áudio, documento) manual pelo dashboard para WhatsApp
 *
 * Fluxo:
 * 1. Obtém client_id do usuário autenticado
 * 2. Recebe arquivo via FormData
 * 3. Faz upload para Supabase Storage
 * 4. Envia via Meta WhatsApp API
 * 5. Salva no histórico com metadados
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 🔐 Obter client_id da sessão do usuário autenticado
    const clientId = await getClientIdFromSession(request as any)

    if (!clientId) {
      return NextResponse.json(
        { error: 'Unauthorized - client_id not found in session' },
        { status: 401 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const phone = formData.get('phone') as string
    const file = formData.get('file') as File
    const mediaType = formData.get('type') as 'image' | 'audio' | 'document'
    const caption = formData.get('caption') as string | null

    // Validação
    if (!phone || !file || !mediaType) {
      return NextResponse.json(
        { error: 'phone, file e type são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo
    const maxSize = mediaType === 'document' ? 100 * 1024 * 1024 : mediaType === 'audio' ? 16 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: ${maxSize / (1024 * 1024)} MB` },
        { status: 400 }
      )
    }

    // Buscar config do cliente autenticado
    const config = await getClientConfig(clientId)

    if (!config) {
      return NextResponse.json({ error: 'Client configuration not found' }, { status: 404 })
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    let fileName = file.name
    let mimeType = file.type

    // Se for áudio, converter para OGG/Opus (formato mais compatível com WhatsApp)
    if (mediaType === 'audio') {
      try {
        const converted = await convertAudioToWhatsAppFormat({
          inputBuffer: buffer,
          inputFormat: file.name.split('.').pop(), // Extensão original
          outputFormat: 'ogg',
        })

        buffer = Buffer.from(converted.buffer)
        mimeType = converted.mimeType
        fileName = file.name.replace(/\.[^.]+$/, `.${converted.extension}`)
      } catch (conversionError) {
        throw new Error('Não foi possível converter o áudio para formato compatível')
      }
    }

    // Upload para Supabase Storage
    const publicUrl = await uploadFileToStorage(
      buffer,
      fileName,
      mimeType,
      clientId
    )

    // Enviar via WhatsApp
    let messageId: string

    switch (mediaType) {
      case 'image':
        messageId = await sendWhatsAppImage({
          phone,
          imageUrl: publicUrl,
          caption: caption || undefined,
          config,
        })
        break

      case 'audio':
        messageId = await sendWhatsAppAudio({
          phone,
          audioUrl: publicUrl,
          config,
        })
        break

      case 'document':
        messageId = await sendWhatsAppDocument({
          phone,
          documentUrl: publicUrl,
          filename: file.name,
          caption: caption || undefined,
          config,
        })
        break

      default:
        throw new Error('Invalid media type')
    }

    // Salvar no histórico com metadados de mídia
    const messageContent = caption || `[${mediaType.toUpperCase()}] ${file.name}`

    await saveChatMessage({
      phone,
      message: messageContent,
      type: 'ai', // TODO: Mudar para 'atendente' no futuro
      clientId: config.id,
    })

    const totalDuration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Mídia enviada com sucesso',
      data: {
        messageId,
        mediaType,
        filename: file.name,
        mediaUrl: publicUrl,
        phone,
        savedToHistory: true,
        duration: totalDuration,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      {
        error: 'Erro ao enviar mídia',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
