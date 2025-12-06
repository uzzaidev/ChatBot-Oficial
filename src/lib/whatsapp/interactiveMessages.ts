/**
 * 📱 WhatsApp Interactive Messages Library
 * 
 * Implements Meta WhatsApp Business API Interactive Messages:
 * - Reply Buttons (up to 3 buttons)
 * - List Messages (up to 10 sections, 100 items total)
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages
 */

import axios from 'axios'
import { ClientConfig } from '../types'

const META_API_VERSION = 'v18.0'
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

// ============================================
// TYPES
// ============================================

/**
 * Parameters for Reply Buttons message
 */
export interface ReplyButtonsParams {
  body: string // Body text (max 1024 chars)
  buttons: ReplyButton[] // 1-3 buttons
  footer?: string // Footer text (max 60 chars)
}

/**
 * Single reply button
 */
export interface ReplyButton {
  id: string // Unique ID (used for matching responses)
  title: string // Button text (max 20 chars)
}

/**
 * Parameters for List message
 */
export interface ListMessageParams {
  header?: string // Header text (max 60 chars)
  body: string // Body text (max 1024 chars)
  footer?: string // Footer text (max 60 chars)
  buttonText: string // Button that opens list (max 20 chars)
  sections: ListSection[] // 1-10 sections
}

/**
 * Section in list message
 */
export interface ListSection {
  title?: string // Section title (max 24 chars, optional)
  rows: ListRow[] // 1-10 rows per section
}

/**
 * Row (item) in list section
 */
export interface ListRow {
  id: string // Unique ID (used for matching responses)
  title: string // Row title (max 24 chars)
  description?: string // Row description (max 72 chars, optional)
}

/**
 * Parsed interactive response from webhook
 */
export interface ParsedInteractiveResponse {
  type: 'button_reply' | 'list_reply'
  id: string // ID of clicked button/item
  title: string // Title of clicked button/item
  description?: string // Description (list only)
  from: string // Phone number
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getRequiredEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

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
 * Count UTF-8 bytes (for proper character limit validation)
 */
const countBytes = (text: string): number => {
  return new TextEncoder().encode(text).length
}

/**
 * Validate button title length
 */
const validateButtonTitle = (title: string): void => {
  const byteLength = countBytes(title)
  if (byteLength > 20) {
    throw new Error(
      `Button title too long: "${title}" (${byteLength} bytes, max 20)`
    )
  }
}

/**
 * Validate list row title length
 */
const validateListRowTitle = (title: string): void => {
  const byteLength = countBytes(title)
  if (byteLength > 24) {
    throw new Error(
      `List row title too long: "${title}" (${byteLength} bytes, max 24)`
    )
  }
}

/**
 * Validate list row description length
 */
const validateListRowDescription = (description: string): void => {
  const byteLength = countBytes(description)
  if (byteLength > 72) {
    throw new Error(
      `List row description too long: "${description}" (${byteLength} bytes, max 72)`
    )
  }
}

// ============================================
// SEND FUNCTIONS
// ============================================

/**
 * 📤 Send Reply Buttons message
 * 
 * Sends a message with 1-3 reply buttons
 * 
 * @param phone - Recipient phone number (international format)
 * @param params - Button message parameters
 * @param config - Optional client config (uses env if not provided)
 * @returns Message ID
 * 
 * @example
 * ```typescript
 * await sendInteractiveButtons('5554999999999', {
 *   body: 'How can I help you?',
 *   buttons: [
 *     { id: 'btn_support', title: 'Support' },
 *     { id: 'btn_sales', title: 'Sales' }
 *   ],
 *   footer: 'Available 24/7'
 * })
 * ```
 */
export const sendInteractiveButtons = async (
  phone: string,
  params: ReplyButtonsParams,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  try {
    const { body, buttons, footer } = params

    // Validation: Button count
    if (buttons.length < 1) {
      throw new Error('At least 1 button required')
    }
    if (buttons.length > 3) {
      throw new Error(`Maximum 3 buttons allowed (got ${buttons.length})`)
    }

    // Validation: Button titles
    for (const btn of buttons) {
      validateButtonTitle(btn.title)
    }

    // Validation: Body text
    if (countBytes(body) > 1024) {
      throw new Error('Body text too long (max 1024 bytes)')
    }

    // Validation: Footer text
    if (footer && countBytes(footer) > 60) {
      throw new Error('Footer text too long (max 60 bytes)')
    }

    // Validation: Unique IDs
    const ids = buttons.map((b) => b.id)
    const uniqueIds = new Set(ids)
    if (uniqueIds.size !== ids.length) {
      throw new Error('Button IDs must be unique')
    }

    // Get credentials
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId =
      config?.apiKeys.metaPhoneNumberId ||
      getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    const client = createMetaApiClient(accessToken)

    // Build payload
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: body,
        },
        ...(footer && { footer: { text: footer } }),
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    }

    // Send request
    const response = await client.post(`/${phoneNumberId}/messages`, payload)

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    console.log(`✅ Interactive buttons sent to ${phone}: ${messageId}`)

    return { messageId }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data
      const errorMessage = errorData?.error?.message || error.message
      throw new Error(`Failed to send interactive buttons: ${errorMessage}`)
    }
    throw error
  }
}

