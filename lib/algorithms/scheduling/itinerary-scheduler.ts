export type SchedulableActivity = {
  best_time_to_visit?: string;
  opening_time?: string;
  closing_time?: string;
  visit_duration_minutes?: number;
  reservation_time?: string;
  unavailable_periods?: Array<{ start: string; end: string }>;
  max_travel_time_minutes?: number;
  estimated_travel_time_minutes?: number;
  travel_time_minutes?: number;
};

export type ScheduledFields = {
  scheduled_start: string;
  scheduled_end: string;
};

export type SchedulingDecision<T> = {
  scheduled: Array<T & ScheduledFields>;
  removed: Array<{ activity: T; reason: string }>;
};

export function clockMinutes(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : undefined;
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
  return scheduleFeasibleActivities(activities, transitMinutes).scheduled;
}

/** Greedily schedules feasible visits; impossible visits are returned with a concise reason. */
export function scheduleFeasibleActivities<T extends SchedulableActivity>(
  activities: T[],
  transitMinutes = 20,
  dayStartMinutes = 8 * 60 + 30,
  dayEndMinutes = 20 * 60,
): SchedulingDecision<T> {
  let cursor = dayStartMinutes;
  const scheduled: Array<T & ScheduledFields> = [];
  const removed: Array<{ activity: T; reason: string }> = [];

  for (const activity of activities) {
    const opening = clockMinutes(activity.opening_time) ?? 8 * 60;
    const closing = clockMinutes(activity.closing_time) ?? dayEndMinutes;
    const duration = Math.max(
      15,
      Math.min(activity.visit_duration_minutes ?? 90, 720),
    );
    const travel = Math.max(
      0,
      activity.travel_time_minutes ??
        activity.estimated_travel_time_minutes ??
        transitMinutes,
    );
    const maxTravel = activity.max_travel_time_minutes;
    if (maxTravel !== undefined && travel > maxTravel) {
      removed.push({
        activity,
        reason: `Removed because estimated travel (${travel} min) exceeds your ${maxTravel}-minute limit.`,
      });
      continue;
    }

    let start = Math.max(
      cursor + (scheduled.length ? travel : 0),
      opening,
      preferredStart(activity.best_time_to_visit),
    );
    const reservation = clockMinutes(activity.reservation_time);
    if (reservation !== undefined) start = Math.max(start, reservation);
    let end = start + duration;
    const unavailable = activity.unavailable_periods ?? [];
    const conflicts = unavailable
      .map((period) => ({
        start: clockMinutes(period.start),
        end: clockMinutes(period.end),
      }))
      .filter(
        (period): period is { start: number; end: number } =>
          period.start !== undefined && period.end !== undefined,
      )
      .sort((a, b) => a.start - b.start);
    for (const period of conflicts) {
      if (start < period.end && end > period.start) {
        start = period.end;
        end = start + duration;
      }
    }
    if (start < opening) {
      start = opening;
      end = start + duration;
    }
    if (end > closing || end > dayEndMinutes) {
      removed.push({
        activity,
        reason:
          "Removed because it cannot fit within opening hours and the remaining day schedule.",
      });
      continue;
    }
    scheduled.push({
      ...activity,
      scheduled_start: clock(start),
      scheduled_end: clock(end),
    });
    cursor = end;
  }
  return { scheduled, removed };
}
