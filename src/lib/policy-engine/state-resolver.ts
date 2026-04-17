import { ClientConfig, ContactMetadata } from "@/lib/types";
import { PolicyResolution, PolicyState } from "./types";
import { checkSlotsFilled, getCollectedSlots, getMissingSlots } from "./slot-manager";

const HANDOFF_KEYWORDS = [
  "atendente",
  "humano",
  "pessoa real",
  "falar com alguém",
  "falar com uma pessoa",
  "quero falar com",
];

const ACTION_MANAGEMENT_KEYWORDS = [
  "cancelar",
  "desmarcar",
  "remarcar",
  "reagendar",
  "mudar horário",
  "trocar horário",
];

const CALENDAR_BOOKING_KEYWORDS = [
  "quero agendar",
  "pode marcar",
  "quero marcar",
  "agendar uma visita",
  "marcar uma visita",
  "fazer uma visita",
  "quero conhecer",
  "quero visitar",
];

const matchesKeywords = (text: string, keywords: string[]): boolean => {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
};

export const resolvePolicy = (
  lastMessage: string,
  clientConfig: ClientConfig,
  contactMetadata: ContactMetadata | null | undefined,
): PolicyResolution => {
  if (!clientConfig.agentV2?.enabled) {
    return {
      state: "discovery",
      capability: null,
      missing_slots: [],
      collected_slots: [],
    };
  }

  // P1: handoff triggers
  if (matchesKeywords(lastMessage, HANDOFF_KEYWORDS)) {
    return { state: "handoff", capability: null, missing_slots: [], collected_slots: [] };
  }

  // P2: action management (cancel/reschedule)
  if (matchesKeywords(lastMessage, ACTION_MANAGEMENT_KEYWORDS)) {
    return {
      state: "action_management",
      capability: "calendar_booking",
      missing_slots: [],
      collected_slots: [],
    };
  }

  // P3: calendar booking capability
  if (
    clientConfig.agentV2.requireSlotsForCalendar &&
    (matchesKeywords(lastMessage, CALENDAR_BOOKING_KEYWORDS) ||
      (clientConfig.agentV2.calendarRequiredSlots?.length ?? 0) > 0)
  ) {
    const requiredSlots = clientConfig.agentV2.calendarRequiredSlots ?? [];
    const missing = getMissingSlots(contactMetadata, requiredSlots);
    const collected = getCollectedSlots(contactMetadata, requiredSlots);
    const allFilled = checkSlotsFilled(contactMetadata, requiredSlots);

    let state: PolicyState;
    if (allFilled) {
      state = "action_ready";
    } else if (collected.length > 0) {
      state = "slot_collection";
    } else {
      state = "qualification";
    }

    return { state, capability: "calendar_booking", missing_slots: missing, collected_slots: collected };
  }

  return {
    state: "discovery",
    capability: null,
    missing_slots: [],
    collected_slots: [],
  };
};

export const buildPolicyContext = (resolution: PolicyResolution) => ({
  state: resolution.state,
  capability: resolution.capability,
  missing_slots: resolution.missing_slots,
  collected_slots: resolution.collected_slots,
  allowed_tools: [] as string[],
  version: "v2" as const,
  last_updated_at: new Date().toISOString(),
});
