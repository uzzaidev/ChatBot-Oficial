// Interactive Flows Type Definitions
// Phase 2 - Data Structure

export type FlowBlockType =
  | 'start' | 'message' | 'interactive_list' | 'interactive_buttons'
  | 'condition' | 'action' | 'ai_handoff' | 'human_handoff'
  | 'delay' | 'webhook' | 'end';

export type TriggerType = 'keyword' | 'qr_code' | 'link' | 'manual' | 'always';

export type FlowExecutionStatus = 'active' | 'completed' | 'paused' | 'transferred_ai' | 'transferred_human';

export interface InteractiveFlow {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: TriggerType;
  triggerKeywords?: string[];
  triggerQrCode?: string;
  blocks: FlowBlock[];
  edges: FlowEdge[];
  startBlockId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowBlock {
  id: string;
  type: FlowBlockType;
  position: { x: number; y: number };
  data: FlowBlockData;
}

export interface FlowBlockData {
  label?: string;
  messageText?: string;
  listHeader?: string;
  listBody?: string;
  listFooter?: string;
  listButtonText?: string;
  listSections?: ListSection[];
  buttonsBody?: string;
  buttonsFooter?: string;
  buttons?: ReplyButton[];
  conditions?: Condition[];
  defaultNextBlockId?: string;
  actionType?: 'add_tag' | 'remove_tag' | 'set_variable' | 'increment';
  actionParams?: Record<string, any>;
  delaySeconds?: number;
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
  webhookHeaders?: Record<string, string>;
  webhookBody?: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: 'default' | 'conditional';
}

export interface ListSection {
  id: string;
  title: string;
  rows: ListRow[];
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
  nextBlockId: string;
}

export interface ReplyButton {
  id: string;
  title: string;
  nextBlockId: string;
}

export interface Condition {
  variable: string;
  operator: '==' | '!=' | '>' | '<' | 'contains' | 'not_contains';
  value: string | number;
  nextBlockId: string;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  clientId: string;
  phone: string;
  currentBlockId: string;
  variables: Record<string, any>;
  history: FlowStep[];
  status: FlowExecutionStatus;
  startedAt: Date;
  lastStepAt: Date;
  completedAt?: Date;
}

export interface FlowStep {
  blockId: string;
  blockType: FlowBlockType;
  executedAt: Date;
  userResponse?: string;
  interactiveResponseId?: string;
  nextBlockId?: string;
}

export interface ParsedInteractiveResponse {
  type: 'button_reply' | 'list_reply';
  id: string;
  title: string;
  description?: string;
  from: string;
}

export interface InteractiveFlowDB {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_keywords: string[] | null;
  trigger_qr_code: string | null;
  blocks: FlowBlock[];
  edges: FlowEdge[];
  start_block_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlowExecutionDB {
  id: string;
  flow_id: string;
  client_id: string;
  phone: string;
  current_block_id: string;
  variables: Record<string, any>;
  history: FlowStep[];
  status: FlowExecutionStatus;
  started_at: string;
  last_step_at: string;
  completed_at: string | null;
}

export interface CreateFlowRequest {
  name: string;
  description?: string;
  triggerType: TriggerType;
  triggerKeywords?: string[];
  triggerQrCode?: string;
  blocks: FlowBlock[];
  edges: FlowEdge[];
  startBlockId: string;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  triggerType?: TriggerType;
  triggerKeywords?: string[];
  triggerQrCode?: string;
  blocks?: FlowBlock[];
  edges?: FlowEdge[];
  startBlockId?: string;
}

export interface FlowResponse {
  flow: InteractiveFlow;
}

export interface FlowListResponse {
  flows: InteractiveFlow[];
  total: number;
}

export interface FlowValidationError {
  field: string;
  message: string;
  value?: any;
}

export const isFlowBlockType = (value: string): value is FlowBlockType => {
  return ['start', 'message', 'interactive_list', 'interactive_buttons',
          'condition', 'action', 'ai_handoff', 'human_handoff',
          'delay', 'webhook', 'end'].includes(value);
};

export const isTriggerType = (value: string): value is TriggerType => {
  return ['keyword', 'qr_code', 'link', 'manual', 'always'].includes(value);
};

export const isFlowExecutionStatus = (value: string): value is FlowExecutionStatus => {
  return ['active', 'completed', 'paused', 'transferred_ai', 'transferred_human'].includes(value);
};

export const INTERACTIVE_MESSAGE_LIMITS = {
  BUTTONS: {
    MAX_COUNT: 3,
    MAX_TITLE_LENGTH: 20,
    MAX_BODY_LENGTH: 1024,
    MAX_FOOTER_LENGTH: 60
  },
  LIST: {
    MAX_SECTIONS: 10,
    MAX_ROWS_PER_SECTION: 10,
    MAX_TOTAL_ROWS: 100,
    MAX_HEADER_LENGTH: 60,
    MAX_BODY_LENGTH: 1024,
    MAX_FOOTER_LENGTH: 60,
    MAX_BUTTON_TEXT_LENGTH: 20,
    MAX_SECTION_TITLE_LENGTH: 24,
    MAX_ROW_TITLE_LENGTH: 24,
    MAX_ROW_DESCRIPTION_LENGTH: 72
  }
} as const;

export const FLOW_DEFAULTS = {
  IS_ACTIVE: true,
  TRIGGER_TYPE: 'keyword' as TriggerType,
  EXECUTION_STATUS: 'active' as FlowExecutionStatus
} as const;
