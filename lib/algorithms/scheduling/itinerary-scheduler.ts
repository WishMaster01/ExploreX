export type SchedulableActivity = {
  best_time_to_visit?: string;
  opening_time?: string;
  closing_time?: string;
  visit_duration_minutes?: number;
};

export type ScheduledFields = {
  scheduled_start: string;
  scheduled_end: string;
};

function parseClock(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = value.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return fallback;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const period = match[3]?.toLowerCase();
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function preferredStart(value = ""): number {
  const normalized = value.toLocaleLowerCase();
  if (/sunrise|early|morning/.test(normalized)) return 9 * 60;
  if (/lunch|noon|afternoon/.test(normalized)) return 13 * 60;
  if (/sunset|evening|night/.test(normalized)) return 17 * 60;
  return 10 * 60;
}

function clock(minutes: number): string {
  const bounded = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

export function scheduleActivities<T extends SchedulableActivity>(
  activities: T[],
  transitMinutes = 20,
): Array<T & ScheduledFields> {
  let cursor = 8 * 60 + 30;
  return activities.map((activity) => {
    const opening = parseClock(activity.opening_time, 8 * 60);
    const closing = parseClock(activity.closing_time, 22 * 60);
    const duration = Math.max(30, Math.min(activity.visit_duration_minutes ?? 90, 360));
    const preferred = preferredStart(activity.best_time_to_visit);
    const start = Math.max(cursor, opening, preferred);
    const adjustedStart = start + duration <= closing
      ? start
      : Math.max(cursor, opening, closing - duration);
    const end = Math.min(23 * 60 + 59, adjustedStart + duration);
    cursor = end + Math.max(0, transitMinutes);
    return { ...activity, scheduled_start: clock(adjustedStart), scheduled_end: clock(end) };
  });
}
