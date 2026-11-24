// Turning an org's calendar file (Google Calendar / iCal) into events we can save.
// Reuses the calendar reader (src/calendar/ics.ts). Pure: no network here.
import { occurrences, parseIcs } from '../calendar/ics';
import { roomFor } from '../calendar/events';
import { addDays, austinNow, utcFromAustinWall } from '../calendar/time';
import { MapGraph } from '../types';

export type ImportedEvent = {
  importUid: string;      // the iCal UID (repeating events: UID + the day, so each day is its own event)
  title: string;
  description: string;
  startMs: number;        // real moments (UTC)
  endMs: number;
  placeId: string | null; // a room on our map
  locationText: string;   // what the calendar says, when it is not a mapped room ("" if none)
};

export const IMPORT_PAST_DAYS = 30;
export const IMPORT_FUTURE_DAYS = 365;
const MAX_TITLE = 80; // firestore.rules limit

// "20261124" for an Austin wall-clock date
const dayKey = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

// Events from the last 30 days and the next year. Events with no usable title are skipped.
export function icsToImports(text: string, graph: MapGraph, nowMs: number = Date.now()): ImportedEvent[] {
  const now = austinNow(nowMs);
  const from = addDays(now, -IMPORT_PAST_DAYS);
  const to = addDays(now, IMPORT_FUTURE_DAYS);
  const out: ImportedEvent[] = [];
  const events = parseIcs(text);
  // A uid used by several events (a repeating meeting plus the moved copies of some days) can't be the
  // importUid by itself: each one gets "uid#day" so they stay separate (and stay the same on re-import).
  const uidCount = new Map<string, number>();
  for (const e of events) uidCount.set(e.uid, (uidCount.get(e.uid) ?? 0) + 1);
  for (const event of events) {
    const title = event.title.trim().slice(0, MAX_TITLE);
    if (!title || !event.uid) continue;
    const placeId = roomFor(event.location, graph, event.description);
    for (const o of occurrences(event, from, to)) {
      const startMs = utcFromAustinWall(o.start);
      const endMs = utcFromAustinWall(o.end);
      if (!(endMs > startMs)) continue; // the rules need end after start
      out.push({
        importUid: event.rule || uidCount.get(event.uid)! > 1 ? `${event.uid}#${dayKey(o.start)}` : event.uid,
        title,
        description: event.description.trim(),
        startMs, endMs,
        placeId,
        locationText: placeId ? '' : event.location.trim(),
      });
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs || a.importUid.localeCompare(b.importUid));
}

// A Firestore document id for an imported event. Ids can't contain "/", so every other character
// that isn't a letter, digit, "-" or "_" becomes "_". The same importUid always gives the same id,
// which is how a second import UPDATES an event instead of adding a copy.
export function importDocId(importUid: string): string {
  return `import-${importUid.replace(/[^A-Za-z0-9_-]/g, '_')}`.slice(0, 200);
}

// "webcal://..." works as "https://..." ; Google "calendar.google.com/calendar/ical/.../basic.ics" is already one.
export function normalizeCalendarUrl(input: string): string | null {
  const url = input.trim().replace(/^webcal:\/\//i, 'https://');
  return /^https?:\/\/\S+$/i.test(url) ? url : null;
}
