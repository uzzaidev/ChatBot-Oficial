/**
 * Calendar Tool Call Handler
 *
 * Processes AI tool calls for calendar operations:
 * - verificar_agenda: check availability or list events
 * - criar_evento_agenda: create a new calendar event
 * - cancelar_evento_agenda: cancel/delete an existing event
 */

import type { CalendarEvent } from "@/lib/calendar-client";
import { getCalendarClient } from "@/lib/calendar-client";
import { saveChatMessage } from "@/nodes/saveChatMessage";

interface CalendarToolContext {
  contactName?: string;
  contactPhone?: string;
}

/**
 * Handle a calendar-related tool call from the AI
 *
 * @param toolName - 'verificar_agenda' | 'criar_evento_agenda' | 'cancelar_evento_agenda'
 * @param toolArgs - Parsed arguments from the AI tool call
 * @param clientId - UUID of the client
 * @returns Message in pt-BR to send back to the user
 */
export const handleCalendarToolCall = async (
  toolName: string,
  toolArgs: Record<string, any>,
  clientId: string,
  context?: CalendarToolContext,
): Promise<string> => {
  const calendarClient = await getCalendarClient(clientId);

  if (!calendarClient) {
    return "Calendário não conectado. Peça ao administrador para conectar o Google Calendar ou Microsoft Outlook no painel em /dashboard/calendar.";
  }

  if (toolName === "verificar_agenda") {
    return await handleVerificarAgenda(calendarClient, toolArgs);
  }

  if (toolName === "criar_evento_agenda") {
    return await handleCriarEvento(calendarClient, toolArgs, clientId, context);
  }

  if (toolName === "alterar_evento_agenda") {
    return await handleAlterarEvento(calendarClient, toolArgs);
  }

  if (toolName === "cancelar_evento_agenda") {
    return await handleCancelarEvento(calendarClient, toolArgs);
  }

  return `Ferramenta de calendário desconhecida: ${toolName}`;
};

const handleVerificarAgenda = async (
  client: Awaited<ReturnType<typeof getCalendarClient>> & {},
  args: Record<string, any>,
): Promise<string> => {
  const { tipo, data_inicio, data_fim } = args;
  const start = new Date(data_inicio);
  const end = new Date(data_fim);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "Datas inválidas fornecidas. Use formato ISO 8601 (ex: 2025-03-10T09:00:00-03:00).";
  }

  if (tipo === "horarios_livres") {
    const isFree = await client.checkAvailability(start, end);

    if (isFree) {
      return `✅ O período de ${formatDateTime(start)} até ${formatDateTime(
        end,
      )} está livre na agenda.`;
    }

    // Period is busy — find nearby free slots to suggest
    const searchStart = new Date(start);
    searchStart.setHours(8, 0, 0, 0);
    const searchEnd = new Date(start);
    searchEnd.setHours(18, 0, 0, 0);
    const durationMs = end.getTime() - start.getTime();
    const freeSlots = await findFreeSlots(
      client,
      searchStart,
      searchEnd,
      durationMs,
    );

    let response = `❌ Esse horário já está ocupado.`;

    if (freeSlots.length > 0) {
      const suggestions = freeSlots
        .slice(0, 3)
        .map(
          (slot) =>
            `   • ${formatDateTime(slot.start)} até ${formatDateTime(
              slot.end,
            )}`,
        )
        .join("\n");
      response += `\n\n📋 Horários livres mais próximos nesse dia:\n${suggestions}`;
    } else {
      response += `\n\nNão há horários disponíveis nesse dia no horário comercial (08h-18h).`;
    }

    return response;
  }

  if (tipo === "eventos_existentes") {
    const events = await client.listEvents(start, end);

    if (events.length === 0) {
      return `📅 Nenhum compromisso encontrado entre ${formatDateTime(
        start,
      )} e ${formatDateTime(end)}. A agenda está livre nesse período!`;
    }

    // Show only busy/free blocks, never event names or details
    const busyBlocks = formatBusyBlocks(events);
    const freeBlocks = findFreeBlocksInRange(events, start, end);
    let response = `📅 Existem ${
      events.length
    } compromisso(s) entre ${formatDateTime(start)} e ${formatDateTime(end)}.`;
    response += `\n\n🔴 Horários ocupados:\n${busyBlocks}`;
    if (freeBlocks.length > 0) {
      const freeList = freeBlocks
        .map(
          (b) => `   • ${formatDateTime(b.start)} até ${formatDateTime(b.end)}`,
        )
        .join("\n");
      response += `\n\n🟢 Horários livres:\n${freeList}`;
    }
    return response;
  }

  return 'Tipo de verificação inválido. Use "horarios_livres" ou "eventos_existentes".';
};

