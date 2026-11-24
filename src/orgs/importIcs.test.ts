// Tests for importing org calendars. Expected values are worked out by hand from small made-up
// calendars (written below), plus a few facts counted straight from data/*.ics with grep.
import { describe, expect, test } from '@jest/globals';
import { gdcGraph } from '../data/gdc';
import { icsToImports, importDocId, normalizeCalendarUrl } from './importIcs';
import { readRepoFile } from '../calendar/readRepoFile';

const cal = (...events: string[]) => `BEGIN:VCALENDAR\r\n${events.join('\r\n')}\r\nEND:VCALENDAR`;
const ev = (lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');
// "Now" for every test: Wed Dec 2 2026, 12:00 UTC (6:00 AM in Austin). Window: Nov 2 2026 .. Dec 2 2027.
const NOW = Date.UTC(2026, 11, 2, 12, 0);

describe('icsToImports', () => {
  test('a UTC time (Google style) becomes the same real moment, a room is found, a bad title is skipped', () => {
    const text = cal(
      ev(['UID:a@x', 'SUMMARY:Pizza', 'DTSTART:20261210T000000Z', 'DTEND:20261210T013000Z', 'LOCATION:GDC 1.304']),
      ev(['UID:b@x', 'SUMMARY:', 'DTSTART:20261210T000000Z', 'DTEND:20261210T013000Z']),
    );
    const out = icsToImports(text, gdcGraph, NOW);
    // 00:00Z to 01:30Z on Dec 10 = 90 minutes, from Dec 9 6:00 PM CST. One event (the untitled one is skipped).
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ importUid: 'a@x', title: 'Pizza', placeId: 'GDC-1.304', locationText: '' });
    expect(out[0].startMs).toBe(Date.UTC(2026, 11, 10, 0, 0));
    expect(out[0].endMs).toBe(Date.UTC(2026, 11, 10, 1, 30));
  });

  test('a local Austin time (TZID) is stored as UTC: Dec 3 4:00 PM CST = 22:00Z', () => {
    const text = cal(ev(['UID:c@x', 'SUMMARY:Talk', 'DTSTART;TZID=America/Chicago:20261203T160000', 'DTEND;TZID=America/Chicago:20261203T170000']));
    expect(icsToImports(text, gdcGraph, NOW)[0].startMs).toBe(Date.UTC(2026, 11, 3, 22, 0));
  });

  test('a place we cannot map keeps its text; the room can come from the description', () => {
    const text = cal(
      ev(['UID:d@x', 'SUMMARY:Picnic', 'DTSTART:20261205T170000Z', 'DTEND:20261205T180000Z', 'LOCATION:Welch Patio']),
      ev(['UID:e@x', 'SUMMARY:Study', 'DTSTART:20261206T170000Z', 'DTEND:20261206T180000Z', 'DESCRIPTION:Meet in GDC 1.304']),
    );
    const out = icsToImports(text, gdcGraph, NOW);
    expect(out.find((o) => o.importUid === 'd@x')).toMatchObject({ placeId: null, locationText: 'Welch Patio' });
    expect(out.find((o) => o.importUid === 'e@x')).toMatchObject({ placeId: 'GDC-1.304', locationText: '' });
  });

  test('only the last 30 days and the next year: Nov 1 is out, Nov 3 is in, Dec 1 2027 is in, Dec 3 2027 is out', () => {
    // "Now" is Dec 2 2026 6:00 AM Austin, so the window is Nov 2 2026 6:00 AM to Dec 2 2027 6:00 AM (365 days later).
    const one = (uid: string, day: string) => ev([`UID:${uid}`, 'SUMMARY:S', `DTSTART:${day}T180000Z`, `DTEND:${day}T190000Z`]);
    const out = icsToImports(cal(one('old', '20261101'), one('recent', '20261103'), one('far', '20271201'), one('toofar', '20271203')), gdcGraph, NOW);
    expect(out.map((o) => o.importUid).sort()).toEqual(['far', 'recent']);
  });

  test('a weekly repeat becomes one event per week, each with its own importUid (UID + day)', () => {
    // Weekly on Thursdays starting Dec 3 2026, 4 times: Dec 3, 10, 17, 24.
    const text = cal(ev(['UID:w@x', 'SUMMARY:Weekly', 'DTSTART;TZID=America/Chicago:20261203T160000', 'DTEND;TZID=America/Chicago:20261203T170000', 'RRULE:FREQ=WEEKLY;COUNT=4']));
    expect(icsToImports(text, gdcGraph, NOW).map((o) => o.importUid)).toEqual(['w@x#20261203', 'w@x#20261210', 'w@x#20261217', 'w@x#20261224']);
  });

  test('a moved meeting (RECURRENCE-ID) replaces the original day instead of showing twice', () => {
    // Weekly on Thursdays from Dec 3 2026, 3 times: Dec 3, 10, 17. The Dec 10 one was moved to Friday Dec 11
    // (same uid, RECURRENCE-ID = Dec 10). Expected days: Dec 3, Dec 11 (the moved one), Dec 17 - three, not four.
    const base = ev(['UID:m@x', 'SUMMARY:Weekly', 'DTSTART;TZID=America/Chicago:20261203T160000', 'DTEND;TZID=America/Chicago:20261203T170000', 'RRULE:FREQ=WEEKLY;COUNT=3']);
    const moved = ev(['UID:m@x', 'SUMMARY:Weekly (moved)', 'RECURRENCE-ID;TZID=America/Chicago:20261210T160000', 'DTSTART;TZID=America/Chicago:20261211T160000', 'DTEND;TZID=America/Chicago:20261211T170000']);
    const out = icsToImports(cal(base, moved), gdcGraph, NOW);
    expect(out.map((o) => o.importUid)).toEqual(['m@x#20261203', 'm@x#20261211', 'm@x#20261217']);
    expect(out[1].title).toBe('Weekly (moved)');
  });

  test('a title over 80 letters is cut to 80 (the rules would refuse more)', () => {
    const text = cal(ev(['UID:t@x', `SUMMARY:${'x'.repeat(120)}`, 'DTSTART:20261205T170000Z', 'DTEND:20261205T180000Z']));
    expect(icsToImports(text, gdcGraph, NOW)[0].title).toHaveLength(80);
  });

  test('real files: the three org calendars import without error, every event has a good start/end and a short title', () => {
    for (const f of ['acm-cal', 'hacs', 'wics']) {
      const out = icsToImports(readRepoFile(`data/${f}.ics`), gdcGraph, Date.UTC(2026, 10, 24, 18, 0));
      // Counted with grep: ACM and HACS have events in the window; the WiCS file's newest event is from
      // before the window (a finding, see NOTES.md), so it legitimately gives none.
      if (f !== 'wics') expect(out.length).toBeGreaterThan(0);
      for (const o of out) {
        expect(o.endMs).toBeGreaterThan(o.startMs);
        expect(o.title.length).toBeLessThanOrEqual(80);
        expect(o.importUid).not.toBe('');
      }
      // importUids are unique inside one file (so ids don't collide)
      expect(new Set(out.map((o) => o.importUid)).size).toBe(out.length);
    }
  });
});

describe('importDocId', () => {
  test('same uid -> same id (so re-import updates); strange characters are replaced; no "/"', () => {
    expect(importDocId('abc@google.com')).toBe('import-abc_google_com');
    expect(importDocId('abc@google.com')).toBe(importDocId('abc@google.com'));
    expect(importDocId('a/b#20261203')).toBe('import-a_b_20261203');
    expect(importDocId('x'.repeat(500)).length).toBe(200);
  });
});

describe('normalizeCalendarUrl', () => {
  test('webcal becomes https; other text is refused', () => {
    expect(normalizeCalendarUrl(' webcal://example.com/a.ics ')).toBe('https://example.com/a.ics');
    expect(normalizeCalendarUrl('https://calendar.google.com/calendar/ical/x/basic.ics')).toBe('https://calendar.google.com/calendar/ical/x/basic.ics');
    expect(normalizeCalendarUrl('not a link')).toBeNull();
    expect(normalizeCalendarUrl('')).toBeNull();
  });
});
