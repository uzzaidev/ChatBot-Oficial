/**
 * BiometricAuthButton - Botão para autenticação biométrica
 * 
 * Componente que exibe botão para login com biometria (FaceID/TouchID).
 * Só aparece se biometria estiver disponível e habilitada pelo usuário.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  getBiometricPreference,
} from '@/lib/biometricAuth'

interface BiometricAuthButtonProps {
  onSuccess: () => void
  onError?: (error: string) => void
}

export function BiometricAuthButton({
  onSuccess,
  onError,
}: BiometricAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(false)

  // Verificar disponibilidade e preferência ao montar componente
  useEffect(() => {
    const checkAvailability = async () => {
      const result = await checkBiometricAvailability()
      const preference = getBiometricPreference()
      
      setAvailable(result.available)
      setEnabled(preference)
    }

    checkAvailability()
  }, [])

  const handleBiometricAuth = async () => {
    setLoading(true)

    try {
      const result = await authenticateWithBiometric()

      if (result.success) {
        onSuccess()
      } else {
        onError?.(result.error || 'Autenticação biométrica falhou')
      }
    } catch (error: any) {
      onError?.(error.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  // Não mostrar botão se biometria não estiver disponível ou não habilitada
  if (!available || !enabled) {
    return null
  }

  return (
    <button
      onClick={handleBiometricAuth}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-mint-500 hover:bg-mint-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-mint-300 disabled:cursor-not-allowed shadow-glow mb-4"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Autenticando...</span>
        </>
      ) : (
        <>
          <span className="text-xl">👤</span>
          <span>Entrar com Biometria</span>
        </>
      )}
    </button>
  )
}