/**
 * 📤 Send List message
 * 
 * Sends a message with a list of options (up to 10 sections, 100 items total)
 * 
 * @param phone - Recipient phone number (international format)
 * @param params - List message parameters
 * @param config - Optional client config (uses env if not provided)
 * @returns Message ID
 * 
 * @example
 * ```typescript
 * await sendInteractiveList('5554999999999', {
 *   header: 'Main Menu',
 *   body: 'Select an option:',
 *   buttonText: 'View Options',
 *   sections: [
 *     {
 *       title: 'Support',
 *       rows: [
 *         { id: 'opt_tech', title: 'Technical Support', description: 'Technical issues' },
 *         { id: 'opt_billing', title: 'Billing', description: 'Payment questions' }
 *       ]
 *     }
 *   ]
 * })
 * ```
 */
export const sendInteractiveList = async (
  phone: string,
  params: ListMessageParams,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  try {
    const { header, body, footer, buttonText, sections } = params

    // Validation: Section count
    if (sections.length < 1) {
      throw new Error('At least 1 section required')
    }
    if (sections.length > 10) {
      throw new Error(`Maximum 10 sections allowed (got ${sections.length})`)
    }

    // Validation: Row counts and total
    let totalRows = 0
    for (const section of sections) {
      if (section.rows.length < 1) {
        throw new Error('Each section must have at least 1 row')
      }
      if (section.rows.length > 10) {
        throw new Error(
          `Maximum 10 rows per section (section "${section.title}" has ${section.rows.length})`
        )
      }
      totalRows += section.rows.length
    }

    if (totalRows > 100) {
      throw new Error(`Maximum 100 total rows allowed (got ${totalRows})`)
    }

    // Validation: Row titles and descriptions
    const allIds: string[] = []
    for (const section of sections) {
      for (const row of section.rows) {
        validateListRowTitle(row.title)
        if (row.description) {
          validateListRowDescription(row.description)
        }
        allIds.push(row.id)
      }
    }

    // Validation: Unique IDs across all sections
    const uniqueIds = new Set(allIds)
    if (uniqueIds.size !== allIds.length) {
      throw new Error('All row IDs must be unique across all sections')
    }

    // Validation: Section titles
    for (const section of sections) {
      if (section.title && countBytes(section.title) > 24) {
        throw new Error(`Section title too long: "${section.title}" (max 24 bytes)`)
      }
    }

    // Validation: Text fields
    if (header && countBytes(header) > 60) {
      throw new Error('Header text too long (max 60 bytes)')
    }
    if (countBytes(body) > 1024) {
      throw new Error('Body text too long (max 1024 bytes)')
    }
    if (footer && countBytes(footer) > 60) {
      throw new Error('Footer text too long (max 60 bytes)')
    }
    if (countBytes(buttonText) > 20) {
      throw new Error('Button text too long (max 20 bytes)')
    }

    // Get credentials
    const accessToken = config?.apiKeys.metaAccessToken
    const phoneNumberId =
      config?.apiKeys.metaPhoneNumberId ||
      getRequiredEnvVariable('META_PHONE_NUMBER_ID')

    const client = createMetaApiClient(accessToken)

    // Build payload
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(header && { header: { type: 'text', text: header } }),
        body: {
          text: body,
        },
        ...(footer && { footer: { text: footer } }),
        action: {
          button: buttonText,
          sections: sections.map((section) => ({
            ...(section.title && { title: section.title }),
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              ...(row.description && { description: row.description }),
            })),
          })),
        },
      },
    }

    // Send request
    const response = await client.post(`/${phoneNumberId}/messages`, payload)

    const messageId = response.data?.messages?.[0]?.id

    if (!messageId) {
      throw new Error('No message ID returned from Meta API')
    }

    console.log(`✅ Interactive list sent to ${phone}: ${messageId}`)

    return { messageId }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data
      const errorMessage = errorData?.error?.message || error.message
      throw new Error(`Failed to send interactive list: ${errorMessage}`)
    }
    throw error
  }
}

// ============================================
// PARSER FUNCTIONS
// ============================================

/**
 * 📥 Parse interactive message response from webhook
 * 
 * Extracts the clicked button/item ID and details from webhook payload
 * 
 * @param message - Message object from webhook
 * @returns Parsed response or null if not interactive
 * 
 * @example
 * ```typescript
 * const message = webhookBody.entry[0].changes[0].value.messages[0]
 * const response = parseInteractiveMessage(message)
 * 
 * if (response) {
 *   console.log('User clicked:', response.id) // 'btn_support'
 * }
 * ```
 */
export const parseInteractiveMessage = (
  message: any
): ParsedInteractiveResponse | null => {
  if (message.type !== 'interactive') {
    return null
  }

  const { interactive } = message

  if (interactive?.type === 'button_reply') {
    return {
      type: 'button_reply',
      id: interactive.button_reply.id,
      title: interactive.button_reply.title,
      from: message.from,
    }
  }

  if (interactive?.type === 'list_reply') {
    return {
      type: 'list_reply',
      id: interactive.list_reply.id,
      title: interactive.list_reply.title,
      description: interactive.list_reply.description,
      from: message.from,
    }
  }

  return null
}
