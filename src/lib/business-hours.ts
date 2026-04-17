/**
 * Business Hours Checker
 *
 * Pure function that determines whether the current time falls within
 * the agent's configured business hours schedule.
 */

import type { DaySchedule } from "@/lib/types";

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 0, active: false, start: "09:00", end: "18:00" },
  { day: 1, active: true, start: "09:00", end: "18:00" },
  { day: 2, active: true, start: "09:00", end: "18:00" },
  { day: 3, active: true, start: "09:00", end: "18:00" },
  { day: 4, active: true, start: "09:00", end: "18:00" },
  { day: 5, active: true, start: "09:00", end: "18:00" },
  { day: 6, active: false, start: "09:00", end: "18:00" },
];

/**
 * Parse "HH:MM" into total minutes since midnight
 */
const parseTime = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Get the current date/time in a specific IANA timezone
 */
const getNowInTimezone = (timezone: string, now?: Date): { dayOfWeek: number; minutes: number } => {
  const date = now || new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    dayOfWeek: dayMap[weekdayStr] ?? 1,
    minutes: hour * 60 + minute,
  };
};

/**
 * Check if the current time is within business hours.
 *
 * @param schedule - Array of 7 DaySchedule objects (one per day of week)
 * @param timezone - IANA timezone string (e.g. "America/Sao_Paulo")
 * @param now - Optional Date for testing (defaults to current time)
 * @returns true if within business hours, false if outside
 */
export const isWithinBusinessHours = (
  schedule: DaySchedule[] | null | undefined,
  timezone: string,
  now?: Date,
): boolean => {
  const safeSchedule = Array.isArray(schedule) && schedule.length === 7
    ? schedule
    : DEFAULT_SCHEDULE;

  const { dayOfWeek, minutes } = getNowInTimezone(timezone || "America/Sao_Paulo", now);

  const dayConfig = safeSchedule.find((d) => d.day === dayOfWeek);

  // If no config for this day, or day is inactive → outside hours
  if (!dayConfig || !dayConfig.active) return false;

  const startMinutes = parseTime(dayConfig.start);
  const endMinutes = parseTime(dayConfig.end);

  // Support overnight schedules (e.g. start: "22:00", end: "06:00")
  if (startMinutes <= endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }

  // Overnight: active if after start OR before end
  return minutes >= startMinutes || minutes < endMinutes;
};
