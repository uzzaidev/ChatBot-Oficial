/**
 * Microsoft Calendar Client
 *
 * Uses direct fetch to Microsoft Graph API. Automatically refreshes access token on 401.
 */

import type { CalendarClient, CalendarEvent } from "@/lib/calendar-client";
import { refreshMicrosoftAccessToken } from "@/lib/microsoft-calendar-oauth";
import { createServerClient } from "@/lib/supabase-server";
import { updateCalendarToken } from "@/lib/vault";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Create a Microsoft Calendar client with auto-refresh capability
 */
export const createMicrosoftCalendarClient = (
  clientId: string,
  accessToken: string,
  refreshToken: string,
): CalendarClient => {
  let currentToken = accessToken;

  /**
   * Refresh the access token and update Vault
   */
  const doRefresh = async (): Promise<void> => {
    const { accessToken: newToken } = await refreshMicrosoftAccessToken(
      refreshToken,
    );

    currentToken = newToken;

    // Update Vault
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("clients")
      .select("microsoft_calendar_token_secret_id")
      .eq("id", clientId)
      .single();

    if (data?.microsoft_calendar_token_secret_id) {
      await updateCalendarToken(
        data.microsoft_calendar_token_secret_id,
        newToken,
      );
    }
  };

  /**
   * Execute a Graph API call with auto-refresh on 401
   */
  const graphFetch = async (
    url: string,
    options?: RequestInit,
  ): Promise<any> => {
    const doFetch = async () => {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        const err = new Error(
          error?.error?.message || `Graph API error: ${res.status}`,
        ) as any;
        err.status = res.status;
        throw err;
      }

      if (res.status === 204) {
        return null;
      }

      const text = await res.text();
      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    };

    try {
      return await doFetch();
    } catch (err: any) {
      if (err?.status === 401) {
        console.log("[MicrosoftCalendar] Token expired, refreshing...");
        await doRefresh();
        return await doFetch();
      }
      throw err;
    }
  };

  const listEvents = async (
    start: Date,
    end: Date,
  ): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      $orderby: "start/dateTime",
      $top: "50",
      $select: "id,subject,start,end,bodyPreview,location,attendees",
    });

    const data = await graphFetch(
      `${GRAPH_BASE}/me/calendarView?${params.toString()}`,
    );

    return (data.value || []).map((event: any) => ({
      id: event.id || "",
      title: event.subject || "(Sem título)",
      startDateTime: event.start?.dateTime ? `${event.start.dateTime}Z` : "",
      endDateTime: event.end?.dateTime ? `${event.end.dateTime}Z` : "",
      description: event.bodyPreview || undefined,
      location: event.location?.displayName || undefined,
      attendees: event.attendees
        ?.map((a: any) => a.emailAddress?.address || "")
        .filter(Boolean),
    }));
  };

  const createEvent = async (
    event: Omit<CalendarEvent, "id">,
  ): Promise<CalendarEvent> => {
    const body = {
      subject: event.title,
      body: event.description
        ? { contentType: "Text", content: event.description }
        : undefined,
      start: { dateTime: event.startDateTime, timeZone: "UTC" },
      end: { dateTime: event.endDateTime, timeZone: "UTC" },
      location: event.location ? { displayName: event.location } : undefined,
      attendees: event.attendees?.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      })),
    };

    const data = await graphFetch(`${GRAPH_BASE}/me/events`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      id: data.id || "",
      title: data.subject || event.title,
      startDateTime: data.start?.dateTime
        ? `${data.start.dateTime}Z`
        : event.startDateTime,
      endDateTime: data.end?.dateTime
        ? `${data.end.dateTime}Z`
        : event.endDateTime,
      description: data.bodyPreview || event.description,
      location: data.location?.displayName || event.location,
      attendees: data.attendees
        ?.map((a: any) => a.emailAddress?.address || "")
        .filter(Boolean),
    };
  };

  const updateEvent = async (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, "id">>,
  ): Promise<CalendarEvent> => {
    const body: Record<string, any> = {};
    if (updates.title !== undefined) body.subject = updates.title;
    if (updates.description !== undefined) body.body = { contentType: "Text", content: updates.description };
    if (updates.location !== undefined) body.location = { displayName: updates.location };
    if (updates.startDateTime !== undefined) body.start = { dateTime: updates.startDateTime, timeZone: "UTC" };
    if (updates.endDateTime !== undefined) body.end = { dateTime: updates.endDateTime, timeZone: "UTC" };
    if (updates.attendees !== undefined) {
      body.attendees = updates.attendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      }));
    }

    const data = await graphFetch(`${GRAPH_BASE}/me/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return {
      id: data.id || eventId,
      title: data.subject || updates.title || "",
      startDateTime: data.start?.dateTime ? `${data.start.dateTime}Z` : updates.startDateTime || "",
      endDateTime: data.end?.dateTime ? `${data.end.dateTime}Z` : updates.endDateTime || "",
      description: data.bodyPreview || updates.description,
      location: data.location?.displayName || updates.location,
      attendees: data.attendees?.map((a: any) => a.emailAddress?.address || "").filter(Boolean),
    };
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    await graphFetch(`${GRAPH_BASE}/me/events/${eventId}`, {
      method: "DELETE",
    });
  };

  const checkAvailability = async (
    start: Date,
    end: Date,
  ): Promise<boolean> => {
    // Use calendarView to check for events in the time range
    const events = await listEvents(start, end);
    return events.length === 0;
  };

  return { listEvents, createEvent, updateEvent, deleteEvent, checkAvailability };
};
