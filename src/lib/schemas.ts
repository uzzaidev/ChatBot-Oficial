/**
 * VULN-013 FIX: Input Validation Schemas
 * Sprint 2 - Task 2.2
 * 
 * Definição de schemas de validação usando Zod para todos os endpoints de API
 * Previne injeção de payloads maliciosos e garante integridade dos dados
 */

import { z } from 'zod'

// ================================================================
// USER SCHEMAS
// ================================================================

/**
 * Schema para criação de usuário via /api/admin/users
 */
export const UserCreateSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(5, 'Email deve ter no mínimo 5 caracteres')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .toLowerCase()
    .trim(),
  
  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(72, 'Senha deve ter no máximo 72 caracteres'), // Bcrypt limit
  
  full_name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .trim()
    .optional(),
  
  role: z
    .enum(['client_admin', 'user'], {
      errorMap: () => ({ message: 'Role deve ser "client_admin" ou "user"' })
    }),
  
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido (formato E.164)')
    .optional()
    .nullable(),
  
  client_id: z
    .string()
    .uuid('Client ID deve ser um UUID válido')
    .optional(),
  
  permissions: z
    .record(z.any())
    .optional()
    .default({})
})

export type UserCreateInput = z.infer<typeof UserCreateSchema>

/**
 * Schema para atualização de usuário via /api/admin/users/[id]
 */
export const UserUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .trim()
    .optional(),
  
  role: z
    .enum(['client_admin', 'user'], {
      errorMap: () => ({ message: 'Role deve ser "client_admin" ou "user"' })
    })
    .optional(),
  
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido (formato E.164)')
    .optional()
    .nullable(),
  
  permissions: z
    .record(z.any())
    .optional(),
  
  is_active: z
    .boolean()
    .optional()
})

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>

// ================================================================
// SECRET SCHEMAS
// ================================================================

/**
 * Schema para atualização de secrets via /api/vault/secrets
 */
export const SecretUpdateSchema = z.object({
  key: z.enum([
    'meta_access_token',
    'meta_verify_token',
    'meta_app_secret',
    'meta_phone_number_id',
    'openai_api_key',
    'groq_api_key'
  ], {
    errorMap: () => ({ message: 'Key inválida' })
  }),
  
  value: z
    .string()
    .min(1, 'Valor não pode ser vazio')
    .max(1000, 'Valor muito longo (máximo 1000 caracteres)')
    .trim()
})

export type SecretUpdateInput = z.infer<typeof SecretUpdateSchema>

/**
 * Schema para phone number ID (não é secret, mas armazenado com secrets)
 */
export const PhoneNumberIdSchema = z
  .string()
  .min(1, 'Phone Number ID não pode ser vazio')
  .max(255, 'Phone Number ID muito longo')
  .regex(/^\d+$/, 'Phone Number ID deve conter apenas números')
  .trim()

// ================================================================
// CLIENT CONFIG SCHEMAS
// ================================================================

/**
 * Schema para configuração de cliente via /api/client/config
 */
export const ClientConfigSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .trim()
    .optional(),
  
  slug: z
    .string()
    .min(2, 'Slug deve ter no mínimo 2 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .trim()
    .optional(),
  
  status: z
    .enum(['active', 'inactive', 'suspended'], {
      errorMap: () => ({ message: 'Status inválido' })
    })
    .optional(),
  
  settings: z
    .record(z.any())
    .optional()
})

export type ClientConfigInput = z.infer<typeof ClientConfigSchema>

// ================================================================
// BOT CONFIG SCHEMAS
// ================================================================

/**
 * Schema para sistema de IA (providers)
 */
export const AIProviderSchema = z.enum(['openai', 'groq'], {
  errorMap: () => ({ message: 'Provider deve ser "openai" ou "groq"' })
})

/**
 * Schema para modelo de IA
 */
export const AIModelSchema = z.object({
  provider: AIProviderSchema,
  model: z
    .string()
    .min(1, 'Nome do modelo não pode ser vazio')
    .max(100, 'Nome do modelo muito longo'),
  temperature: z
    .number()
    .min(0, 'Temperature deve ser >= 0')
    .max(2, 'Temperature deve ser <= 2')
    .optional()
    .default(0.7),
  max_tokens: z
    .number()
    .int('Max tokens deve ser um inteiro')
    .min(1, 'Max tokens deve ser >= 1')
    .max(32000, 'Max tokens deve ser <= 32000')
    .optional()
    .default(1000)
})

export type AIModelConfig = z.infer<typeof AIModelSchema>

/**
 * Schema para configuração de bot via /api/admin/bot-config
 */
