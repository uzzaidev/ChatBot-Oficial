/**
 * Calendar Tool Call Handler
 *
 * Processes AI tool calls for calendar operations:
 * - verificar_agenda: check availability or list events
 * - criar_evento_agenda: create a new calendar event
 */

import type { CalendarEvent } from "@/lib/calendar-client";
import { getCalendarClient } from "@/lib/calendar-client";

/**
 * Handle a calendar-related tool call from the AI
 *
 * @param toolName - 'verificar_agenda' or 'criar_evento_agenda'
 * @param toolArgs - Parsed arguments from the AI tool call
 * @param clientId - UUID of the client
 * @returns Message in pt-BR to send back to the user
 */
export const handleCalendarToolCall = async (
  toolName: string,
  toolArgs: Record<string, any>,
  clientId: string,
): Promise<string> => {
  const calendarClient = await getCalendarClient(clientId);

  if (!calendarClient) {
    return "Calendário não conectado. Peça ao administrador para conectar o Google Calendar ou Microsoft Outlook no painel em /dashboard/calendar.";
  }

  if (toolName === "verificar_agenda") {
    return await handleVerificarAgenda(calendarClient, toolArgs);
  }

  if (toolName === "criar_evento_agenda") {
    return await handleCriarEvento(calendarClient, toolArgs);
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

  const newEvent: Omit<CalendarEvent, "id"> = {
    title: titulo,
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    description: descricao || undefined,
    attendees: email_participante ? [email_participante] : undefined,
  };

  const created = await client.createEvent(newEvent);

  let response = `✅ Evento criado com sucesso!\n\n📌 *${
    created.title
  }*\n📅 ${formatDateTime(new Date(created.startDateTime))} - ${formatDateTime(
    new Date(created.endDateTime),
  )}`;

  if (created.description) {
    response += `\n📝 ${created.description}`;
  }

  if (created.attendees && created.attendees.length > 0) {
    response += `\n👥 Convidado(s): ${created.attendees.join(", ")}`;
  }

  return response;
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