const handleCriarEvento = async (
  client: Awaited<ReturnType<typeof getCalendarClient>> & {},
  args: Record<string, any>,
  clientId: string,
  context?: CalendarToolContext,
): Promise<string> => {
  const {
    titulo,
    data_hora_inicio,
    data_hora_fim,
    descricao,
    email_participante,
  } = args;

  const startDate = new Date(data_hora_inicio);
  const endDate = new Date(data_hora_fim);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return "Datas inválidas fornecidas. Use formato ISO 8601 (ex: 2025-03-10T10:00:00-03:00).";
  }

  const contactName = sanitizeContactName(context?.contactName);
  const contactPhone = normalizeContactPhone(context?.contactPhone);

  const newEvent: Omit<CalendarEvent, "id"> = {
    title: buildEventTitle(titulo, contactName),
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    description: buildEventDescription(descricao, contactPhone),
    attendees: email_participante ? [email_participante] : undefined,
  };

  const duplicate = await findDuplicateEvent(client, newEvent);
  if (duplicate) {
    const duplicateStart = new Date(duplicate.startDateTime);
    const duplicateEnd = new Date(duplicate.endDateTime);
    return `ℹ️ Já existe um evento semelhante para este contato nesse horário.\n\n📌 *${
      duplicate.title
    }*\n📅 ${formatEventRange(duplicateStart, duplicateEnd)}`;
  }

  const created = await client.createEvent(newEvent);

  await saveCalendarEventSystemMessage(
    clientId,
    context?.contactPhone,
    created,
  );

  const createdStart = new Date(created.startDateTime);
  const createdEnd = new Date(created.endDateTime);

  // Mensagem de confirmação ao usuário — apenas dados relevantes para ele.
  // Descrição interna (contato, WhatsApp) e lista de convidados ficam no calendário, não na mensagem.
  const response = `✅ Evento criado com sucesso!\n\n📌 ${
    created.title
  }\n📅 ${formatEventRange(createdStart, createdEnd)}`;

  return response;
};

// Tolerance for exact-time duplicate: ±30 min
const DUPLICATE_TIME_TOLERANCE_MS = 30 * 60 * 1000;
// Wider same-day search: ±12h (catches Google Calendar eventual consistency lag)
const DUPLICATE_DAY_TOLERANCE_MS = 12 * 60 * 60 * 1000;

const findDuplicateEvent = async (
  client: Awaited<ReturnType<typeof getCalendarClient>> & {},
  event: Omit<CalendarEvent, "id">,
): Promise<CalendarEvent | null> => {
  const startMs = new Date(event.startDateTime).getTime();
  const endMs = new Date(event.endDateTime).getTime();

  // Search a full-day window to survive eventual consistency lag
  const windowStart = new Date(startMs - DUPLICATE_DAY_TOLERANCE_MS);
  const windowEnd = new Date(endMs + DUPLICATE_DAY_TOLERANCE_MS);
  const existingEvents = await client.listEvents(windowStart, windowEnd);

  // First pass: exact time match (±30 min) + title match
  const exactMatch = existingEvents.find((candidate) => {
    const candidateStart = new Date(candidate.startDateTime).getTime();
    const candidateEnd = new Date(candidate.endDateTime).getTime();

    const sameTitle = isTitleMatch(candidate.title, event.title);
    const sameStart = Math.abs(candidateStart - startMs) <= DUPLICATE_TIME_TOLERANCE_MS;
    const sameEnd = Math.abs(candidateEnd - endMs) <= DUPLICATE_TIME_TOLERANCE_MS;

    return sameTitle && sameStart && sameEnd;
  });

  if (exactMatch) return exactMatch;

  // Second pass: same contact phone in description on the same day (catches renamed duplicates)
  const phoneInNewEvent = extractPhoneFromDescription(event.description);
  if (phoneInNewEvent) {
    const phoneMatch = existingEvents.find((candidate) => {
      const samePhone = candidate.description?.includes(phoneInNewEvent);
      const candidateStart = new Date(candidate.startDateTime).getTime();
      const sameDay = Math.abs(candidateStart - startMs) <= DUPLICATE_DAY_TOLERANCE_MS;
      return samePhone && sameDay;
    });
    if (phoneMatch) return phoneMatch;
  }

  return null;
};

