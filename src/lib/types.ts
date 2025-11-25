export type ConversationStatus = "bot" | "humano" | "transferido";

export type MessageType = "text" | "audio" | "image" | "document" | "video";

export type MessageDirection = "incoming" | "outgoing";

export type MessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "queued";

export type UsageSource = "openai" | "meta" | "groq" | "whisper";

export type ExecutionStatus = "running" | "success" | "error";

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
  };
  model?: string;
  provider?: "openai" | "groq";
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
