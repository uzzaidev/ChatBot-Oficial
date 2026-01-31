export type ConversationStatus =
  | "bot"
  | "humano"
  | "transferido"
  | "fluxo_inicial";

export type MessageType =
  | "text"
  | "audio"
  | "image"
  | "document"
  | "video"
  | "interactive";

export type StoredMediaType = "image" | "audio" | "document" | "video";

export type MessageDirection = "incoming" | "outgoing";

export type MessageStatus =
  | "pending" // Waiting to be sent (WhatsApp status tracking)
  | "sending" // Currently being sent
  | "sent" // Received by WhatsApp servers (WhatsApp status tracking)
  | "delivered" // Delivered to user's device (WhatsApp status tracking)
  | "read" // Read by user (WhatsApp status tracking)
  | "failed" // Failed to send (WhatsApp status tracking)
  | "queued"; // Queued for processing

export type UsageSource = "openai" | "meta" | "groq" | "whisper";

export type ExecutionStatus = "running" | "success" | "error";

/**
 * 📎 Stored media metadata for displaying real media files in conversations
 * This is stored in the database after uploading to Supabase Storage
 */
export interface StoredMediaMetadata {
  type: StoredMediaType;
  url: string;
  mimeType: string;
  filename?: string;
  size?: number;
}

export interface ExecutionLog {
  id: number;
  execution_id: string;
  node_name: string;
  input_data?: any;
  output_data?: any;
  error?: any;
  status: ExecutionStatus;
  duration_ms?: number;
  timestamp: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  verify_token: string;
  meta_access_token: string;
  phone_number_id: string;
  openai_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  phone: string;
  name: string | null;
  status: ConversationStatus;
  assigned_to: string | null;
  last_message: string | null;
  last_update: string;
  last_read_at?: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  client_id: string;
  conversation_id: string;
  phone: string;
  name: string | null;
  content: string;
  type: MessageType;
  direction: MessageDirection;
  status: MessageStatus;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  transcription?: string | null; // TTS: Text transcription for audio messages
  audio_duration_seconds?: number | null; // TTS: Duration of audio in seconds
}

export interface UsageLog {
  id: string;
  client_id: string;
  source: UsageSource;
  tokens_used: number;
  messages_sent: number;
  cost_usd: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ConversationWithCount extends Conversation {
  message_count: number;
  unread_count?: number;
}

export interface UsageSummary {
  source: UsageSource;
  total_tokens: number;
  total_messages: number;
  total_cost: number;
}

export interface DashboardMetrics {
  total_conversations: number;
  active_conversations: number;
  waiting_human: number;
  messages_today: number;
  total_cost_month: number;
}

// Analytics Types
export interface DailyUsage {
  date: string;
  source: UsageSource;
  total_tokens: number;
  total_cost: number;
  request_count: number;
}

export interface WeeklyUsage {
  week_start: string;
  week_number: number;
  total_tokens: number;
  openai_tokens: number;
  groq_tokens: number;
  total_cost: number;
}

export interface MonthlyUsageByModel {
  source: UsageSource;
  model: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost: number;
  request_count: number;
}

export interface ConversationUsage {
  phone: string;
  conversation_name: string;
  total_tokens: number;
  total_cost: number;
  request_count: number;
  openai_tokens: number;
  groq_tokens: number;
}

export interface AnalyticsSummary {
  unique_conversations: number;
  total_tokens: number;
  total_cost: number;
  total_requests: number;
  openai_tokens: number;
  groq_tokens: number;
  openai_cost: number;
  groq_cost: number;
}

export interface AnalyticsData {
  daily?: DailyUsage[];
  weekly?: WeeklyUsage[];
  monthly?: MonthlyUsageByModel[];
  byConversation?: ConversationUsage[];
  summary?: AnalyticsSummary;
}

export interface SendMessageRequest {
  phone: string;
  content: string;
  client_id: string;
}

export interface TransferHumanRequest {
  phone: string;
  client_id: string;
  assigned_to?: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text";
  text: {
    body: string;
  };
}

export interface WhatsAppAudioMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "audio";
  audio: {
    id: string;
    mime_type: string;
  };
}

export interface WhatsAppImageMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "image";
  image: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

export interface WhatsAppDocumentMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "document";
  document: {
    id: string;
    mime_type: string;
    sha256: string;
    filename?: string;
    caption?: string;
  };
}

export type WhatsAppMessage =
  | WhatsAppTextMessage
  | WhatsAppAudioMessage
  | WhatsAppImageMessage
  | WhatsAppDocumentMessage;

export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
  }>;
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export interface ParsedMessage {
  phone: string;
  name: string;
  type: MessageType;
  content: string;
  timestamp: string;
  messageId: string;
  metadata?: MediaMetadata;
  // Interactive message fields
  interactiveType?: "button_reply" | "list_reply";
  interactiveResponseId?: string;
  interactiveResponseTitle?: string;
}

