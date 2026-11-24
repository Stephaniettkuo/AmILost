// Reading the UTCS iCal feed. The format is simple, so this is hand-written (no package).
//   parseIcs(text)                -> the events in the file
//   occurrences(event, from, to)  -> every time one event happens inside a window (weekly repeats expanded)
import { addDays, austinWallFromUtc, startOfDay, startOfWeek, wallMinutes } from './time';

export type Rule = {
  interval: number;          // every 1 (or 2, 3 ...) weeks
  weekStart: number;         // the day weeks start on: 0 = Sunday ... 6 = Saturday (WKST; the feed says SU)
  byDay: number[] | null;    // days of the week it happens on (0 = Sunday); null = same day as the first one
  count: number | null;      // stop after this many occurrences (the first one counts)
  until: Date | null;        // stop after this time (Austin wall-clock)
};

export type CalEvent = {
  uid: string;
  title: string;
  description: string;
  location: string;          // "GDC 2.216", or "" when the feed has none
  url: string;               // the event's UTCS page, or ""
  start: Date;               // first occurrence (Austin wall-clock, see time.ts)
  end: Date;
  rule: Rule | null;         // null = happens once (also when the repeat rule is one we don't support)
  exdates: Date[];           // skipped occurrences
};

export type Occurrence = { event: CalEvent; start: Date; end: Date };

// ---------- Reading the file ----------

// Long lines are folded: a line that starts with a space or tab continues the one before it.
const unfold = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');

// Text values escape \n \, \; and \\ .
const unescapeText = (s: string) => s.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

// "NAME;PARAM=x:value" -> name, params, value. The first colon outside quotes ends the name part.
function splitLine(line: string): { name: string; params: string; value: string } | null {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) {
      const head = line.slice(0, i);
      const semi = head.indexOf(';');
      return { name: (semi < 0 ? head : head.slice(0, semi)).toUpperCase(), params: semi < 0 ? '' : head.slice(semi + 1), value: line.slice(i + 1) };
    }
  }
  return null;
}

