/**
 * Deep Linking - App Links (Android) e Universal Links (iOS)
 * 
 * Permite abrir o app mobile diretamente de URLs:
 * - Custom URL Scheme: chatbot://chat/123
 * - App Links: https://uzzapp.uzzai.com.br/chat/123
 */

'use client'

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * Inicializa listeners de deep linking
 * Deve ser chamado no app startup (layout.tsx)
 */
export const initDeepLinking = () => {
  // Apenas em mobile (não funciona na web)
  if (!Capacitor.isNativePlatform()) {
    console.log('[Deep Linking] Apenas disponível em mobile')
    return
  }

  console.log('[Deep Linking] Inicializando listeners...')

  // Listener para app aberto via deep link (quando app já está rodando)
  App.addListener('appUrlOpen', (data) => {
    console.log('[Deep Linking] App opened with URL:', data.url)
    handleDeepLink(data.url)
  })

  // Verificar se app foi aberto via deep link no launch (iOS)
  App.getLaunchUrl()
    .then((result) => {
      if (result?.url) {
        console.log('[Deep Linking] App launched with URL:', result.url)
        handleDeepLink(result.url)
      }
    })
    .catch((error) => {
      // iOS pode não ter launch URL (normal)
      if (Capacitor.getPlatform() === 'ios') {
        console.log('[Deep Linking] No launch URL (normal para iOS)')
      } else {
        console.error('[Deep Linking] Erro ao obter launch URL:', error)
      }
    })
}

/**
 * Processa deep link e navega para rota apropriada
 */
const handleDeepLink = (url: string) => {
  try {
    console.log('[Deep Linking] Processando URL:', url)

    // Parse URL
    // Pode ser: chatbot://chat/123 ou https://uzzapp.uzzai.com.br/chat/123
    const urlObj = new URL(url)
    const path = urlObj.pathname

    console.log('[Deep Linking] Path extraído:', path)

    // Rotas suportadas
    if (path.startsWith('/chat/') || path.startsWith('/dashboard/chat/')) {
      // Extrair chatId
      const segments = path.split('/')
      const chatId = segments[segments.length - 1] || segments[2]
      
      if (chatId) {
        navigateToChat(chatId)
      } else {
        console.warn('[Deep Linking] Chat ID não encontrado na URL')
        navigateToHome()
      }
    } else if (path.startsWith('/invite/')) {
      const inviteCode = path.split('/')[2]
      if (inviteCode) {
        navigateToInvite(inviteCode)
      } else {
        navigateToHome()
      }
    } else if (path === '/' || path === '/dashboard') {
      navigateToHome()
    } else {
      // Rota desconhecida - redirecionar para home
      console.log('[Deep Linking] Rota desconhecida, redirecionando para home')
      navigateToHome()
    }
  } catch (error) {
    console.error('[Deep Linking] Erro ao processar deep link:', error)
    // Em caso de erro, redirecionar para home
    navigateToHome()
  }
}

/**
 * Navega para tela de chat específico
 */
const navigateToChat = (chatId: string) => {
  console.log('[Deep Linking] Navegando para chat:', chatId)
  
  // Usar window.location para garantir navegação completa
  // Next.js router pode não funcionar se app foi aberto via deep link
  window.location.href = `/dashboard/chat/${chatId}`
}

/**
 * Navega para tela de convite
 */
const navigateToInvite = (inviteCode: string) => {
  console.log('[Deep Linking] Navegando para invite:', inviteCode)
  window.location.href = `/invite/${inviteCode}`
}

/**
 * Navega para home/dashboard
 */
const navigateToHome = () => {
  console.log('[Deep Linking] Navegando para home')
  window.location.href = '/dashboard'
}

