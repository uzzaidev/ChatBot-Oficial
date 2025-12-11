import axios from 'axios'
import { 
  ClientConfig, 
  MessageTemplate, 
  TemplateComponent, 
  TemplateSendPayload,
  SendTemplateRequest,
  TemplateComponentPayload,
  TemplateParameter
} from './types'

const META_API_VERSION = 'v18.0'
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

const getRequiredEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

/**
 * 🔐 Cria cliente Meta API com accessToken dinâmico ou fallback para env
 *
 * @param accessToken - Token opcional (do config do cliente)
 * @returns Cliente Axios configurado
 */
const createMetaApiClient = (accessToken?: string) => {
  const token = accessToken || getRequiredEnvVariable('META_ACCESS_TOKEN')

  return axios.create({
    baseURL: META_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * 🔐 Download de mídia usando config dinâmica do cliente
 *
 * @param mediaId - ID da mídia no Meta
 * @param accessToken - Token opcional (do config do cliente)
 * @returns Buffer com o conteúdo da mídia
 */
export const downloadMedia = async (mediaId: string, accessToken?: string): Promise<Buffer> => {
  try {
    const client = createMetaApiClient(accessToken)

    const mediaUrlResponse = await client.get(`/${mediaId}`)
    const mediaUrl = mediaUrlResponse.data?.url

    if (!mediaUrl) {
      throw new Error('No media URL returned from Meta API')
    }

    const mediaResponse = await client.get(mediaUrl, {
      responseType: 'arraybuffer',
    })

    return Buffer.from(mediaResponse.data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to download media from Meta API: ${errorMessage}`)
  }
}

/**
 * 🔐 Envia mensagem de texto usando config dinâmica do cliente
 *
 * @param phone - Número do destinatário
 * @param message - Conteúdo da mensagem
 * @param config - Config opcional (do Vault), usa env se não fornecido
 * @returns ID da mensagem enviada
 */
export const sendTextMessage = async (
  phone: string,
  message: string,
  config?: ClientConfig // 🔐 Novo parâmetro opcional
): Promise<{ messageId: string }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    const client = createMetaApiClient(accessToken) // Usa token do config

    const response = await client.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        body: message,
      },
    })

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    return { messageId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send text message via Meta API: ${errorMessage}`)
  }
}

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    const client = createMetaApiClient()
    const phoneNumberId = getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    await client.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to mark message as read via Meta API: ${errorMessage}`)
  }
}

/**
 * 🔐 Envia imagem via WhatsApp
 *
 * @param phone - Número do destinatário
 * @param imageUrl - URL pública da imagem
 * @param caption - Legenda opcional
 * @param config - Config opcional (do Vault)
 * @returns ID da mensagem enviada
 */
export const sendImageMessage = async (
  phone: string,
  imageUrl: string,
  caption?: string,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    const client = createMetaApiClient(accessToken)

    const response = await client.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption && { caption }),
      },
    })

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    return { messageId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send image message via Meta API: ${errorMessage}`)
  }
}

/**
 * 🔐 Envia áudio via WhatsApp (por URL)
 *
 * @param phone - Número do destinatário
 * @param audioUrl - URL pública do áudio
 * @param config - Config opcional (do Vault)
 * @returns ID da mensagem enviada
 */
export const sendAudioMessage = async (
  phone: string,
  audioUrl: string,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    const client = createMetaApiClient(accessToken)

    const response = await client.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'audio',
      audio: {
        link: audioUrl,
      },
    })

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    return { messageId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send audio message via Meta API: ${errorMessage}`)
  }
}

/**
 * 🔐 Envia áudio via WhatsApp (por Media ID)
 *
 * @param phone - Número do destinatário
 * @param mediaId - WhatsApp Media ID (retornado pelo upload)
 * @param config - Config opcional (do Vault)
 * @returns ID da mensagem enviada
 */
export const sendAudioMessageByMediaId = async (
  phone: string,
  mediaId: string,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    const client = createMetaApiClient(accessToken)

    const response = await client.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'audio',
      audio: {
        id: mediaId,
      },
    })

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    return { messageId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send audio message by media ID via Meta API: ${errorMessage}`)
  }
}

/**
 * 🔐 Envia documento via WhatsApp
 *
 * @param phone - Número do destinatário
 * @param documentUrl - URL pública do documento
 * @param filename - Nome do arquivo
 * @param caption - Legenda opcional
 * @param config - Config opcional (do Vault)
 * @returns ID da mensagem enviada
 */
export const sendDocumentMessage = async (
  phone: string,
  documentUrl: string,
  filename: string,
  caption?: string,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    const client = createMetaApiClient(accessToken)

    const response = await client.post(`/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        ...(caption && { caption }),
      },
    })

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    return { messageId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send document message via Meta API: ${errorMessage}`)
  }
}

/**
 * ======================================================
 * 📋 WhatsApp Template Messages Functions
 * ======================================================
 */

