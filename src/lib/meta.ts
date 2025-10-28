import axios from 'axios'
import { ClientConfig } from './types'

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

export const downloadMedia = async (mediaId: string): Promise<Buffer> => {
  try {
    const client = createMetaApiClient()

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
