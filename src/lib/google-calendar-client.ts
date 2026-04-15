/**
 * Google Calendar Client
 *
 * Uses googleapis SDK. Automatically refreshes access token on 401.
 */

import type { CalendarClient, CalendarEvent } from "@/lib/calendar-client";
import { refreshGoogleAccessToken } from "@/lib/google-calendar-oauth";
import { createServerClient } from "@/lib/supabase-server";
import { updateCalendarToken } from "@/lib/vault";
import { google } from "googleapis";

/**
 * Create a Google Calendar client with auto-refresh capability
 */
export const createGoogleCalendarClient = (
  clientId: string,
  accessToken: string,
  refreshToken: string,
): CalendarClient => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  /**
   * Refresh the access token and update Vault + OAuth2 client
   */
  const doRefresh = async (): Promise<void> => {
    const { accessToken: newToken } = await refreshGoogleAccessToken(
      refreshToken,
    );

    oauth2Client.setCredentials({ access_token: newToken });

    // Update Vault
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("clients")
      .select("google_calendar_token_secret_id")
      .eq("id", clientId)
      .single();

    if (data?.google_calendar_token_secret_id) {
      await updateCalendarToken(data.google_calendar_token_secret_id, newToken);
    }
  };

  /**
   * Execute a calendar API call with auto-refresh on 401
   */
  const withRefresh = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.code === 401 || err?.status === 401) {
        console.log("[GoogleCalendar] Token expired, refreshing...");
        await doRefresh();
        return await fn();
      }
      throw err;
    }
  };

  const listEvents = async (
    start: Date,
    end: Date,
  ): Promise<CalendarEvent[]> => {
    const res = await withRefresh(() =>
      calendar.events.list({
        calendarId: "primary",
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
      }),
    );

    return (res.data.items || []).map((event) => ({
      id: event.id || "",
      title: event.summary || "(Sem título)",
      startDateTime: event.start?.dateTime || event.start?.date || "",
      endDateTime: event.end?.dateTime || event.end?.date || "",
      description: event.description || undefined,
      location: event.location || undefined,
      attendees: event.attendees?.map((a) => a.email || "").filter(Boolean),
    }));
  };

  const createEvent = async (
    event: Omit<CalendarEvent, "id">,
  ): Promise<CalendarEvent> => {
    const res = await withRefresh(() =>
      calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: { dateTime: event.startDateTime },
          end: { dateTime: event.endDateTime },
          attendees: event.attendees?.map((email) => ({ email })),
        },
      }),
    );

    return {
      id: res.data.id || "",
      title: res.data.summary || event.title,
      startDateTime:
        res.data.start?.dateTime || res.data.start?.date || event.startDateTime,
      endDateTime:
        res.data.end?.dateTime || res.data.end?.date || event.endDateTime,
      description: res.data.description || event.description,
      location: res.data.location || event.location,
      attendees: res.data.attendees?.map((a) => a.email || "").filter(Boolean),
    };
  };

  const updateEvent = async (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, "id">>,
  ): Promise<CalendarEvent> => {
    const requestBody: Record<string, any> = {};
    if (updates.title !== undefined) requestBody.summary = updates.title;
    if (updates.description !== undefined) requestBody.description = updates.description;
    if (updates.location !== undefined) requestBody.location = updates.location;
    if (updates.startDateTime !== undefined) requestBody.start = { dateTime: updates.startDateTime };
    if (updates.endDateTime !== undefined) requestBody.end = { dateTime: updates.endDateTime };
    if (updates.attendees !== undefined) requestBody.attendees = updates.attendees.map((email) => ({ email }));

    const res = await withRefresh(() =>
      calendar.events.patch({
        calendarId: "primary",
        eventId,
        requestBody,
      }),
    );

    return {
      id: res.data.id || eventId,
      title: res.data.summary || updates.title || "",
      startDateTime: res.data.start?.dateTime || res.data.start?.date || updates.startDateTime || "",
      endDateTime: res.data.end?.dateTime || res.data.end?.date || updates.endDateTime || "",
      description: res.data.description || updates.description,
      location: res.data.location || updates.location,
      attendees: res.data.attendees?.map((a) => a.email || "").filter(Boolean),
    };
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    await withRefresh(() =>
      calendar.events.delete({
        calendarId: "primary",
        eventId,
      }),
    );
  };

  const checkAvailability = async (
    start: Date,
    end: Date,
  ): Promise<boolean> => {
    const res = await withRefresh(() =>
      calendar.freebusy.query({
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: "primary" }],
        },
      }),
    );

    const busySlots = res.data.calendars?.["primary"]?.busy || [];
    return busySlots.length === 0;
  };

  return { listEvents, createEvent, updateEvent, deleteEvent, checkAvailability };
};