const extractPhoneFromDescription = (description: string | undefined): string | null => {
  if (!description) return null;
  const match = description.match(/\+\d{10,15}/);
  return match ? match[0] : null;
};

const saveCalendarEventSystemMessage = async (
  clientId: string,
  phone: string | undefined,
  event: CalendarEvent,
): Promise<void> => {
  if (!phone) {
    return;
  }

  const systemLine = `[SISTEMA] Evento agendado: ${event.title} em ${event.startDateTime}. ID: ${event.id}`;

  try {
    await saveChatMessage({
      phone,
      message: systemLine,
      type: "system",
      clientId,
      status: "sent",
    });
  } catch (error) {
    console.warn(
      "[Calendar] Failed to save system event marker to chat history:",
      error,
    );
  }
};

const handleAlterarEvento = async (
  client: Awaited<ReturnType<typeof getCalendarClient>> & {},
  args: Record<string, any>,
): Promise<string> => {
  const eventId = typeof args.event_id === "string" ? args.event_id.trim() : "";

  if (!eventId) {
    return "Para alterar um evento preciso do ID. Verifique o histórico da conversa por '[SISTEMA] Evento agendado' para obter o ID.";
  }

  const updates: Record<string, string> = {};
  if (typeof args.novo_titulo === "string" && args.novo_titulo.trim()) {
    updates.title = args.novo_titulo.trim();
  }

  const newStart = parseIsoDateArg(args.nova_data_hora_inicio);
  const newEnd = parseIsoDateArg(args.nova_data_hora_fim);

  if (args.nova_data_hora_inicio && !newStart) {
    return "Data/hora de início inválida. Use formato ISO 8601 (ex: 2025-03-10T10:00:00-03:00).";
  }
  if (args.nova_data_hora_fim && !newEnd) {
    return "Data/hora de fim inválida. Use formato ISO 8601 (ex: 2025-03-10T11:00:00-03:00).";
  }

  if (newStart) updates.startDateTime = newStart.toISOString();
  if (newEnd) updates.endDateTime = newEnd.toISOString();

  if (Object.keys(updates).length === 0) {
    return "Nenhuma alteração fornecida. Informe o novo título, data ou horário.";
  }

  try {
    const updated = await client.updateEvent(eventId, updates);
    const updatedStart = new Date(updated.startDateTime);
    const updatedEnd = new Date(updated.endDateTime);
    return `✅ Compromisso atualizado com sucesso!\n\n📌 ${updated.title}\n📅 ${formatEventRange(updatedStart, updatedEnd)}`;
  } catch (error: any) {
    const message = error?.message || "erro desconhecido";
    return `Não consegui alterar o evento (${message}). Verifique se o ID está correto ou tente cancelar e criar um novo.`;
  }
};

const CANCEL_SEARCH_BUFFER_MS = 24 * 60 * 60 * 1000; // 24h
const CANCEL_DEFAULT_PAST_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CANCEL_DEFAULT_FUTURE_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

