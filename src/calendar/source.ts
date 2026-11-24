// Where the events come from: the live UTCS iCal feed when we can reach it, else the last copy this
// phone saved, else the snapshot that ships with the app. We only ever use the feed (never the
// calendar's web pages: their robots.txt disallows scraping).
import AsyncStorage from '@react-native-async-storage/async-storage';
import calendarSnapshot from '../data/calendarSnapshot';
import { CalEvent, parseIcs } from './ics';

// The feed behind the "iCal" button on https://apps.cs.utexas.edu/calendar (shown there as webcal://).
export const FEED_URL =
  'https://p106-caldav.icloud.com/published/2/MTczOTUxOTA2ODExNzM5NbIQ75YFeLwK-LANlyWBYbU8ZPTfALGVK_nN5W3UJYXs2o6iwRiFvI8pW5y9gwDat10HOpVkpKfXYVCE6ZTfedg';

const SAVED_KEY = 'amilost.calendar.text';
const SAVED_AT_KEY = 'amilost.calendar.savedAt';
const TIMEOUT_MS = 8000;

export type Source =
  | { kind: 'live' }
  | { kind: 'saved'; savedAt: string }   // savedAt: when the saved copy was downloaded (ISO date-time)
  | { kind: 'snapshot' };

export type Loaded = { events: CalEvent[]; source: Source };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The small label for the Events screen: "Live", "Saved Nov 24" or "Offline snapshot".
export function sourceLabel(source: Source): string {
  if (source.kind === 'live') return 'Live';
  if (source.kind === 'snapshot') return 'Offline snapshot';
  const d = new Date(source.savedAt);
  return Number.isNaN(d.getTime()) ? 'Saved copy' : `Saved ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Fetch the feed text, giving up after the timeout. Throws on any failure (no network, blocked by the
// browser, an HTTP error, or text that isn't a calendar).
async function fetchFeed(fetchImpl: typeof fetch, timeoutMs: number): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timed out')), timeoutMs); });
  try {
    const response = await Promise.race([fetchImpl(FEED_URL), timeout]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('not a calendar');
    return text;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type Options = { fetchImpl?: typeof fetch; now?: Date; timeoutMs?: number };

export async function loadEvents({ fetchImpl = fetch, now = new Date(), timeoutMs = TIMEOUT_MS }: Options = {}): Promise<Loaded> {
  // 1. Live feed. On success keep a copy on the phone for next time.
  try {
    const text = await fetchFeed(fetchImpl, timeoutMs);
    const events = parseIcs(text);
    try {
      await AsyncStorage.setItem(SAVED_KEY, text);
      await AsyncStorage.setItem(SAVED_AT_KEY, now.toISOString());
    } catch {
      // Not saved this time: fine.
    }
    return { events, source: { kind: 'live' } };
  } catch {
    // fall through to the saved copy
  }

  // 2. The copy saved by an earlier successful download.
  try {
    const text = await AsyncStorage.getItem(SAVED_KEY);
    if (text && text.includes('BEGIN:VCALENDAR')) {
      const savedAt = (await AsyncStorage.getItem(SAVED_AT_KEY)) ?? '';
      return { events: parseIcs(text), source: { kind: 'saved', savedAt } };
    }
  } catch {
    // fall through to the snapshot
  }

  // 3. The snapshot that comes with the app.
  return { events: parseIcs(calendarSnapshot), source: { kind: 'snapshot' } };
}