export interface MediaMetadata {
  url?: string;
  mimeType: string;
  sha256?: string;
  fileSize?: number;
  id: string;
  filename?: string;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  finished: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
  };
  model?: string;
  provider?: "openai" | "groq" | "anthropic" | "google";
  requestId?: string;
  wasCached?: boolean;
  wasFallback?: boolean;
  fallbackReason?: string;
  primaryAttemptedProvider?: "openai" | "groq" | "anthropic" | "google";
  primaryAttemptedModel?: string;
  fallbackUsedProvider?: "openai" | "groq" | "anthropic" | "google";
  fallbackUsedModel?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * 🔐 Configuração Multi-Tenant de Cliente (com Vault)
 *
 * Esta interface representa a configuração completa de um cliente (tenant)
 * incluindo secrets descriptografados do Supabase Vault.
 */
export interface ClientConfig {
  // Identificação
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "trial" | "cancelled";

  // 🔐 API key strategy (platform-only default)
  aiKeysMode?: "platform_only" | "byok_allowed";

  // 🤖 Provider principal do agente (NOVO)
  primaryProvider: "openai" | "groq";

  // API Keys (descriptografadas do Vault)
  apiKeys: {
    metaAccessToken: string;
    metaVerifyToken: string;
    metaAppSecret: string | null; // SECURITY FIX (VULN-012): App Secret for HMAC validation
    metaPhoneNumberId: string;
    openaiApiKey: string;
    groqApiKey: string;
  };

  // Prompts Customizados
  prompts: {
    systemPrompt: string;
    formatterPrompt?: string;
  };

  // Modelos de IA
  models: {
    openaiModel: string;
    groqModel: string;
  };

  // Configurações de Comportamento
  settings: {
    batchingDelaySeconds: number;
    maxTokens: number;
    temperature: number;
    enableRAG: boolean;
    enableTools: boolean;
    enableHumanHandoff: boolean;
    messageSplitEnabled: boolean;
    maxChatHistory: number;
    messageDelayMs: number; // Delay between split messages (in milliseconds)
    tts_enabled?: boolean;
    tts_provider?: string;
    tts_model?: string; // 'tts-1' (fast) or 'tts-1-hd' (quality)
    tts_voice?: string;
    tts_speed?: number;
    tts_auto_offer?: boolean;
  };

  // Notificações
  notificationEmail?: string;
}

export interface CustomerRecord {
  id: string;
  client_id: string;
  phone: string;
  name: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

/**
 * Contact import result interface
 */
export interface ContactImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    phone: string;
    error: string;
  }>;
}

/**
 * Supabase Database Types
 *
 * NOTA: Para types completos, gerar com:
 * npx supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
 *
 * Por enquanto, usamos tipo genérico
 */
/**
 * 🔐 Phase 4: Admin Dashboard Types
 */
