// Turning calendar events into things the screens can list: which room, which group, searching,
// "this week", and "Today / Tomorrow / Fri, Dec 4" headings. Pure functions (no screens, no network).
import { Group, groups } from '../data/groups';
import { MapGraph } from '../types';
import { CalEvent, occurrences } from './ics';
import { addDays, startOfDay, startOfMonth, startOfWeek } from './time';

// One thing happening at one time: what the lists show.
export type Item = {
  id: string;                // unique: the event's uid + when this occurrence starts
  title: string;
  description: string;
  start: Date;               // Austin wall-clock (see time.ts)
  end: Date;
  location: string;          // as written in the feed ("" when none)
  room: string | null;       // the map point (e.g. "GDC-2.216") when we know the room, else null
  groupId: string | null;
  url: string;               // the event's UTCS page ("" for events posted on this phone)
  local?: boolean;           // (old) posted on this phone
  // Set for events that come from an organization (Firestore):
  orgId?: string;
  orgName?: string;
  visibility?: 'public' | 'members';
  docId?: string;            // the Firestore document id (to edit or delete it)
  createdBy?: string;
  source?: 'manual' | 'import';
};

// ---------- Room and group ----------

// Which map point is this place text? Checked by hand against the org calendars (data/*.ics):
//   "GDC 6.302", "gdc 6.302" (any capitals), "GDC 3.314 (ACM Office)", "GDC 2.506 (Teaching Lab)" -> that room
//   "5.302" (no building: old ACM entries) -> assume GDC
//   "GDC Atrium" -> GDC-2.100
//   an empty location -> look for "GDC 1.304" in the description (HACS often writes it there)
// Other buildings ("UTC 1.118"), "Welch Patio", Zoom links, addresses, rooms we haven't mapped -> null,
// and the screens show the text instead. Hallway points are never rooms.
export function roomFor(location: string, graph: MapGraph, description = ''): string | null {
  const text = location.trim() ? location : description;
  const idFor = (floor: string, room: string) => {
    const id = `GDC-${floor}.${room.toUpperCase()}`;
    const node = graph.nodes.find((n) => n.id === id);
    return node && node.kind !== 'hall' ? id : null;
  };
  if (!location.trim()) {
    const m = description.match(/(?:^|[^A-Za-z0-9])GDC\s+(\d)\.([0-9]+[A-Za-z]?)(?![0-9A-Za-z])/i);
    return m ? idFor(m[1], m[2]) : null;
  }
  if (/^\s*GDC\s+Atrium\b/i.test(text)) return idFor('2', '100');
  const m = text.match(/^\s*(?:GDC\s+)?(\d)\.([0-9]+[A-Za-z]?)(?![0-9A-Za-z])/i);
  return m ? idFor(m[1], m[2]) : null;
}

// Does `text` contain `keyword` as a whole word or phrase? ("LARG" is not in "Calarge".)
function hasWord(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i').test(text);
}

// The group an event belongs to: a keyword in the title wins; otherwise one in the description; else none.
export function groupFor(title: string, description: string): Group | null {
  return (
    groups.find((g) => g.keywords.some((k) => hasWord(title, k))) ??
    groups.find((g) => g.keywords.some((k) => hasWord(description, k))) ??
    null
  );
}

// ---------- Building the list ----------

const byStart = (a: Item, b: Item) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title);

// All the items that happen between `from` and `to` (repeats expanded), earliest first.
export function makeItems(events: CalEvent[], from: Date, to: Date, graph: MapGraph): Item[] {
  const items: Item[] = [];
  for (const event of events) {
    for (const o of occurrences(event, from, to)) {
      items.push({
        id: `${event.uid}@${o.start.getTime()}`,
        title: event.title,
        description: event.description,
        start: o.start,
        end: o.end,
        location: event.location,
        room: roomFor(event.location, graph, event.description),
        groupId: groupFor(event.title, event.description)?.id ?? null,
        url: event.url,
      });
    }
  }
  return items.sort(byStart);
}

// Several lists (feed events, events posted on this phone) as one list, earliest first.
export function mergeItems(...lists: Item[][]): Item[] {
  return lists.flat().sort(byStart);
}

// ---------- Searching and filtering ----------

// Items whose title, description or group name contains the query (capitals don't matter).
// An empty query matches everything.
export function search(list: Item[], query: string): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((item) => {
    const group = groups.find((g) => g.id === item.groupId);
    return [item.title, item.description, group?.name ?? ''].some((text) => text.toLowerCase().includes(q));
  });
}

