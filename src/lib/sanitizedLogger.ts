/**
 * VULN-016 FIX: Log Sanitization
 * Sprint 2 - Task 2.4
 * 
 * Sistema de logging seguro que redacta PII (Personally Identifiable Information)
 * e dados sensíveis antes de logar
 * 
 * PII inclui: emails, telefones, CPF, senhas, tokens, API keys
 */

// ================================================================
// TYPES
// ================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogOptions {
  level?: LogLevel
  context?: string
  sanitize?: boolean // Default: true
  metadata?: Record<string, any>
}

// ================================================================
// CONFIGURATION
// ================================================================

const SENSITIVE_KEYS = [
  // Credentials
  'password',
  'senha',
  'pass',
  'pwd',
  
  // Tokens
  'token',
  'access_token',
  'refresh_token',
  'session_token',
  'auth_token',
  'bearer',
  'jwt',
  
  // API Keys
  'api_key',
  'apikey',
  'secret',
  'secret_key',
  'api_secret',
  'private_key',
  'client_secret',
  
  // WhatsApp/Meta
  'meta_access_token',
  'meta_verify_token',
  'meta_app_secret',
  'whatsapp_token',
  
  // AI providers
  'openai_api_key',
  'groq_api_key',
  'anthropic_api_key',
  
  // Banking/Financial
  'credit_card',
  'card_number',
  'cvv',
  'card_cvv',
  'account_number',
  'routing_number',
  
  // Personal identifiers
  'ssn',
  'social_security',
  'cpf',
  'cnpj',
  'passport',
  'driver_license'
]

const PII_PATTERNS = {
  // Email: user@example.com → u***r@example.com
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone: +5511999887766 → +55119***7766
  phone: /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  
  // CPF: 123.456.789-01 → ***.***.***-01
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  
  // CNPJ: 12.345.678/0001-90 → **.***.***/**01-90
  cnpj: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
  
  // Credit Card: 1234 5678 9012 3456 → **** **** **** 3456
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // JWT Token: eyJ... → eyJ***
  jwt: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  
  // API Keys (genéricos): starts with 'sk_', 'pk_', etc
  apiKey: /\b(sk|pk|test|live)_[A-Za-z0-9]{20,}\b/g
}

// ================================================================
// SANITIZATION FUNCTIONS
// ================================================================

/**
 * Mascara uma string mostrando apenas os primeiros 3 e últimos 4 caracteres
 */
function maskString(str: string, showFirst = 3, showLast = 4): string {
  if (!str || str.length <= (showFirst + showLast)) {
    return '***'
  }
  
  const first = str.substring(0, showFirst)
  const last = str.substring(str.length - showLast)
  const masked = '*'.repeat(Math.min(str.length - showFirst - showLast, 10))
  
  return `${first}${masked}${last}`
}

/**
 * Redacta padrões de PII em uma string
 */
function redactPIIPatterns(text: string): string {
  let sanitized = text
  
  // Email: user@example.com → u***r@example.com
  sanitized = sanitized.replace(PII_PATTERNS.email, (match) => {
    const [local, domain] = match.split('@')
    if (local.length <= 2) return `***@${domain}`
    return `${local[0]}***${local[local.length - 1]}@${domain}`
  })
  
  // Phone: +5511999887766 → +55119***7766
  sanitized = sanitized.replace(PII_PATTERNS.phone, (match) => {
    if (match.length <= 8) return '***'
    return match.substring(0, 5) + '***' + match.substring(match.length - 4)
  })
  
  // CPF: 123.456.789-01 → ***.***.***-01
  sanitized = sanitized.replace(PII_PATTERNS.cpf, (match) => {
    const cleaned = match.replace(/[.-]/g, '')
    return `***.***.***-${cleaned.substring(9)}`
  })
  
  // CNPJ: 12.345.678/0001-90 → **.***.***/**01-90
  sanitized = sanitized.replace(PII_PATTERNS.cnpj, (match) => {
    const lastFour = match.substring(match.length - 2)
    return `**.***.***/**${lastFour.substring(0, 2)}-${lastFour}`
  })
  
  // Credit Card: 1234 5678 9012 3456 → **** **** **** 3456
  sanitized = sanitized.replace(PII_PATTERNS.creditCard, (match) => {
    const cleaned = match.replace(/[-\s]/g, '')
    return `**** **** **** ${cleaned.substring(12)}`
  })
  
  // JWT: eyJ... → eyJ***
  sanitized = sanitized.replace(PII_PATTERNS.jwt, (match) => {
    return `${match.substring(0, 10)}***`
  })
  
  // API Keys: sk_abc123... → sk_***
  sanitized = sanitized.replace(PII_PATTERNS.apiKey, (match) => {
    return `${match.substring(0, 3)}***`
  })
  
  return sanitized
}