const handleCancelarEvento = async (
  client: Awaited<ReturnType<typeof getCalendarClient>> & {},
  args: Record<string, any>,
): Promise<string> => {
  // ── Bulk cancel: array of IDs (user confirmed from a numbered list) ──────
  const eventIds: string[] = Array.isArray(args.event_ids)
    ? args.event_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (eventIds.length > 0) {
    const results = await Promise.allSettled(
      eventIds.map((id) => client.deleteEvent(id.trim())),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      return `✅ ${succeeded} compromisso(s) cancelado(s) com sucesso.`;
    }
    return `✅ ${succeeded} cancelado(s). ❌ ${failed} não foi possível cancelar (ID inválido ou já removido).`;
  }

  // ── Single cancel by event_id ─────────────────────────────────────────────
  const eventId = typeof args.event_id === "string" ? args.event_id.trim() : "";
  const title = typeof args.titulo === "string" ? args.titulo.trim() : "";
  const startRef = parseIsoDateArg(args.data_inicio);
  const endRef = parseIsoDateArg(args.data_fim);

  if (args.data_inicio && !startRef) {
    return "Data de início inválida. Use formato ISO 8601 (ex: 2025-03-10T10:00:00-03:00).";
  }

  if (args.data_fim && !endRef) {
    return "Data de fim inválida. Use formato ISO 8601 (ex: 2025-03-10T11:00:00-03:00).";
  }

  if (eventId) {
    try {
      await client.deleteEvent(eventId);
      return "✅ Compromisso cancelado com sucesso na agenda.";
    } catch (error: any) {
      const message = error?.message || "erro desconhecido";
      return `Não consegui cancelar pelo ID informado (${message}). Tente informar também título e horário do compromisso.`;
    }
  }

  if (!title && !startRef && !endRef) {
    return "Para cancelar, preciso de pelo menos um identificador: event_id, event_ids, título ou data/hora do compromisso.";
  }

  // ── Search candidates ─────────────────────────────────────────────────────
  const { searchStart, searchEnd } = buildCancelSearchWindow(startRef, endRef);
  const allEvents = await client.listEvents(searchStart, searchEnd);

  if (allEvents.length === 0) {
    return "Não encontrei compromissos nesse período para cancelar.";
  }

  const filteredByTitle = title
    ? allEvents.filter((event) => isTitleMatch(event.title, title))
    : allEvents;

  let candidates = filteredByTitle;

  if (startRef) {
    const targetStartMs = startRef.getTime();
    candidates = candidates.filter((event) => {
      const eventStartMs = new Date(event.startDateTime).getTime();
      return (
        Number.isFinite(eventStartMs) &&
        Math.abs(eventStartMs - targetStartMs) <= CANCEL_SEARCH_BUFFER_MS
      );
    });
  }

  if (endRef) {
    const targetEndMs = endRef.getTime();
    candidates = candidates.filter((event) => {
      const eventEndMs = new Date(event.endDateTime).getTime();
      return (
        Number.isFinite(eventEndMs) &&
        Math.abs(eventEndMs - targetEndMs) <= CANCEL_SEARCH_BUFFER_MS
      );
    });
  }

  if (candidates.length === 0) {
    return "Não encontrei um compromisso correspondente para cancelar com os dados informados.";
  }

  // ── Single unambiguous match ──────────────────────────────────────────────
  const chosen = chooseBestCandidate(candidates, {
    title: title || undefined,
    startRef: startRef || undefined,
    endRef: endRef || undefined,
  });

  if (chosen) {
    await client.deleteEvent(chosen.id);
    const chosenStart = new Date(chosen.startDateTime);
    const chosenEnd = new Date(chosen.endDateTime);
    return `✅ Compromisso cancelado com sucesso!\n\n📌 ${chosen.title}\n📅 ${formatEventRange(chosenStart, chosenEnd)}`;
  }

  // ── Multiple candidates — return numbered list with IDs so AI can bulk-cancel ──
  const list = candidates.slice(0, 5);
  const numbered = list
    .map((event, idx) => {
      const start = new Date(event.startDateTime);
      const end = new Date(event.endDateTime);
      return `${idx + 1}. ${event.title} — ${formatEventRange(start, end)}`;
    })
    .join("\n");

  // Machine-readable ID map the AI uses to build event_ids[] on next call
  const idMap = list
    .map((event, idx) => `${idx + 1}=${event.id}`)
    .join(", ");

  return (
    `Encontrei ${list.length} compromissos possíveis. ` +
    `Responda com os números a cancelar (ex: "1, 3") ou "todos":\n\n` +
    `${numbered}\n\n` +
    `[IDs: ${idMap}]`
  );
};

