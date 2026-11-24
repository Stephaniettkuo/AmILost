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
  local?: boolean;           // posted on this phone (Part 3)
};

// ---------- Room and group ----------

// "GDC 2.100 (Atrium)" -> "GDC-2.100", but only if that point is on our map and isn't a hallway point.
// Other buildings ("PAI 3.02"), "Zoom", empty text, rooms we haven't mapped -> null.
export function roomFor(location: string, graph: MapGraph): string | null {
  const m = location.match(/^\s*GDC\s+(\d)\.([0-9A-Za-z]+)/i);
  if (!m) return null;
  const id = `GDC-${m[1]}.${m[2].toUpperCase()}`;
  const node = graph.nodes.find((n) => n.id === id);
  return node && node.kind !== 'hall' ? id : null;
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
        room: roomFor(event.location, graph),
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

// "Today", "Tomorrow", or "Fri, Dec 4": counted in calendar days.
export function dayLabel(day: Date, now: Date): string {
  const apart = Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86400000);
  if (apart === 0) return 'Today';
  if (apart === 1) return 'Tomorrow';
  return `${WEEKDAYS[day.getDay()]}, ${MONTHS[day.getMonth()]} ${day.getDate()}`;
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