export const BotConfigSchema = z.object({
  client_id: z
    .string()
    .uuid('Client ID deve ser um UUID válido'),
  
  name: z
    .string()
    .min(2, 'Nome do bot deve ter no mínimo 2 caracteres')
    .max(100, 'Nome do bot deve ter no máximo 100 caracteres')
    .trim(),
  
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .optional(),
  
  system_prompt: z
    .string()
    .min(10, 'System prompt deve ter no mínimo 10 caracteres')
    .max(5000, 'System prompt deve ter no máximo 5000 caracteres')
    .trim(),
  
  model: AIModelSchema,
  
  // Configurações de comportamento
  auto_reply: z
    .boolean()
    .optional()
    .default(true),
  
  greeting_message: z
    .string()
    .max(1000, 'Mensagem de saudação deve ter no máximo 1000 caracteres')
    .trim()
    .optional(),
  
  fallback_message: z
    .string()
    .max(1000, 'Mensagem de fallback deve ter no máximo 1000 caracteres')
    .trim()
    .optional(),
  
  // Configurações de segurança
  max_tokens_per_message: z
    .number()
    .int('Max tokens deve ser um inteiro')
    .min(1)
    .max(10000)
    .optional()
    .default(2000),
  
  rate_limit_messages_per_minute: z
    .number()
    .int('Rate limit deve ser um inteiro')
    .min(1)
    .max(100)
    .optional()
    .default(10),
  
  allowed_phone_numbers: z
    .array(z.string().regex(/^\+?[1-9]\d{1,14}$/))
    .optional()
    .default([]),
  
  blocked_phone_numbers: z
    .array(z.string().regex(/^\+?[1-9]\d{1,14}$/))
    .optional()
    .default([]),
  
  // RAG config
  rag_enabled: z
    .boolean()
    .optional()
    .default(false),
  
  rag_collection_name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Collection name deve conter apenas letras minúsculas, números, _ e -')
    .optional(),
  
  rag_top_k: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5),
  
  // Metadata
  is_active: z
    .boolean()
    .optional()
    .default(true),
  
  metadata: z
    .record(z.any())
    .optional()
    .default({})
})

export type BotConfigInput = z.infer<typeof BotConfigSchema>

/**
 * Schema para atualização parcial de bot config
 */
export const BotConfigUpdateSchema = BotConfigSchema.partial().omit({ client_id: true })

export type BotConfigUpdateInput = z.infer<typeof BotConfigUpdateSchema>

// ================================================================
// FLOW NODE SCHEMAS (n8n integration)
// ================================================================

/**
 * Schema para atualização de nó de fluxo via /api/flow/nodes/[nodeId]
 */
export const FlowNodeSchema = z.object({
  type: z
    .string()
    .min(1, 'Tipo do nó não pode ser vazio')
    .max(50, 'Tipo do nó muito longo'),
  
  name: z
    .string()
    .min(1, 'Nome do nó não pode ser vazio')
    .max(100, 'Nome do nó muito longo')
    .trim(),
  
  config: z
    .record(z.any())
    .optional()
    .default({}),
  
  position: z
    .object({
      x: z.number(),
      y: z.number()
    })
    .optional(),
  
  is_active: z
    .boolean()
    .optional()
    .default(true)
})

export type FlowNodeInput = z.infer<typeof FlowNodeSchema>

// ================================================================
// WEBHOOK SCHEMAS
// ================================================================

/**
 * Schema para validação de webhook Meta (WhatsApp)
 */
export const MetaWebhookVerificationSchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string().min(1),
  'hub.challenge': z.string().min(1)
})

/**
 * Schema básico para payload de webhook Meta
 */
export const MetaWebhookPayloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.literal('whatsapp').optional(),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string()
            }),
            contacts: z.array(z.any()).optional(),
            messages: z.array(z.any()).optional(),
            statuses: z.array(z.any()).optional()
          }),
          field: z.literal('messages')
        })
      )
    })
  )
})

// ================================================================
// PRICING CONFIG SCHEMAS
// ================================================================

/**
 * Schema para configuração de pricing
 */
export const PricingConfigSchema = z.object({
  tier_name: z
    .string()
    .min(1, 'Nome do tier não pode ser vazio')
    .max(50, 'Nome do tier muito longo')
    .trim(),
  
  monthly_price: z
    .number()
    .min(0, 'Preço deve ser >= 0')
    .max(100000, 'Preço muito alto'),
  
  included_messages: z
    .number()
    .int('Mensagens incluídas deve ser um inteiro')
    .min(0, 'Mensagens incluídas deve ser >= 0'),
  
  price_per_extra_message: z
    .number()
    .min(0, 'Preço por mensagem extra deve ser >= 0')
    .max(100, 'Preço por mensagem extra muito alto'),
  
  features: z
    .array(z.string())
    .optional()
    .default([]),
  
  is_active: z
    .boolean()
    .optional()
    .default(true)
})

export type PricingConfigInput = z.infer<typeof PricingConfigSchema>

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Valida um payload com um schema Zod e retorna erros formatados
 * 
 * @returns { success: true, data: T } se válido, ou { success: false, errors: string[] } se inválido
 */
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  payload: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(payload)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const field = err.path.join('.')
        return `${field}: ${err.message}`
      })
      return { success: false, errors }
    }
    
    return { success: false, errors: ['Erro de validação desconhecido'] }
  }
}

/**
 * Wrapper para usar em API routes - valida e retorna NextResponse se inválido
 */
export function validateOrRespond<T>(
  schema: z.ZodSchema<T>,
  payload: unknown
): T | Response {
  const result = validatePayload(schema, payload)
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Payload inválido',
        details: result.errors
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  return result.data
}
