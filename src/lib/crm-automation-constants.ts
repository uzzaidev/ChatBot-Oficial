// Tipos de triggers disponiveis para automacoes CRM
export const AVAILABLE_TRIGGERS = [
  {
    id: "message_received",
    name: "Mensagem Recebida",
    description: "Quando o cliente envia uma mensagem",
    variables: ["message_type", "message_text", "is_first_message"],
  },
  {
    id: "message_sent",
    name: "Mensagem Enviada",
    description: "Quando uma mensagem e enviada para o cliente",
    variables: ["message_type", "sent_by"],
  },
  {
    id: "keyword_detected",
    name: "Palavra-chave Detectada",
    description: "Quando a mensagem contem palavra(s)-chave configuradas",
    variables: ["message_text", "detected_keywords"],
    conditions: [
      {
        field: "keywords",
        type: "text",
        label: "Palavras-chave (separadas por virgula)",
      },
      {
        field: "match_mode",
        type: "select",
        label: "Modo de match",
        options: ["any", "all"],
      },
    ],
  },
  {
    id: "inactivity",
    name: "Inatividade",
    description: "Apos X dias sem resposta do cliente",
    variables: ["inactive_days", "last_message_date"],
    conditions: [
      {
        field: "inactivity_days",
        type: "number",
        label: "Dias de inatividade",
        default: 3,
      },
    ],
  },
  {
    id: "status_change",
    name: "Mudanca de Status",
    description: "Quando o status da conversa muda",
    variables: ["from_status", "to_status"],
    conditions: [
      {
        field: "from_status",
        type: "select",
        label: "De",
        options: ["bot", "human", "closed"],
      },
      {
        field: "to_status",
        type: "select",
        label: "Para",
        options: ["bot", "human", "closed"],
      },
    ],
  },
  {
    id: "lead_source",
    name: "Origem do Lead",
    description: "Quando lead vem de uma fonte especifica (anuncio, direto, etc)",
    variables: ["source_type", "campaign_name", "ad_name", "ad_id"],
    conditions: [
      {
        field: "source_type",
        type: "select",
        label: "Tipo de origem",
        options: ["meta_ads", "organic", "direct", "referral"],
      },
    ],
  },
  {
    id: "transfer_human",
    name: "Transferencia para Humano",
    description: "Quando o cliente solicita falar com um atendente",
    variables: ["request_text", "current_status"],
  },
  {
    id: "card_created",
    name: "Card Criado",
    description: "Quando um novo card e criado no CRM",
    variables: ["contact_name", "phone", "source_type"],
  },
  {
    id: "tag_added",
    name: "Tag Adicionada",
    description: "Quando uma tag e adicionada ao card",
    variables: ["tag_name", "tag_id"],
    conditions: [
      { field: "tag_id", type: "tag_select", label: "Tag especifica" },
    ],
  },
  {
    id: "card_moved",
    name: "Card Movido",
    description: "Quando um card e movido entre colunas no CRM",
    variables: [
      "from_column_id",
      "from_column_slug",
      "to_column_id",
      "to_column_slug",
    ],
    conditions: [
      {
        field: "from_column_id",
        type: "column_select",
        label: "Coluna de origem",
      },
      {
        field: "to_column_id",
        type: "column_select",
        label: "Coluna de destino",
      },
    ],
  },
  {
    id: "payment_completed",
    name: "Pagamento Concluido",
    description: "Quando um pagamento Stripe e confirmado",
    variables: [
      "amount",
      "currency",
      "stripe_session_id",
      "stripe_payment_intent_id",
      "customer_email",
      "customer_phone",
      "product_name",
      "payment_date",
    ],
  },
  {
    id: "intent_detected",
    name: "Intencao Detectada (LLM)",
    description:
      "Quando o classificador de intencao detecta sinal comercial com confianca suficiente",
    variables: ["intent", "confidence", "message_text"],
    conditions: [
      {
        field: "intent",
        type: "text",
        label: "Intencao esperada",
      },
      {
        field: "confidence_min",
        type: "number",
        label: "Confianca minima",
        default: 0.85,
      },
    ],
  },
  {
    id: "urgency_detected",
    name: "Urgencia Detectada (LLM)",
    description: "Quando a mensagem indica urgencia de atendimento",
    variables: ["urgency_level", "confidence", "message_text"],
    conditions: [
      {
        field: "urgency_level",
        type: "select",
        label: "Nivel de urgencia",
        options: ["high", "medium", "low"],
      },
      {
        field: "confidence_min",
        type: "number",
        label: "Confianca minima",
        default: 0.85,
      },
    ],
  },
];

