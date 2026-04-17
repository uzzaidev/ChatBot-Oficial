export type PolicyState =
  | "discovery"         // sem intenção clara
  | "qualification"     // intenção detectada, slots não iniciados
  | "slot_collection"   // coletando campos obrigatórios
  | "action_ready"      // todos os slots preenchidos
  | "action_execution"  // tool de ação em execução
  | "post_action"       // ação concluída
  | "action_management" // cancelar/remarcar ação existente
  | "support_freeform"  // dúvidas livres sem capability ativa
  | "handoff";          // transferência para humano

export type CapabilityId =
  | "calendar_booking"
  | "lead_qualification"
  | "support_ticket"
  | "document_request"
  | string;

export interface PolicyContext {
  state: PolicyState;
  capability: CapabilityId | null;
  missing_slots: string[];
  collected_slots: string[];
  allowed_tools: string[];
  version: "v2";
  last_updated_at: string;
}

export interface PolicyResolution {
  state: PolicyState;
  capability: CapabilityId | null;
  missing_slots: string[];
  collected_slots: string[];
}
