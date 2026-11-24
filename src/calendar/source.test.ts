import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import calendarSnapshot from '../data/calendarSnapshot';
import { readRepoFile } from './readRepoFile';
import { FEED_URL, loadEvents, sourceLabel } from './source';

// An in-memory phone storage for the tests (it comes with the storage package).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const ics = readRepoFile('data/cs-calendar.ics').replace(/\r\n/g, '\n');
// Fakes for fetch: one that works, and some that don't.
const okFetch = (text: string) => (jest.fn(async () => ({ ok: true, status: 200, text: async () => text })) as unknown) as typeof fetch;
const failFetch = (jest.fn(async () => { throw new Error('offline'); }) as unknown) as typeof fetch;
const NOW = new Date(2026, 10, 24, 12, 0); // Nov 24, 2026, noon (computer's own clock fields)

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});
afterEach(() => { jest.useRealTimers(); });

describe('loadEvents', () => {
  test('the app\'s snapshot is exactly data/cs-calendar.ics (so a refresh was not forgotten)', () => {
    expect(calendarSnapshot).toBe(ics);
  });

  test('the feed address is the one from the original events spec (a typo would silently use the snapshot forever)', () => {
    // Copied from the first version of docs/tasks/events.md (the current spec no longer lists it).
    expect(FEED_URL).toBe('https://p106-caldav.icloud.com/published/2/MTczOTUxOTA2ODExNzM5NbIQ75YFeLwK-LANlyWBYbU8ZPTfALGVK_nN5W3UJYXs2o6iwRiFvI8pW5y9gwDat10HOpVkpKfXYVCE6ZTfedg');
  });

  test('internet works: uses the live feed and says "Live"', async () => {
    const fetchImpl = okFetch(ics);
    const loaded = await loadEvents({ fetchImpl, now: NOW });
    expect(fetchImpl).toHaveBeenCalledWith(FEED_URL);
    expect(loaded.source).toEqual({ kind: 'live' });
    expect(loaded.events).toHaveLength(28);
    expect(sourceLabel(loaded.source)).toBe('Live');
  });

  test('a good download is saved on the phone, and used when the next try fails: "Saved Nov 24"', async () => {
    await loadEvents({ fetchImpl: okFetch(ics), now: NOW });
    const later = await loadEvents({ fetchImpl: failFetch, now: new Date(2026, 10, 30) });
    expect(later.source.kind).toBe('saved');
    expect(later.events).toHaveLength(28);
    expect(sourceLabel(later.source)).toBe('Saved Nov 24'); // the day it was downloaded, not today
  });

  test('no internet and nothing saved: the snapshot, "Offline snapshot"', async () => {
    const loaded = await loadEvents({ fetchImpl: failFetch, now: NOW });
    expect(loaded.source).toEqual({ kind: 'snapshot' });
    expect(loaded.events).toHaveLength(28);
    expect(sourceLabel(loaded.source)).toBe('Offline snapshot');
  });

  test('a server error (HTTP 500) counts as a failure and is not saved', async () => {
    const serverError = (jest.fn(async () => ({ ok: false, status: 500, text: async () => 'oops' })) as unknown) as typeof fetch;
    const loaded = await loadEvents({ fetchImpl: serverError, now: NOW });
    expect(loaded.source.kind).toBe('snapshot');
    expect(await AsyncStorage.getItem('amilost.calendar.text')).toBeNull();
  });

  test('an answer that is not a calendar (like a login page) never replaces the saved copy', async () => {
    await loadEvents({ fetchImpl: okFetch(ics), now: NOW });
    const loaded = await loadEvents({ fetchImpl: okFetch('<html>Please sign in</html>'), now: NOW });
    expect(loaded.source.kind).toBe('saved');
    expect(loaded.events).toHaveLength(28);
    expect(await AsyncStorage.getItem('amilost.calendar.text')).toBe(ics);
  });

  test('a download that never finishes is given up after the time limit (8 seconds)', async () => {
    jest.useFakeTimers();
    const hangs = (jest.fn(() => new Promise(() => {})) as unknown) as typeof fetch;
    const promise = loadEvents({ fetchImpl: hangs, now: NOW }); // default limit: 8000 ms
    await jest.advanceTimersByTimeAsync(7999);
    let done = false;
    promise.then(() => { done = true; });
    await jest.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);                                  // 1 ms to go: still waiting
    await jest.advanceTimersByTimeAsync(1);
    expect((await promise).source.kind).toBe('snapshot');       // 8000 ms: gave up
  });

  test('if the phone refuses to save or read, the app still works', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disk full'));
    const live = await loadEvents({ fetchImpl: okFetch(ics), now: NOW });
    expect(live.source.kind).toBe('live');                      // could not save, still shows the live events

    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('disk full'));
    const offline = await loadEvents({ fetchImpl: failFetch, now: NOW });
    expect(offline.source.kind).toBe('snapshot');               // could not read the saved copy: falls back to the snapshot
  });
});

describe('sourceLabel', () => {
  test('the three labels', () => {
    expect(sourceLabel({ kind: 'live' })).toBe('Live');
    expect(sourceLabel({ kind: 'snapshot' })).toBe('Offline snapshot');
    expect(sourceLabel({ kind: 'saved', savedAt: new Date(2026, 11, 3, 9, 0).toISOString() })).toBe('Saved Dec 3');
    expect(sourceLabel({ kind: 'saved', savedAt: '' })).toBe('Saved copy'); // an unreadable date does not crash
  });
});
