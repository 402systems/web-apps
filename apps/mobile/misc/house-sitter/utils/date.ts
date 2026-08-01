const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Local-time YYYY-MM-DD. Deliberately not ISO/UTC — "today" is where you are. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? '';
}

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** "9:00 AM" from "09:00". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function parseTime(hhmm: string): { hour: number; minute: number } {
  const [hour, minute] = hhmm.split(':').map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

/** Whole days between two timestamps, floored. */
export function daysSince(timestamp: number, now: number = Date.now()): number {
  return Math.floor((now - timestamp) / DAY_MS);
}

export function formatDaysAgo(timestamp: number | undefined): string {
  if (!timestamp) return 'never';
  const days = daysSince(timestamp);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Which day of the stay it is, 1-indexed, or null if the stay isn't set or
 * hasn't started. Both dates are inclusive.
 */
export function stayProgress(
  start: string | null,
  end: string | null,
  now: Date = new Date()
): { day: number; total: number } | null {
  if (!start || !end) return null;
  const startMs = Date.parse(`${start}T00:00:00`);
  const endMs = Date.parse(`${end}T00:00:00`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return null;
  }
  const todayMs = Date.parse(`${dateKey(now)}T00:00:00`);
  const day = Math.round((todayMs - startMs) / DAY_MS) + 1;
  const total = Math.round((endMs - startMs) / DAY_MS) + 1;
  if (day < 1 || day > total) return null;
  return { day, total };
}

export function addDays(timestamp: number, days: number): number {
  return timestamp + days * DAY_MS;
}