const parseIsoDateArg = (value: unknown): Date | null => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const buildCancelSearchWindow = (startRef: Date | null, endRef: Date | null) => {
  const now = Date.now();

  if (startRef && endRef) {
    return {
      searchStart: new Date(startRef.getTime() - CANCEL_SEARCH_BUFFER_MS),
      searchEnd: new Date(endRef.getTime() + CANCEL_SEARCH_BUFFER_MS),
    };
  }

  if (startRef) {
    return {
      searchStart: new Date(startRef.getTime() - CANCEL_SEARCH_BUFFER_MS),
      searchEnd: new Date(startRef.getTime() + CANCEL_SEARCH_BUFFER_MS),
    };
  }

  if (endRef) {
    return {
      searchStart: new Date(endRef.getTime() - CANCEL_SEARCH_BUFFER_MS),
      searchEnd: new Date(endRef.getTime() + CANCEL_SEARCH_BUFFER_MS),
    };
  }

  return {
    searchStart: new Date(now - CANCEL_DEFAULT_PAST_MS),
    searchEnd: new Date(now + CANCEL_DEFAULT_FUTURE_MS),
  };
};

const normalizeForMatch = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isTitleMatch = (eventTitle: string, wantedTitle: string): boolean => {
  const normalizedEvent = normalizeForMatch(eventTitle || "");
  const normalizedWanted = normalizeForMatch(wantedTitle || "");

  if (!normalizedWanted) return true;
  if (!normalizedEvent) return false;

  return (
    normalizedEvent === normalizedWanted ||
    normalizedEvent.includes(normalizedWanted) ||
    normalizedWanted.includes(normalizedEvent)
  );
};

const chooseBestCandidate = (
  candidates: CalendarEvent[],
  criteria: { title?: string; startRef?: Date; endRef?: Date },
): CalendarEvent | null => {
  if (candidates.length === 1) return candidates[0];

  const ranked = candidates
    .map((event) => {
      let score = 0;
      let proximityMs = Number.MAX_SAFE_INTEGER;

      if (criteria.title) {
        const normalizedEvent = normalizeForMatch(event.title || "");
        const normalizedWanted = normalizeForMatch(criteria.title);

        if (normalizedEvent === normalizedWanted) {
          score += 6;
        } else if (normalizedEvent.includes(normalizedWanted)) {
          score += 4;
        }
      }

      if (criteria.startRef) {
        const eventStartMs = new Date(event.startDateTime).getTime();
        const diff = Math.abs(eventStartMs - criteria.startRef.getTime());
        proximityMs = Math.min(proximityMs, diff);
        if (diff <= 5 * 60 * 1000) score += 6;
        else if (diff <= 30 * 60 * 1000) score += 4;
        else if (diff <= 2 * 60 * 60 * 1000) score += 2;
      }

      if (criteria.endRef) {
        const eventEndMs = new Date(event.endDateTime).getTime();
        const diff = Math.abs(eventEndMs - criteria.endRef.getTime());
        proximityMs = Math.min(proximityMs, diff);
        if (diff <= 5 * 60 * 1000) score += 3;
        else if (diff <= 30 * 60 * 1000) score += 2;
        else if (diff <= 2 * 60 * 60 * 1000) score += 1;
      }

      return { event, score, proximityMs };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.proximityMs - b.proximityMs;
    });

  const best = ranked[0];
  const second = ranked[1];

  if (!best) return null;
  if (best.score <= 0) return null;
  if (second && second.score === best.score && second.proximityMs === best.proximityMs) {
    return null;
  }

  return best.event;
};

