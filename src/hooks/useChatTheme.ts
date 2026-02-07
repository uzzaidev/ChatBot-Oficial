'use client'

import { DEFAULT_BACKGROUNDS, DEFAULT_CHAT_THEME, type ChatTheme } from '@/lib/constants/chat-backgrounds'
import { createClientBrowser } from '@/lib/supabase'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseChatThemeReturn {
  theme: ChatTheme | null
  loading: boolean
  error: string | null
  saveTheme: (newTheme: ChatTheme) => Promise<void>
  applyTheme: (themeToApply: ChatTheme) => void
  resetTheme: () => Promise<void>
}

/**
 * Hook para gerenciar o tema personalizado das conversas (dual-mode: dark + light)
 *
 * - Carrega tema do usuário do banco de dados
 * - Aplica cores corretas baseado no modo atual (dark/light)
 * - Reaplica automaticamente ao trocar de modo
 * - Quando sem tema custom, remove inline styles e deixa CSS defaults funcionar
 */
export const useChatTheme = (): UseChatThemeReturn => {
  const [theme, setTheme] = useState<ChatTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme: nextTheme } = useTheme()
  const initialLoadDone = useRef(false)

  /**
   * Remove inline CSS variables, letting globals.css defaults take over
   */
  const clearInlineStyles = useCallback(() => {
    document.documentElement.style.removeProperty('--chat-incoming-color')
    document.documentElement.style.removeProperty('--chat-outgoing-color')
    document.documentElement.style.removeProperty('--chat-incoming-text-color')
    document.documentElement.style.removeProperty('--chat-outgoing-text-color')
    document.documentElement.style.removeProperty('--chat-background-image')
  }, [])

  /**
   * Apply theme colors for the current mode (dark or light)
   */
  const applyTheme = useCallback((themeToApply: ChatTheme) => {
    const mode = nextTheme === 'light' ? 'light' : 'dark'
    const colors = themeToApply[mode]

    document.documentElement.style.setProperty(
      '--chat-incoming-color',
      colors.incomingMessageColor
    )
    document.documentElement.style.setProperty(
      '--chat-outgoing-color',
      colors.outgoingMessageColor
    )
    document.documentElement.style.setProperty(
      '--chat-incoming-text-color',
      colors.incomingTextColor
    )
    document.documentElement.style.setProperty(
      '--chat-outgoing-text-color',
      colors.outgoingTextColor
    )

    // Apply background
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
      document.documentElement.style.removeProperty('--chat-background-image')
    }
  }, [nextTheme])

  /**
   * Load theme from database
   */
  const loadTheme = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientBrowser()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.warn('Usuário não autenticado, usando tema padrão CSS')
        setTheme(null)
        clearInlineStyles()
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_chat_themes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // PGRST116 = no rows found
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao carregar tema:', fetchError)
        setError('Erro ao carregar configurações de tema')
        setTheme(null)
        clearInlineStyles()
        setLoading(false)
        return
      }

      if (data) {
        const loadedTheme: ChatTheme = {
          dark: {
            incomingMessageColor: data.incoming_message_color || '#202c33',
            outgoingMessageColor: data.outgoing_message_color || '#005c4b',
            incomingTextColor: data.incoming_text_color || '#FFFFFF',
            outgoingTextColor: data.outgoing_text_color || '#FFFFFF',
          },
          light: {
            incomingMessageColor: data.incoming_message_color_light || '#ffffff',
            outgoingMessageColor: data.outgoing_message_color_light || '#128c7e',
            incomingTextColor: data.incoming_text_color_light || '#1f2937',
            outgoingTextColor: data.outgoing_text_color_light || '#FFFFFF',
          },
          backgroundType: data.background_type as ChatTheme['backgroundType'],
          backgroundPreset: data.background_preset || undefined,
          backgroundCustomUrl: data.background_custom_url || undefined,
        }
        setTheme(loadedTheme)
      } else {
        // No custom theme - use CSS defaults
        setTheme(null)
        clearInlineStyles()
      }
    } catch (err) {
      console.error('Erro ao carregar tema:', err)
      setError('Erro inesperado ao carregar tema')
      setTheme(null)
      clearInlineStyles()
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [clearInlineStyles])

  /**
   * Save theme to database
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
          // Dark mode colors (existing columns)
          incoming_message_color: newTheme.dark.incomingMessageColor,
          outgoing_message_color: newTheme.dark.outgoingMessageColor,
          incoming_text_color: newTheme.dark.incomingTextColor,
          outgoing_text_color: newTheme.dark.outgoingTextColor,
          // Light mode colors (new columns)
          incoming_message_color_light: newTheme.light.incomingMessageColor,
          outgoing_message_color_light: newTheme.light.outgoingMessageColor,
          incoming_text_color_light: newTheme.light.incomingTextColor,
          outgoing_text_color_light: newTheme.light.outgoingTextColor,
          // Background (shared)
          background_type: newTheme.backgroundType,
          background_preset: newTheme.backgroundPreset || null,
          background_custom_url: newTheme.backgroundCustomUrl || null,
        }, {
          onConflict: 'user_id',
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
  }, [applyTheme])

  /**
   * Reset to default (delete custom theme, let CSS defaults handle it)
   */
  const resetTheme = useCallback(async () => {
    try {
      const supabase = createClientBrowser()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Usuário não autenticado')
      }

      const { error: deleteError } = await supabase
        .from('user_chat_themes')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Erro ao deletar tema:', deleteError)
        throw new Error('Erro ao restaurar tema padrão')
      }

      setTheme(null)
      clearInlineStyles()
      setError(null)
    } catch (err) {
      console.error('Erro ao restaurar tema:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    }
  }, [clearInlineStyles])

  // Load theme on mount
  useEffect(() => {
    loadTheme()
  }, [loadTheme])

  // Reapply theme when dark/light mode changes
  useEffect(() => {
    if (!initialLoadDone.current) return
    if (theme) {
      applyTheme(theme)
    } else {
      clearInlineStyles()
    }
  }, [nextTheme, theme, applyTheme, clearInlineStyles])

  return {
    theme,
    loading,
    error,
    saveTheme,
    applyTheme,
    resetTheme,
  }
}
