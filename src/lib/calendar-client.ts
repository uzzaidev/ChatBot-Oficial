/**
 * Calendar Client - Unified Interface & Factory
 *
 * Provides a common interface for Google Calendar and Microsoft Outlook,
 * plus a factory function that auto-selects the connected provider.
 */

import { createServerClient } from "@/lib/supabase-server";
import { getClientCalendarTokens } from "@/lib/vault";

export interface CalendarEvent {
  id: string;
  title: string;
  startDateTime: string; // ISO 8601
  endDateTime: string; // ISO 8601
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface CalendarClient {
  listEvents(start: Date, end: Date): Promise<CalendarEvent[]>;
  createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent>;
  checkAvailability(start: Date, end: Date): Promise<boolean>;
}

/**
 * Factory: get the connected calendar client for a client
 *
 * Priority: Google > Microsoft (if both connected, Google wins)
 * Auto-refresh: handled internally by each provider client
 *
 * @param clientId - UUID of the client
 * @returns CalendarClient instance or null if no calendar connected
 */
export const getCalendarClient = async (
  clientId: string,
): Promise<CalendarClient | null> => {
  const supabase = await createServerClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("google_calendar_enabled, microsoft_calendar_enabled")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    console.error("[CalendarClient] Failed to fetch client:", error);
    return null;
  }

  const tokens = await getClientCalendarTokens(clientId);

  if (client.google_calendar_enabled && tokens.google) {
    const { createGoogleCalendarClient } = await import(
      "@/lib/google-calendar-client"
    );
    return createGoogleCalendarClient(
      clientId,
      tokens.google.accessToken || "",
      tokens.google.refreshToken || "",
    );
  }

  if (client.microsoft_calendar_enabled && tokens.microsoft) {
    const { createMicrosoftCalendarClient } = await import(
      "@/lib/microsoft-calendar-client"
    );
    return createMicrosoftCalendarClient(
      clientId,
      tokens.microsoft.accessToken || "",
      tokens.microsoft.refreshToken || "",
    );
  }

  return null;
};
