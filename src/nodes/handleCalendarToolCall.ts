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

    // Get events to show what's blocking
    const events = await client.listEvents(start, end);
    const eventList = formatEventList(events);
    return `❌ O período NÃO está livre. Existem ${events.length} compromisso(s):\n\n${eventList}`;
  }

  if (tipo === "eventos_existentes") {
    const events = await client.listEvents(start, end);

    if (events.length === 0) {
      return `📅 Nenhum compromisso encontrado entre ${formatDateTime(
        start,
      )} e ${formatDateTime(end)}.`;
    }

    const eventList = formatEventList(events);
    return `📅 ${events.length} compromisso(s) encontrado(s):\n\n${eventList}`;
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

const formatEventList = (events: CalendarEvent[]): string => {
  return events
    .map((event, idx) => {
      const start = formatDateTime(new Date(event.startDateTime));
      const end = formatDateTime(new Date(event.endDateTime));
      let line = `${idx + 1}. *${event.title}*\n   📅 ${start} - ${end}`;
      if (event.location) {
        line += `\n   📍 ${event.location}`;
      }
      return line;
    })
    .join("\n\n");
};
