export type ConversationStatus = 'bot' | 'waiting' | 'human'

export type MessageType = 'text' | 'audio' | 'image' | 'document' | 'video'

export type MessageDirection = 'incoming' | 'outgoing'

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'queued'

export type UsageSource = 'openai' | 'meta' | 'groq' | 'whisper'

export type ExecutionStatus = 'running' | 'success' | 'error'

export interface ExecutionLog {
  id: number
  execution_id: string
  node_name: string
  input_data?: any
  output_data?: any
  error?: any
  status: ExecutionStatus
  duration_ms?: number
  timestamp: string
  metadata?: Record<string, any>
  created_at: string
}

export interface Client {
  id: string
  name: string
  verify_token: string
  meta_access_token: string
  phone_number_id: string
  openai_api_key: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  client_id: string
  phone: string
  name: string | null
  status: ConversationStatus
  assigned_to: string | null
  last_message: string | null
  last_update: string
  created_at: string
}

export interface Message {
  id: string
  client_id: string
  conversation_id: string
  phone: string
  name: string | null
  content: string
  type: MessageType
  direction: MessageDirection
  status: MessageStatus
  timestamp: string
  metadata: Record<string, unknown> | null
}

export interface UsageLog {
  id: string
  client_id: string
  source: UsageSource
  tokens_used: number
  messages_sent: number
  cost_usd: number
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ConversationWithCount extends Conversation {
  message_count: number
}

export interface UsageSummary {
  source: UsageSource
  total_tokens: number
  total_messages: number
  total_cost: number
}

export interface DashboardMetrics {
  total_conversations: number
  active_conversations: number
  waiting_human: number
  messages_today: number
  total_cost_month: number
}

export interface SendMessageRequest {
  phone: string
  content: string
  client_id: string
}

export interface TransferHumanRequest {
  phone: string
  client_id: string
  assigned_to?: string
}

export interface WhatsAppContact {
  profile: {
    name: string
  }
  wa_id: string
}

export interface WhatsAppTextMessage {
  from: string
  id: string
  timestamp: string
  type: 'text'
  text: {
    body: string
  }
}

export interface WhatsAppAudioMessage {
  from: string
  id: string
  timestamp: string
  type: 'audio'
  audio: {
    id: string
    mime_type: string
  }
}

export interface WhatsAppImageMessage {
  from: string
  id: string
  timestamp: string
  type: 'image'
  image: {
    id: string
    mime_type: string
    sha256: string
    caption?: string
  }
}

export type WhatsAppMessage = WhatsAppTextMessage | WhatsAppAudioMessage | WhatsAppImageMessage

export interface WhatsAppWebhookValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: WhatsAppContact[]
  messages?: WhatsAppMessage[]
  statuses?: Array<{
    id: string
    status: string
    timestamp: string
    recipient_id: string
  }>
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue
  field: string
}

export interface WhatsAppWebhookEntry {
  id: string
  changes: WhatsAppWebhookChange[]
}

export interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppWebhookEntry[]
}

export interface ParsedMessage {
  phone: string
  name: string
  type: MessageType
  content: string
  timestamp: string
  messageId: string
  metadata?: MediaMetadata
}

export interface MediaMetadata {
  url?: string
  mimeType: string
  sha256?: string
  fileSize?: number
  id: string
}

export interface AIResponse {
  content: string
  toolCalls?: ToolCall[]
  finished: boolean
}

export interface ToolCall {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

export interface ClientConfig {
  clientId: string
  metaAccessToken: string
  phoneNumberId: string
  openaiApiKey: string
  groqApiKey: string
  redisUrl: string
  gmailUser: string
  gmailPassword: string
}

export interface CustomerRecord {
  id: string
  client_id: string
  phone: string
  name: string
  status: ConversationStatus
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}