// "20261124T110000" (Austin wall-clock; also used when the feed has no zone), "20261205T115959Z"
// (a real UTC moment, converted) or "20261124" (a date: midnight).
function parseDateTime(value: string): Date | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4] ?? '0', m[5] ?? '0', m[6] ?? '0'].map(Number);
  if (m[7]) return austinWallFromUtc(Date.UTC(y, mo - 1, d, h, mi, s));
  return new Date(y, mo - 1, d, h, mi, s);
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// A weekly repeat rule we understand, or null. Anything else (monthly, daily, "first Friday" ...) is
// not supported: the event then just happens once, on its first date.
function parseRule(value: string): Rule | null {
  const parts = new Map<string, string>();
  for (const piece of value.split(';')) {
    const [k, v] = piece.split('=');
    if (k && v !== undefined) parts.set(k.toUpperCase(), v);
  }
  if (parts.get('FREQ') !== 'WEEKLY') return null;
  for (const key of parts.keys()) if (!['FREQ', 'WKST', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY'].includes(key)) return null;

  const interval = parts.has('INTERVAL') ? Number(parts.get('INTERVAL')) : 1;
  const count = parts.has('COUNT') ? Number(parts.get('COUNT')) : null;
  if (!Number.isInteger(interval) || interval < 1 || (count !== null && (!Number.isInteger(count) || count < 1))) return null;

  let byDay: number[] | null = null;
  if (parts.has('BYDAY')) {
    byDay = parts.get('BYDAY')!.split(',').map((d) => DAYS.indexOf(d.trim().toUpperCase()));
    if (byDay.some((d) => d < 0)) return null; // e.g. "1FR" (first Friday): not a plain weekday
  }
  const weekStart = parts.has('WKST') ? DAYS.indexOf(parts.get('WKST')!.toUpperCase()) : 1; // the standard default is Monday
  if (weekStart < 0) return null;
  const until = parts.has('UNTIL') ? parseDateTime(parts.get('UNTIL')!) : null;
  if (parts.has('UNTIL') && !until) return null;
  return { interval, weekStart, byDay, count, until };
}

export function parseIcs(text: string): CalEvent[] {
  const events: CalEvent[] = [];
  let fields: { name: string; params: string; value: string }[] | null = null;

  for (const line of unfold(text).split('\n')) {
    if (line.trim() === 'BEGIN:VEVENT') { fields = []; continue; }
    if (line.trim() === 'END:VEVENT') {
      if (fields) { const event = buildEvent(fields); if (event) events.push(event); }
      fields = null;
      continue;
    }
    if (!fields) continue; // outside an event (calendar info, the VTIMEZONE block ...)
    const parsed = splitLine(line);
    if (parsed) fields.push(parsed);
  }
  return events;
}

function buildEvent(fields: { name: string; params: string; value: string }[]): CalEvent | null {
  const first = (name: string) => fields.find((f) => f.name === name)?.value;
  const startValue = first('DTSTART');
  const start = startValue ? parseDateTime(startValue) : null;
  if (!start) return null; // an event with no usable start can't be shown

  const endValue = first('DTEND');
  const end = (endValue && parseDateTime(endValue)) || new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes() + 60);
  const rule = first('RRULE');
  return {
    uid: first('UID') ?? '',
    title: unescapeText(first('SUMMARY') ?? '').trim(),
    description: unescapeText(first('DESCRIPTION') ?? ''),
    location: unescapeText(first('LOCATION') ?? '').trim(),
    url: first('URL') ?? '',
    start,
    end,
    rule: rule ? parseRule(rule) : null,
    exdates: fields.filter((f) => f.name === 'EXDATE').flatMap((f) => f.value.split(',')).map(parseDateTime).filter((d): d is Date => d !== null),
  };
}

// ---------- Repeats ----------

const MAX_OCCURRENCES = 5000; // a safety stop, so a rule with no end can't run forever

// Every time `event` happens that overlaps the window from..to (it started before `to` and ends after `from`).
export function occurrences(event: CalEvent, from: Date, to: Date): Occurrence[] {
  const minutes = wallMinutes(event.start, event.end);
  const make = (start: Date): Occurrence => ({
    event, start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes() + minutes),
  });
  const inWindow = (o: Occurrence) => o.start.getTime() < to.getTime() && o.end.getTime() > from.getTime();

  const rule = event.rule;
  if (!rule) {
    const only = make(event.start);
    return inWindow(only) ? [only] : [];
  }

  const found: Occurrence[] = [];
  const days = (rule.byDay ?? [event.start.getDay()]).slice().sort((a, b) => ((a - rule.weekStart + 7) % 7) - ((b - rule.weekStart + 7) % 7));
  const firstWeek = startOfWeek(event.start, rule.weekStart);
  let generated = 0; // how many occurrences the rule has produced so far (skipped ones still count for COUNT)

  for (let week = 0; week < MAX_OCCURRENCES; week++) {
    const weekStart = addDays(firstWeek, 7 * rule.interval * week);
    for (const day of days) {
      const date = addDays(weekStart, (day - rule.weekStart + 7) % 7);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), event.start.getHours(), event.start.getMinutes(), event.start.getSeconds());
      if (start.getTime() < event.start.getTime()) continue; // earlier in the first week than the event begins
      generated++;
      if (rule.count !== null && generated > rule.count) return found;
      if (rule.until && start.getTime() > rule.until.getTime()) return found;
      if (start.getTime() >= to.getTime()) return found; // they only get later from here
      if (event.exdates.some((x) => x.getTime() === start.getTime())) continue;
      const occurrence = make(start);
      if (inWindow(occurrence)) found.push(occurrence);
    }
  }
  return found;
}

// Midnight of the day an occurrence starts (handy for grouping).
export const dayOf = (o: Occurrence) => startOfDay(o.start);
