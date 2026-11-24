// Time helpers for the calendar.
//
// The UTCS feed gives times as Austin wall-clock time ("TZID=America/Chicago": 3 PM means 3 PM in
// Austin). So inside the calendar code a time is a plain JavaScript Date whose *local fields*
// (getHours(), getDate() ...) hold the Austin wall-clock time. We never look at the Date's UTC
// value, so everything works the same on any computer, whatever its own time zone is.
// (The few places that must start from a real instant, UNTIL and "now", convert it first.)

export const wall = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, m - 1, d, h, mi, s);

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// d moved by n calendar days, keeping the time of day.
export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds());

// Midnight at the start of d's week. `weekStart` is the first day: 0 = Sunday ... 6 = Saturday.
export function startOfWeek(d: Date, weekStart = 0): Date {
  const back = (d.getDay() - weekStart + 7) % 7;
  return addDays(startOfDay(d), -back);
}

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

// How many minutes from a to b on the wall clock (not affected by the computer's own clock changes).
export function wallMinutes(a: Date, b: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  return Math.round((utc(b) - utc(a)) / 60000);
}

// Day of the month of the n-th Sunday of a month (monthIndex 0 = January).
function nthSunday(year: number, monthIndex: number, n: number): number {
  const firstDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return ((7 - firstDow) % 7) + 1 + 7 * (n - 1);
}

// A real moment (milliseconds since 1970, UTC) -> the Austin wall-clock time at that moment.
// Austin is 6 hours behind UTC, or 5 during daylight saving time: from the second Sunday in March
// (2:00 AM) to the first Sunday in November (2:00 AM).
export function austinWallFromUtc(ms: number): Date {
  const year = new Date(ms).getUTCFullYear();
  const dstStart = Date.UTC(year, 2, nthSunday(year, 2, 2), 8); // 2:00 AM standard time = 08:00 UTC
  const dstEnd = Date.UTC(year, 10, nthSunday(year, 10, 1), 7); // 2:00 AM daylight time = 07:00 UTC
  const offsetHours = ms >= dstStart && ms < dstEnd ? -5 : -6;
  const w = new Date(ms + offsetHours * 3600 * 1000);
  return new Date(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds());
}

// "Now" as Austin wall-clock time, in the same form as the event times.
export const austinNow = (nowMs: number = Date.now()) => austinWallFromUtc(nowMs);