/**
 * Sanitiza um objeto recursivamente
 */
function sanitizeObject(obj: any, depth = 0): any {
  // Prevenir recursão infinita
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]'
  }
  
  // Null/undefined
  if (obj === null || obj === undefined) {
    return obj
  }
  
  // Primitivos (string, number, boolean)
  if (typeof obj !== 'object') {
    // Se é string, aplicar redação de padrões
    if (typeof obj === 'string') {
      return redactPIIPatterns(obj)
    }
    return obj
  }
  
  // Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1))
  }
  
  // Objects
  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    
    // Se a chave é sensível, mascarar valor
    if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = maskString(value)
      } else {
        sanitized[key] = '***'
      }
    }
    // Senão, recursão
    else {
      sanitized[key] = sanitizeObject(value, depth + 1)
    }
  }
  
  return sanitized
}

/**
 * Sanitiza qualquer valor (string, object, array, etc)
 */
export function sanitize(value: any): any {
  return sanitizeObject(value)
}

// ================================================================
// LOGGING FUNCTIONS
// ================================================================

/**
 * Logger principal - sempre sanitiza por padrão
 */
export function logSafe(message: string, data?: any, options: LogOptions = {}) {
  const {
    level = 'info',
    context,
    sanitize: shouldSanitize = true,
    metadata
  } = options
  
  // Sanitizar dados se habilitado
  const sanitizedData = shouldSanitize ? sanitize(data) : data
  const sanitizedMessage = shouldSanitize ? redactPIIPatterns(message) : message
  
  // Formatar contexto
  const contextStr = context ? `[${context}]` : ''
  const prefix = contextStr ? `${contextStr} ` : ''
  
  // Log com metadata se fornecido
  const logData = metadata ? { ...sanitizedData, metadata: sanitize(metadata) } : sanitizedData
  
  // Log
  switch (level) {
    case 'debug':
      if (logData !== undefined) {
        console.debug(`${prefix}${sanitizedMessage}`, logData)
      } else {
        console.debug(`${prefix}${sanitizedMessage}`)
      }
      break
    case 'info':
      if (logData !== undefined) {
        console.log(`${prefix}${sanitizedMessage}`, logData)
      } else {
        console.log(`${prefix}${sanitizedMessage}`)
      }
      break
    case 'warn':
      if (logData !== undefined) {
        console.warn(`${prefix}${sanitizedMessage}`, logData)
      } else {
        console.warn(`${prefix}${sanitizedMessage}`)
      }
      break
    case 'error':
      if (logData !== undefined) {
        console.error(`${prefix}${sanitizedMessage}`, logData)
      } else {
        console.error(`${prefix}${sanitizedMessage}`)
      }
      break
  }
}

/**
 * Convenience wrappers
 */
export function debugSafe(message: string, data?: any, context?: string) {
  logSafe(message, data, { level: 'debug', context })
}

export function infoSafe(message: string, data?: any, context?: string) {
  logSafe(message, data, { level: 'info', context })
}

export function warnSafe(message: string, data?: any, context?: string) {
  logSafe(message, data, { level: 'warn', context })
}

export function errorSafe(message: string, data?: any, context?: string) {
  logSafe(message, data, { level: 'error', context })
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  sanitize,
  logSafe,
  debugSafe,
  infoSafe,
  warnSafe,
  errorSafe
}
