'use client'

import { DEFAULT_BACKGROUNDS, DEFAULT_CHAT_THEME, type ChatTheme } from '@/lib/constants/chat-backgrounds'
import { createClientBrowser } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'

interface UseChatThemeReturn {
  theme: ChatTheme | null
  loading: boolean
  error: string | null
  saveTheme: (newTheme: ChatTheme) => Promise<void>
  applyTheme: (themeToApply: ChatTheme) => void
  resetTheme: () => Promise<void>
}

/**
 * Hook para gerenciar o tema personalizado das conversas
 *
 * Features:
 * - Carrega tema do usuário do banco de dados
 * - Salva alterações no tema
 * - Aplica tema em tempo real via CSS variables
 * - Reset para tema padrão
 *
 * @example
 * ```tsx
 * const { theme, loading, saveTheme, applyTheme } = useChatTheme()
 *
 * // Aplicar novo tema
 * await saveTheme({
 *   incomingMessageColor: '#123456',
 *   outgoingMessageColor: '#654321',
 *   backgroundType: 'preset',
 *   backgroundPreset: 'whatsapp-dark'
 * })
 * ```
 */
export const useChatTheme = (): UseChatThemeReturn => {
  const [theme, setTheme] = useState<ChatTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Carregar tema do usuário do banco de dados
   */
  const loadTheme = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientBrowser()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.warn('Usuário não autenticado, usando tema padrão')
        setTheme(DEFAULT_CHAT_THEME)
        applyTheme(DEFAULT_CHAT_THEME)
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_chat_themes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // PGRST116 = no rows found (usuário ainda não tem tema customizado)
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao carregar tema:', fetchError)
        setError('Erro ao carregar configurações de tema')
        setTheme(DEFAULT_CHAT_THEME)
        applyTheme(DEFAULT_CHAT_THEME)
        setLoading(false)
        return
      }

      if (data) {
        const loadedTheme: ChatTheme = {
          incomingMessageColor: data.incoming_message_color,
          outgoingMessageColor: data.outgoing_message_color,
          incomingTextColor: data.incoming_text_color || '#FFFFFF',
          outgoingTextColor: data.outgoing_text_color || '#FFFFFF',
          backgroundType: data.background_type as ChatTheme['backgroundType'],
          backgroundPreset: data.background_preset || undefined,
          backgroundCustomUrl: data.background_custom_url || undefined,
        }
        setTheme(loadedTheme)
        applyTheme(loadedTheme)
      } else {
        // Usuário não tem tema customizado, usar padrão
        setTheme(DEFAULT_CHAT_THEME)
        applyTheme(DEFAULT_CHAT_THEME)
      }
    } catch (err) {
      console.error('Erro ao carregar tema:', err)
      setError('Erro inesperado ao carregar tema')
      setTheme(DEFAULT_CHAT_THEME)
      applyTheme(DEFAULT_CHAT_THEME)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Salvar tema no banco de dados
   */
  const saveTheme = useCallback(async (newTheme: ChatTheme) => {
    try {
      const supabase = createClientBrowser()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Usuário não autenticado')
      }

      const { error: saveError } = await supabase
        .from('user_chat_themes')
        .upsert({
          user_id: user.id,
          incoming_message_color: newTheme.incomingMessageColor,
          outgoing_message_color: newTheme.outgoingMessageColor,
          incoming_text_color: newTheme.incomingTextColor,
          outgoing_text_color: newTheme.outgoingTextColor,
          background_type: newTheme.backgroundType,
          background_preset: newTheme.backgroundPreset || null,
          background_custom_url: newTheme.backgroundCustomUrl || null,
        }, {
          onConflict: 'user_id'  // Resolver conflitos pela coluna user_id (UNIQUE constraint)
        })

      if (saveError) {
        console.error('Erro ao salvar tema:', saveError)
        throw new Error('Erro ao salvar configurações de tema')
      }

      setTheme(newTheme)
      applyTheme(newTheme)
      setError(null)
    } catch (err) {
      console.error('Erro ao salvar tema:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    }
  }, [])

  /**
   * Aplicar tema via CSS variables
   * (usado para preview em tempo real e aplicação persistente)
   */
  const applyTheme = useCallback((themeToApply: ChatTheme) => {
    // Aplicar cores de fundo das mensagens via CSS variables
    document.documentElement.style.setProperty(
      '--chat-incoming-color',
      themeToApply.incomingMessageColor
    )
    document.documentElement.style.setProperty(
      '--chat-outgoing-color',
      themeToApply.outgoingMessageColor
    )

    // Aplicar cores de texto das mensagens via CSS variables
    document.documentElement.style.setProperty(
      '--chat-incoming-text-color',
      themeToApply.incomingTextColor || '#FFFFFF'
    )
    document.documentElement.style.setProperty(
      '--chat-outgoing-text-color',
      themeToApply.outgoingTextColor || '#FFFFFF'
    )

    // Aplicar background
    let backgroundUrl = ''

    if (themeToApply.backgroundType === 'preset' && themeToApply.backgroundPreset) {
      const preset = DEFAULT_BACKGROUNDS.find(bg => bg.id === themeToApply.backgroundPreset)
      backgroundUrl = preset?.url || ''
    } else if (themeToApply.backgroundType === 'custom' && themeToApply.backgroundCustomUrl) {
      backgroundUrl = themeToApply.backgroundCustomUrl
    }

    if (backgroundUrl) {
      document.documentElement.style.setProperty(
        '--chat-background-image',
        `url('${backgroundUrl}')`
      )
    } else {
      // Remove background se for 'default' ou se não tiver URL válida
      document.documentElement.style.removeProperty('--chat-background-image')
    }
  }, [])

  /**
   * Resetar para tema padrão
   */
  const resetTheme = useCallback(async () => {
    await saveTheme(DEFAULT_CHAT_THEME)
  }, [saveTheme])

  // Carregar tema ao montar o hook
  useEffect(() => {
    loadTheme()
  }, [loadTheme])

  return {
    theme,
    loading,
    error,
    saveTheme,
    applyTheme,
    resetTheme,
  }
}