const sanitizeContactName = (name?: string): string | null => {
  if (!name) return null;
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;

  // Ignore values that look like raw phone numbers.
  if (/^\+?\d[\d\s()-]{6,}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
};

const normalizeContactPhone = (phone?: string): string | null => {
  if (!phone) return null;
  const cleaned = phone.trim();
  if (!cleaned) return null;

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (!digitsOnly) return null;

  return `+${digitsOnly}`;
};

const buildEventTitle = (
  baseTitle: string,
  contactName: string | null,
): string => {
  const safeBase = (baseTitle || "Agendamento").trim();
  if (!contactName) return safeBase;

  const lowerBase = safeBase.toLowerCase();
  const lowerName = contactName.toLowerCase();
  if (lowerBase.includes(lowerName)) return safeBase;

  return `${safeBase} - ${contactName}`;
};

const buildEventDescription = (
  baseDescription: string | undefined,
  contactPhone: string | null,
): string | undefined => {
  const trimmedBase = baseDescription?.trim();
  if (!contactPhone) return trimmedBase || undefined;

  const phoneLine = `Contato (WhatsApp): ${contactPhone}`;

  // Avoid duplicate phone markers if AI already included it.
  if (trimmedBase && trimmedBase.includes(contactPhone)) {
    return trimmedBase;
  }

  if (!trimmedBase) {
    return phoneLine;
  }

  return `${trimmedBase}\n\n${phoneLine}`;
};

const formatDateTime = (date: Date): string => {
  return date.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
};

const CALENDAR_TZ = "America/Sao_Paulo";

const formatEventRange = (start: Date, end: Date): string => {
  const startDateKey = start.toLocaleDateString("en-CA", {
    timeZone: CALENDAR_TZ,
  });
  const endDateKey = end.toLocaleDateString("en-CA", {
    timeZone: CALENDAR_TZ,
  });

  const startTime = start.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CALENDAR_TZ,
  });
  const endTime = end.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CALENDAR_TZ,
  });

  // Common case: start and end on the same day.
  if (startDateKey === endDateKey) {
    const dayLabel = start
      .toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        timeZone: CALENDAR_TZ,
      })
      .replace(/\./g, "")
      .replace(",", "")
      .replace(/\s+/g, " ")
      .trim();

    return `${dayLabel} - ${startTime} - ${endTime}`;
  }

  // Exceptional case: event spans different days.
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
};

/**
 * Show only busy time blocks — never reveal event titles, descriptions, or locations
 */
const formatBusyBlocks = (events: CalendarEvent[]): string => {
  return events
    .map((event, idx) => {
      const start = formatDateTime(new Date(event.startDateTime));
      const end = formatDateTime(new Date(event.endDateTime));
      return `   ${idx + 1}. 🔴 Ocupado: ${start} - ${end}`;
    })
    .join("\n");
};

/**
 * Find free blocks between events within a given range
 */
const findFreeBlocksInRange = (
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): Array<{ start: Date; end: Date }> => {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );

  const freeBlocks: Array<{ start: Date; end: Date }> = [];
  let cursor = rangeStart;

  for (const event of sorted) {
    const evStart = new Date(event.startDateTime);
    const evEnd = new Date(event.endDateTime);
    if (evStart > cursor) {
      freeBlocks.push({ start: new Date(cursor), end: new Date(evStart) });
    }
    if (evEnd > cursor) {
      cursor = evEnd;
    }
  }

  if (cursor < rangeEnd) {
    freeBlocks.push({ start: new Date(cursor), end: new Date(rangeEnd) });
  }

  return freeBlocks;
};

/**
 * Find free slots of a specific duration within a time range
 */
const findFreeSlots = async (
  client: Awaited<ReturnType<typeof getCalendarClient>> & {},
  searchStart: Date,
  searchEnd: Date,
  durationMs: number,
): Promise<Array<{ start: Date; end: Date }>> => {
  const events = await client.listEvents(searchStart, searchEnd);
  const freeBlocks = findFreeBlocksInRange(events, searchStart, searchEnd);

  const slots: Array<{ start: Date; end: Date }> = [];
  for (const block of freeBlocks) {
    const blockDuration = block.end.getTime() - block.start.getTime();
    if (blockDuration >= durationMs) {
      slots.push({
        start: block.start,
        end: new Date(block.start.getTime() + durationMs),
      });
    }
  }
  return slots;
};

