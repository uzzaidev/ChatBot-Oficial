import { NextRequest, NextResponse } from 'next/server'
import type { SendMessageRequest } from '@/lib/types'
import { sendWhatsAppMessage } from '@/nodes/sendWhatsAppMessage'
import { saveChatMessage } from '@/nodes/saveChatMessage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/commands/send-message
 *
 * Envia mensagem manual pelo dashboard para WhatsApp
 *
 * Fluxo:
 * 1. Valida input (phone, content)
 * 2. Envia mensagem via Meta WhatsApp API (sendWhatsAppMessage node)
 * 3. Salva mensagem no histórico com type: 'ai' (saveChatMessage node)
 *
 * NOTA: type: 'ai' será mudado para 'atendente' no futuro
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SEND-MESSAGE API] 🚀 Iniciando envio de mensagem manual')

    const body = (await request.json()) as SendMessageRequest
    const { phone, content, client_id } = body

    // Validação
    if (!phone || !content) {
      console.warn('[SEND-MESSAGE API] ⚠️ Validação falhou: phone ou content faltando')
      return NextResponse.json(
        { error: 'phone e content são obrigatórios' },
        { status: 400 }
      )
    }

    console.log(`[SEND-MESSAGE API] 📱 Phone: ${phone}`)
    console.log(`[SEND-MESSAGE API] 💬 Content: ${content.substring(0, 50)}...`)

    // Buscar config do cliente
    const { getClientConfigWithFallback } = await import('@/lib/config')
    const config = await getClientConfigWithFallback(process.env.DEFAULT_CLIENT_ID)

    if (!config) {
      return NextResponse.json({ error: 'Failed to load client config' }, { status: 500 })
    }

    // NODE 12: Envia mensagem via WhatsApp
    console.log('[SEND-MESSAGE API] 📤 Chamando sendWhatsAppMessage node...')
    const messageIds = await sendWhatsAppMessage({
      phone,
      messages: [content], // Array com uma mensagem
      config, // 🔐 Passa config
    })

    const duration = Date.now() - startTime
    console.log(`[SEND-MESSAGE API] ✅ Mensagem enviada via WhatsApp em ${duration}ms`)
    console.log(`[SEND-MESSAGE API] 📨 Message IDs: ${messageIds.join(', ')}`)

    // Salvar no histórico com type: 'ai'
    console.log('[SEND-MESSAGE API] 💾 Salvando mensagem no histórico...')
    await saveChatMessage({
      phone,
      message: content,
      type: 'ai', // TODO: Mudar para 'atendente' no futuro
    })

    const totalDuration = Date.now() - startTime
    console.log(`[SEND-MESSAGE API] ✅ SUCESSO TOTAL em ${totalDuration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: {
        messageIds,
        phone,
        content,
        savedToHistory: true,
        duration: totalDuration,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[SEND-MESSAGE API] ❌❌❌ ERRO após ${duration}ms`)
    console.error(`[SEND-MESSAGE API] Error type:`, error instanceof Error ? error.constructor.name : typeof error)
    console.error(`[SEND-MESSAGE API] Error message:`, error instanceof Error ? error.message : String(error))
    console.error(`[SEND-MESSAGE API] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      {
        error: 'Erro ao enviar mensagem',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