/**
 * 📋 Create a WhatsApp Message Template
 * Submits a template to Meta for approval
 * 
 * @param template - Template data (name, category, language, components)
 * @param wabaId - WhatsApp Business Account ID
 * @param config - Client configuration with Meta credentials
 * @returns Meta template ID
 */
export const createMetaTemplate = async (
  template: Pick<MessageTemplate, 'name' | 'category' | 'language' | 'components'>,
  wabaId: string,
  config?: ClientConfig
): Promise<{ id: string; status: string }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const client = createMetaApiClient(accessToken)

    const payload = {
      name: template.name,
      category: template.category,
      language: template.language,
      components: template.components,
    }

    const response = await client.post(`/${wabaId}/message_templates`, payload)

    return {
      id: response.data.id,
      status: response.data.status || 'PENDING',
    }
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error.message || 'Unknown error'
    throw new Error(`Failed to create template on Meta API: ${errorMessage}`)
  }
}

/**
 * 📋 List WhatsApp Message Templates
 * Fetches all templates for a WhatsApp Business Account
 * 
 * @param wabaId - WhatsApp Business Account ID
 * @param config - Client configuration with Meta credentials
 * @returns Array of templates with status
 */
export const listMetaTemplates = async (
  wabaId: string,
  config?: ClientConfig
): Promise<Array<{ id: string; name: string; status: string; category: string; language: string }>> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const client = createMetaApiClient(accessToken)

    const response = await client.get(`/${wabaId}/message_templates`, {
      params: {
        fields: 'id,name,status,category,language,components',
        limit: 100, // Max templates per page
      },
    })

    return response.data.data || []
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error.message || 'Unknown error'
    throw new Error(`Failed to list templates from Meta API: ${errorMessage}`)
  }
}

/**
 * 📋 Get single template details from Meta
 * 
 * @param templateId - Meta template ID
 * @param config - Client configuration
 * @returns Template data including status
 */
export const getMetaTemplate = async (
  templateId: string,
  config?: ClientConfig
): Promise<{ id: string; name: string; status: string; category: string; language: string; components: TemplateComponent[] }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const client = createMetaApiClient(accessToken)

    const response = await client.get(`/${templateId}`, {
      params: {
        fields: 'id,name,status,category,language,components',
      },
    })

    return response.data
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error.message || 'Unknown error'
    throw new Error(`Failed to get template from Meta API: ${errorMessage}`)
  }
}

/**
 * 📋 Send WhatsApp Template Message
 * Sends a pre-approved template message to a user
 * 
 * @param phone - Recipient phone number
 * @param templateName - Template name
 * @param language - Language code (e.g., 'pt_BR')
 * @param parameters - Array of parameter values for template variables
 * @param config - Client configuration
 * @returns Message ID
 */
export const sendTemplateMessage = async (
  phone: string,
  templateName: string,
  language: string,
  parameters?: string[],
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  try {
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')
    const client = createMetaApiClient(accessToken)

    // Build components with parameters
    const components: TemplateComponentPayload[] = []

    if (parameters && parameters.length > 0) {
      const bodyParameters: TemplateParameter[] = parameters.map(value => ({
        type: 'text',
        text: value,
      }))

      components.push({
        type: 'body',
        parameters: bodyParameters,
      })
    }

    const payload: TemplateSendPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language,
        },
        ...(components.length > 0 && { components }),
      },
    }

    const response = await client.post(`/${phoneNumberId}/messages`, payload)

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    return { messageId }
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error.message || 'Unknown error'
    throw new Error(`Failed to send template message via Meta API: ${errorMessage}`)
  }
}

/**
 * 📋 Sync template status from Meta
 * Fetches current status of templates from Meta API
 * 
 * @param wabaId - WhatsApp Business Account ID
 * @param templateNames - Array of template names to sync
 * @param config - Client configuration
 * @returns Map of template names to their status
 */
export const syncTemplateStatus = async (
  wabaId: string,
  templateNames: string[],
  config?: ClientConfig
): Promise<Record<string, { status: string; rejection_reason?: string }>> => {
  try {
    const templates = await listMetaTemplates(wabaId, config)
    
    const statusMap: Record<string, { status: string; rejection_reason?: string }> = {}
    
    for (const name of templateNames) {
      const template = templates.find(t => t.name === name)
      if (template) {
        statusMap[name] = {
          status: template.status,
        }
        
        // If rejected, fetch detailed info
        if (template.status === 'REJECTED') {
          const detailed = await getMetaTemplate(template.id, config)
          // Meta API may include rejection_reason in detailed view
          statusMap[name].rejection_reason = (detailed as any).rejection_reason || 'No reason provided'
        }
      }
    }
    
    return statusMap
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error.message || 'Unknown error'
    throw new Error(`Failed to sync template status from Meta API: ${errorMessage}`)
  }
}