export type Range = 'day' | 'week' | 'month';

// The window for a day, a week (Sunday to Saturday) or a month around `date`: from midnight up to,
// but not including, the next midnight.
export function rangeBounds(range: Range, date: Date): { from: Date; to: Date } {
  if (range === 'day') return { from: startOfDay(date), to: addDays(startOfDay(date), 1) };
  if (range === 'week') return { from: startOfWeek(date, 0), to: addDays(startOfWeek(date, 0), 7) };
  const from = startOfMonth(date);
  return { from, to: new Date(from.getFullYear(), from.getMonth() + 1, 1) };
}

// Items that are happening during that day / week / month (one that started the night before and is
// still going at midnight counts for the new day too).
export function inRange(list: Item[], range: Range, date: Date): Item[] {
  const { from, to } = rangeBounds(range, date);
  return list.filter((i) => i.start.getTime() < to.getTime() && i.end.getTime() > from.getTime());
}

// ---------- Headings ----------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Fri, Dec 4"
export const dayName = (day: Date) => `${WEEKDAYS[day.getDay()]}, ${MONTHS[day.getMonth()]} ${day.getDate()}`;

// "Today", "Tomorrow", or "Fri, Dec 4": counted in calendar days.
export function dayLabel(day: Date, now: Date): string {
  const apart = Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86400000);
  if (apart === 0) return 'Today';
  if (apart === 1) return 'Tomorrow';
  return dayName(day);
}

export type DayGroup = { label: string; day: Date; items: Item[] };

// Items sorted and put into one group per day they START on.
export function groupByDay(list: Item[], now: Date): DayGroup[] {
  const result: DayGroup[] = [];
  for (const item of [...list].sort(byStart)) {
    const day = startOfDay(item.start);
    const last = result[result.length - 1];
    if (last && last.day.getTime() === day.getTime()) last.items.push(item);
    else result.push({ label: dayLabel(day, now), day, items: [item] });
  }
  return result;
}

// ---------- Describing items ----------

const clock = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
const meridiem = (d: Date) => (d.getHours() < 12 ? 'AM' : 'PM');

// "3:00–4:30 PM" (AM/PM shown once when start and end agree, otherwise twice: "11:30 AM–1:00 PM").
export function formatTime(item: Item): string {
  const same = meridiem(item.start) === meridiem(item.end);
  return `${clock(item.start)}${same ? '' : ` ${meridiem(item.start)}`}–${clock(item.end)} ${meridiem(item.end)}`;
}

// "Wed, Dec 9 · 4:00–5:15 PM"
export function formatWhen(item: Item): string {
  const d = item.start;
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} · ${formatTime(item)}`;
}

// ---------- Following groups, and the date strip ----------

// Items that belong to one of these groups.
export function forGroups(list: Item[], groupIds: string[]): Item[] {
  return list.filter((i) => i.groupId !== null && groupIds.includes(i.groupId));
}

// How many items each group has: { larg: 5, amrl: 1 }.
export function countByGroup(list: Item[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const i of list) if (i.groupId) counts[i.groupId] = (counts[i.groupId] ?? 0) + 1;
  return counts;
}

// The date after pressing the arrows: a day, a week, or a month earlier (-1) or later (+1).
// Moving by a month keeps the day number, or the month's last day if it has fewer days (Jan 31 -> Feb 28).
export function shiftDate(date: Date, range: Range, direction: 1 | -1): Date {
  if (range === 'day') return addDays(startOfDay(date), direction);
  if (range === 'week') return addDays(startOfDay(date), 7 * direction);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + direction + 1, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() + direction, Math.min(date.getDate(), lastDay));
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The title of the date strip: "Today", "Nov 22 – 28", "Nov 29 – Dec 5" or "November 2026".
export function rangeLabel(range: Range, date: Date, now: Date): string {
  if (range === 'day') return dayLabel(date, now);
  if (range === 'month') return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  const first = startOfWeek(date, 0);
  const last = addDays(first, 6);
  const start = `${MONTHS[first.getMonth()]} ${first.getDate()}`;
  return first.getMonth() === last.getMonth() ? `${start} – ${last.getDate()}` : `${start} – ${MONTHS[last.getMonth()]} ${last.getDate()}`;
}