export type UserRole = "admin" | "client_admin" | "user";

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface UserProfile {
  id: string;
  client_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  permissions: Record<string, any>;
  is_active: boolean;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInvite {
  id: string;
  client_id: string;
  invited_by_user_id: string;
  email: string;
  role: Exclude<UserRole, "admin">; // Cannot invite as admin
  invite_token: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileWithInviter extends UserProfile {
  client_name?: string;
  invited_by?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export interface CreateUserRequest {
  email: string;
  password: string; // Senha inicial definida pelo admin
  full_name?: string;
  role: Exclude<UserRole, "admin">;
  phone?: string;
  client_id?: string; // Opcional - apenas super admin pode definir
  permissions?: Record<string, any>;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: Exclude<UserRole, "admin">;
  phone?: string;
  permissions?: Record<string, any>;
  is_active?: boolean;
}

export interface CreateInviteRequest {
  email: string;
  role: Exclude<UserRole, "admin">;
}

export interface AcceptInviteRequest {
  token: string;
  full_name?: string;
  phone?: string;
}

/**
 * ======================================================
 * 📋 WhatsApp Template Messages Types
 * ======================================================
 */

export type TemplateCategory = "UTILITY" | "AUTHENTICATION" | "MARKETING";

export type TemplateStatus =
  | "DRAFT" // Created locally, not submitted
  | "PENDING" // Submitted to Meta, awaiting approval
  | "APPROVED" // Approved by Meta, ready to use
  | "REJECTED" // Rejected by Meta
  | "PAUSED" // Paused by Meta due to quality issues
  | "DISABLED"; // Disabled by Meta

export type TemplateComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";

export type TemplateHeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";

export type TemplateButtonType = "URL" | "QUICK_REPLY" | "PHONE_NUMBER";

/**
 * Template Button
 */
export interface TemplateButton {
  type: TemplateButtonType;
  text: string;
  url?: string; // For URL buttons, can include {{1}} variable
  phone_number?: string; // For PHONE_NUMBER buttons
}

/**
 * Template Component (HEADER, BODY, FOOTER, BUTTONS)
 */
export interface TemplateComponent {
  type: TemplateComponentType;
  format?: TemplateHeaderFormat; // Only for HEADER
  text?: string; // Text content (can include {{1}}, {{2}}, etc)
  example?: {
    header_text?: string[];
    body_text?: string[][]; // Array of arrays for multiple examples
  };
  buttons?: TemplateButton[]; // Only for BUTTONS type
}

/**
 * WhatsApp Message Template
 */
export interface MessageTemplate {
  id: string;
  client_id: string;
  created_by: string | null;

  // Meta API fields
  meta_template_id: string | null;
  waba_id: string;

  // Template definition
  name: string;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];

  // Status & approval
  status: TemplateStatus;
  rejection_reason: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Template parameter for sending messages
 */
export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}

/**
 * Component parameters when sending template
 */
export interface TemplateComponentPayload {
  type: string; // "header" | "body" | "button"
  parameters: TemplateParameter[];
  sub_type?: string; // For buttons: "url" | "quick_reply"
  index?: number; // Button index
}

/**
 * Payload for sending a template message
 */
export interface TemplateSendPayload {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string; // Phone number
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponentPayload[];
  };
}

/**
 * Request body for sending template
 */
export interface SendTemplateRequest {
  phone: string;
  parameters?: string[]; // Simple text parameters for body variables
  headerParameters?: TemplateParameter[]; // Complex parameters for header
  buttonParameters?: Record<number, string[]>; // URL button variables by button index
}

/**
 * Create/Update template request
 */
export interface CreateTemplateRequest {
  name: string;
  category: TemplateCategory;
  language: string;
  waba_id: string;
  components: TemplateComponent[];
}

export interface UpdateTemplateRequest {
  components?: TemplateComponent[];
  status?: TemplateStatus;
  rejection_reason?: string | null;
}

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Omit<Client, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Client, "id" | "created_at" | "updated_at">>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: {
          id: string;
          client_id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          permissions?: Record<string, any>;
          is_active?: boolean;
          phone?: string | null;
        };
        Update: {
          full_name?: string | null;
          role?: UserRole;
          permissions?: Record<string, any>;
          is_active?: boolean;
          phone?: string | null;
        };
      };
      user_invites: {
        Row: UserInvite;
        Insert: Omit<UserInvite, "id" | "created_at" | "updated_at">;
        Update: Partial<Pick<UserInvite, "status" | "accepted_at">>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, "id" | "created_at">;
        Update: Partial<Omit<Conversation, "id" | "created_at">>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id">;
        Update: Partial<Omit<Message, "id">>;
      };
      clientes_whatsapp: {
        Row: CustomerRecord;
        Insert: Omit<CustomerRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<CustomerRecord, "id" | "created_at" | "updated_at">
        >;
      };
      message_templates: {
        Row: MessageTemplate;
        Insert: Omit<MessageTemplate, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<MessageTemplate, "id" | "created_at" | "updated_at">
        >;
      };
    };
    Views: {};
    Functions: {
      get_user_client_id: {
        Args: {};
        Returns: string;
      };
      get_current_user_role: {
        Args: {};
        Returns: UserRole;
      };
      user_has_role: {
        Args: { required_role: UserRole };
        Returns: boolean;
      };
      user_is_admin: {
        Args: {};
        Returns: boolean;
      };
      get_current_user_client_id: {
        Args: {};
        Returns: string;
      };
    };
  };
}

// =============================================================================
// CRM MODULE TYPES
// =============================================================================

export type AutoStatus = 'awaiting_attendant' | 'awaiting_client' | 'neutral';

export type CRMActivityType =
  | 'column_move'
  | 'tag_add'
  | 'tag_remove'
  | 'note_add'
  | 'assigned'
  | 'status_change'
  | 'value_change'
  | 'created';

export interface CRMColumn {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  position: number;
  auto_rules: Record<string, any>;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMCard {
  id: string;
  client_id: string;
  column_id: string;
  phone: string | number;
  position: number;
  auto_status: AutoStatus;
  auto_status_updated_at: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  estimated_value: number | null;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  last_message_at: string | null;
  last_message_direction: 'incoming' | 'outgoing' | null;
  last_message_preview: string | null;
  moved_to_column_at: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  contact?: {
    name: string | null;
    avatarUrl?: string | null;
  };
  assignedUser?: {
    name: string | null;
  };
  tagIds?: string[];
}

export interface CRMTag {
  id: string;
  client_id: string;
  name: string;
  color: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMCardTag {
  card_id: string;
  tag_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface CRMNote {
  id: string;
  card_id: string;
  client_id: string;
  content: string;
  created_by: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  author?: {
    name: string | null;
  };
}

export interface CRMActivityLog {
  id: string;
  client_id: string;
  card_id: string;
  activity_type: CRMActivityType;
  description: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  performed_by: string | null;
  is_automated: boolean;
  created_at: string;
  
  // Joined data
  actor?: {
    name: string | null;
  };
}

export interface CRMFilters {
  search?: string;
  tagIds?: string[];
  assignedTo?: string;
  autoStatus?: AutoStatus;
  dateFrom?: string;
  dateTo?: string;
}
