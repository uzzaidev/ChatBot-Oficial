/**
 * Biometric Authentication - FaceID/TouchID
 * 
 * Gerencia autenticação biométrica no app mobile.
 * 
 * Plugin: @aparajita/capacitor-biometric-auth
 * Documentação: https://github.com/aparajita/capacitor-biometric-auth
 */

'use client'

import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import { Capacitor } from '@capacitor/core'

/**
 * Verifica se biometria está disponível no device
 */
export async function checkBiometricAvailability(): Promise<{
  available: boolean
  type?: 'face' | 'fingerprint' | 'iris' | 'none'
}> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false }
  }

  try {
    const result = await BiometricAuth.checkBiometry()
    
    return {
      available: result.isAvailable,
      type: result.biometryType as 'face' | 'fingerprint' | 'iris' | 'none',
    }
  } catch (error) {
    console.error('[Biometric Auth] Erro ao verificar disponibilidade:', error)
    return { available: false }
  }
}

/**
 * Solicita autenticação biométrica
 */
export async function authenticateWithBiometric(): Promise<{
  success: boolean
  error?: string
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Apenas disponível em mobile' }
  }

  try {
    const result = await BiometricAuth.authenticate({
      reason: 'Autentique-se para acessar o UzzApp',
      title: 'Autenticação Biométrica',
      subtitle: 'Use sua biometria para fazer login',
      description: 'Toque no sensor ou olhe para a câmera',
      allowDeviceCredentials: true, // Permite usar PIN/pattern como fallback
    })

    return { success: result.succeeded }
  } catch (error: any) {
    console.error('[Biometric Auth] Erro na autenticação:', error)
    
    // Mensagens de erro amigáveis
    let errorMessage = 'Erro ao autenticar'
    if (error.message?.includes('canceled') || error.message?.includes('UserCancel')) {
      errorMessage = 'Autenticação cancelada'
    } else if (error.message?.includes('not available')) {
      errorMessage = 'Biometria não disponível'
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Salva preferência do usuário (habilitar biometria)
 */
export function saveBiometricPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('biometric_enabled', String(enabled))
  }
}

/**
 * Verifica se usuário habilitou biometria
 */
export function getBiometricPreference(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('biometric_enabled') === 'true'
  }
  return false
}

/**
 * Salva email do usuário para biometria (opcional)
 * Usado para identificar qual usuário quer fazer login biométrico
 */
export function saveBiometricEmail(email: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('biometric_email', email)
  }
}

/**
 * Obtém email salvo para biometria
 */
export function getBiometricEmail(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('biometric_email')
  }
  return null
}

/**
 * Limpa dados de biometria (logout)
 */
export function clearBiometricData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('biometric_enabled')
    localStorage.removeItem('biometric_email')
  }
}