// Tipos de acoes disponiveis para automacoes CRM
export const AVAILABLE_ACTIONS = [
  {
    id: "move_to_column",
    name: "Mover para Coluna",
    description: "Move o card para uma coluna especifica",
    params: [
      {
        field: "column_id",
        type: "column_select",
        label: "Coluna de destino",
        required: true,
      },
    ],
  },
  {
    id: "add_tag",
    name: "Adicionar Tag",
    description: "Adiciona uma tag ao card",
    params: [
      { field: "tag_id", type: "tag_select", label: "Tag", required: true },
    ],
  },
  {
    id: "remove_tag",
    name: "Remover Tag",
    description: "Remove uma tag do card",
    params: [
      { field: "tag_id", type: "tag_select", label: "Tag", required: true },
    ],
  },
  {
    id: "assign_to",
    name: "Atribuir Responsavel",
    description: "Atribui o card a um usuario",
    params: [
      {
        field: "user_id",
        type: "user_select",
        label: "Responsavel",
        required: true,
      },
    ],
  },
  {
    id: "update_auto_status",
    name: "Atualizar Auto-Status",
    description: "Atualiza o status automatico da conversa",
    params: [
      {
        field: "auto_status",
        type: "select",
        label: "Novo status",
        options: [
          "awaiting_attendant",
          "awaiting_client",
          "neutral",
          "resolved",
          "awaiting_response",
          "in_service",
        ],
        required: true,
      },
    ],
  },
  {
    id: "log_activity",
    name: "Registrar Atividade",
    description: "Adiciona uma atividade ao timeline do card",
    params: [
      {
        field: "activity_type",
        type: "select",
        label: "Tipo",
        options: ["note", "event", "system"],
        required: true,
      },
      {
        field: "content",
        type: "text",
        label: "Conteudo (suporta {{variavel}})",
        required: true,
      },
    ],
  },
  {
    id: "add_note",
    name: "Adicionar Nota",
    description: "Adiciona uma nota automatica ao card",
    params: [
      {
        field: "note_content",
        type: "text",
        label: "Conteudo da nota (suporta {{variavel}})",
        required: true,
      },
    ],
  },
  {
    id: "send_message",
    name: "Enviar Mensagem",
    description: "Envia mensagem automatica no WhatsApp (com politica de 24h)",
    params: [
      {
        field: "message_type",
        type: "select",
        label: "Tipo de mensagem",
        options: ["text", "template"],
        required: true,
      },
      {
        field: "content",
        type: "text",
        label: "Mensagem (suporta {{variavel}})",
      },
      {
        field: "template_id",
        type: "text",
        label: "Template ID (quando tipo=template)",
      },
      {
        field: "template_params",
        type: "text",
        label: "Template params JSON (ex: [\"{{contact_name}}\"])",
      },
      {
        field: "fallback_template_id",
        type: "text",
        label: "Fallback template ID (quando janela 24h fechada)",
      },
    ],
  },
  {
    id: "notify_user",
    name: "Notificar Responsavel",
    description: "Envia push para usuario responsavel ou equipe",
    params: [
      {
        field: "target",
        type: "select",
        label: "Destino da notificacao",
        options: ["assigned_to", "all_admins", "all_active"],
        required: true,
      },
      {
        field: "title",
        type: "text",
        label: "Titulo (suporta {{variavel}})",
      },
      {
        field: "body",
        type: "text",
        label: "Mensagem (suporta {{variavel}})",
      },
      {
        field: "category",
        type: "select",
        label: "Categoria",
        options: ["critical", "important", "normal", "low"],
      },
    ],
  },
];

// Types
export type TriggerType = (typeof AVAILABLE_TRIGGERS)[number]["id"];
export type ActionType = (typeof AVAILABLE_ACTIONS)[number]["id"];
