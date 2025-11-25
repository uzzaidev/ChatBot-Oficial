import { createClientBrowser } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de teste para verificar se Supabase Realtime está funcionando
 *
 * Acesse: http://localhost:3000/api/test/realtime
 *
 * Este endpoint:
 * 1. Conecta ao Realtime
 * 2. Subscribe na tabela n8n_chat_histories
 * 3. Retorna status da conexão
 * 4. Logs no console do servidor
 */
export async function GET() {
  try {
    console.log('🧪 [Realtime Test] Iniciando teste...')

    const supabase = createClientBrowser()

    let connectionStatus = 'PENDING'
    let subscriptionError: any = null
    let receivedEvent = false

    // Promise que resolve quando obtiver status
    const testPromise = new Promise<void>((resolve) => {
      const channel = supabase
        .channel('test-realtime-channel')
        .on(
          'postgres_changes',
          {
            event: '*', // Todos os eventos (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'n8n_chat_histories',
          },
          (payload) => {
            console.log('✅ [Realtime Test] Evento recebido:', payload)
            receivedEvent = true
          }
        )
        .subscribe((status, err) => {
          console.log(`📡 [Realtime Test] Status: ${status}`)

          if (err) {
            console.error('❌ [Realtime Test] Erro:', err)
            subscriptionError = err
          }

          connectionStatus = status

          if (status === 'SUBSCRIBED') {
            console.log('✅ [Realtime Test] SUCESSO - Realtime está funcionando!')

            // Aguardar 2s para possíveis eventos
            setTimeout(() => {
              supabase.removeChannel(channel)
              resolve()
            }, 2000)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('❌ [Realtime Test] FALHOU - Status:', status)
            supabase.removeChannel(channel)
            resolve()
          }
        })

      // Timeout de 10s
      setTimeout(() => {
        if (connectionStatus === 'PENDING') {
          console.error('⏱️ [Realtime Test] TIMEOUT - Não conectou em 10s')
          supabase.removeChannel(channel)
          resolve()
        }
      }, 10000)
    })

    await testPromise

    // Resultado do teste
    const result = {
      success: connectionStatus === 'SUBSCRIBED',
      status: connectionStatus,
      error: subscriptionError,
      receivedEvent,
      message: connectionStatus === 'SUBSCRIBED'
        ? '✅ Realtime está funcionando! Verifique o console para logs.'
        : '❌ Realtime NÃO está funcionando. Verifique a configuração.',
      troubleshooting: connectionStatus !== 'SUBSCRIBED' ? [
        '1. Verifique se Realtime está habilitado no Supabase Dashboard',
        '2. Database > Replication > Habilite n8n_chat_histories',
        '3. Verifique RLS policies (podem bloquear realtime)',
        '4. Verifique se NEXT_PUBLIC_SUPABASE_URL e ANON_KEY estão corretos',
      ] : null,
    }

    console.log('🧪 [Realtime Test] Resultado:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [Realtime Test] Erro inesperado:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: 'Erro ao testar Realtime',
    }, { status: 500 })
  }
}
