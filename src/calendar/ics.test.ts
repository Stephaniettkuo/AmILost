import { describe, expect, test } from '@jest/globals';
import { CalEvent, Occurrence, occurrences, parseIcs } from './ics';
import { readRepoFile } from './readRepoFile';
import { addDays, austinWallFromUtc, startOfMonth, startOfWeek, wall } from './time';

// All the "by hand" answers below were worked out from data/cs-calendar.ics (the snapshot of the
// UTCS feed downloaded 2026-11-24). Calendar for late 2026: Nov 24 is a Tuesday, Dec 2 a Wednesday,
// Dec 4 a Friday (Jan 1, 2026 was a Thursday).
const feed = parseIcs(readRepoFile('data/cs-calendar.ics'));
const byTitle = (title: string) => feed.filter((e) => e.title === title);
const one = (title: string): CalEvent => {
  const found = byTitle(title);
  expect(found).toHaveLength(1);
  return found[0];
};
// "2026-12-04 15:00" for a Date, from its wall-clock fields (so tests do not depend on the computer's time zone).
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const when = (list: Occurrence[]) => list.map((o) => fmt(o.start));
const WINDOW_FROM = wall(2026, 11, 1);
const WINDOW_TO = wall(2027, 7, 1);

describe('parseIcs', () => {
  test('reads all 28 events of the snapshot (the VTIMEZONE block is not an event)', () => {
    expect(feed).toHaveLength(28); // 28 BEGIN:VEVENT lines in the file
  });

  test('unfolds long lines: "Ke" + "rnel" on the next line is one word', () => {
    // In the file the description is split after "Linux Ke" and continues on a line starting with a space.
    expect(one('Kernel Development Meetup').description).toBe(
      'This is designed as a meeting to discuss problems in Linux Kernel development people are facing at UT in any capacity.',
    );
  });

  test('unescapes \\, \; and \\n', () => {
    // "Computing & Canines": "...Take a break\, relax with therapy dogs..."
    expect(one('Computing & Canines').description).toContain('Take a break, relax with therapy dogs');
    // The Distinguished Lecture has "\n\n\n" between its parts and "Professor\, Lancaster University\; Affiliate Faculty\, ..."
    const d = one('Distinguished Lecture - Thomas Ball').description;
    expect(d).toContain('Speaker: Thomas Ball');
    expect(d).toContain('\n\n\nSpeaker');
    expect(d).toContain('Honorary Professor, Lancaster University; Affiliate Faculty, University');
    expect(d).not.toContain('\\');
  });

  test('exactly 4 events have a LOCATION, the rest are room bookings without one', () => {
    const located = feed.filter((e) => e.location !== '').map((e) => [e.title, e.location]);
    expect(located.sort()).toEqual([
      ['Computing & Canines', 'GDC 2.100 (Atrium)'],
      ['Distinguished Lecture - Thomas Ball', 'GDC 2.216'],
      ['RobIn Lab Meeting', 'GDC 4.516'],
      ['Venkat Arun Group Meeting', 'GDC 6.816'],
    ]);
  });

  test('times are Austin wall-clock: DTSTART;TZID=America/Chicago:20261209T160000 is 4:00 PM, ending 5:15 PM', () => {
    const e = one('Distinguished Lecture - Thomas Ball');
    expect(fmt(e.start)).toBe('2026-12-09 16:00');
    expect(fmt(e.end)).toBe('2026-12-09 17:15'); // DTEND ...T171500
  });

  test('uid and url come through (the url keeps its ";TYPE=URI;VALUE=URI" parameters out of the value)', () => {
    const e = one('Kernel Development Meetup');
    expect(e.uid).toBe('calendar.322895.field_date.94@apps.cs.utexas.edu/calendar');
    expect(e.url).toBe('https://apps.cs.utexas.edu/calendar/rooms/322895');
  });

  test('repeat rules: weekly with COUNT, with UNTIL/BYDAY/INTERVAL, and none', () => {
    // RRULE:FREQ=WEEKLY;WKST=SU;COUNT=100
    expect(one('Kernel Development Meetup').rule).toMatchObject({ interval: 1, count: 100, byDay: null, weekStart: 0 });
    // RRULE:FREQ=WEEKLY;WKST=SU;UNTIL=20261205T115959Z;INTERVAL=2;BYDAY=FR   (BYDAY=FR -> Friday = 5)
    expect(one('NLL: NLP Reading Group').rule).toMatchObject({ interval: 2, byDay: [5], count: null });
    // UNTIL=20261205T115959Z is 11:59:59 UTC = 5:59:59 AM in Austin (standard time, -6 hours)
    expect(fmt(one('NLL: NLP Reading Group').rule!.until!)).toBe('2026-12-05 05:59');
    // BYDAY=TU,TH -> [2, 4]
    expect(one('CS303E Office Hours').rule!.byDay).toEqual([2, 4]);
    // "FoCS: Finals Fuel Stop with Dante" has no RRULE
    expect(byTitle('FoCS: Finals Fuel Stop with Dante')[0].rule).toBeNull();
  });

  test('ignores text before/after events and blank lines', () => {
    expect(parseIcs('')).toEqual([]);
    expect(parseIcs('BEGIN:VCALENDAR\nEND:VCALENDAR\n')).toEqual([]);
  });

  test('an event with no usable start is skipped', () => {
    expect(parseIcs('BEGIN:VEVENT\nSUMMARY:No time\nEND:VEVENT')).toEqual([]);
  });

  test('Windows line endings work too', () => {
    const e = parseIcs('BEGIN:VEVENT\r\nSUMMARY:Hi\r\nDTSTART:20261124T110000\r\nDTEND:20261124T120000\r\nEND:VEVENT\r\n');
    expect(e.map((x) => x.title)).toEqual(['Hi']);
  });
});

describe('Austin time', () => {
  // US daylight saving 2027: starts Sunday March 14 at 2:00 AM (08:00 UTC), ends Sunday Nov 7 at 2:00 AM (07:00 UTC).
  // 2026: ends Sunday Nov 1.
  test('a UTC moment becomes Austin wall-clock time (6 hours behind, 5 in daylight saving time)', () => {
    expect(fmt(austinWallFromUtc(Date.UTC(2026, 11, 5, 11, 59, 59)))).toBe('2026-12-05 05:59'); // December: -6
    expect(fmt(austinWallFromUtc(Date.UTC(2027, 4, 6, 9, 59, 59)))).toBe('2027-05-06 04:59');   // May: -5
  });

  test('the switch moments', () => {
    expect(fmt(austinWallFromUtc(Date.UTC(2027, 2, 14, 7, 59, 59)))).toBe('2027-03-14 01:59'); // one second before: still -6
    expect(fmt(austinWallFromUtc(Date.UTC(2027, 2, 14, 8, 0, 0)))).toBe('2027-03-14 03:00');   // clocks jump to 3:00
    expect(fmt(austinWallFromUtc(Date.UTC(2026, 10, 1, 6, 59, 59)))).toBe('2026-11-01 01:59'); // still -5
    expect(fmt(austinWallFromUtc(Date.UTC(2026, 10, 1, 7, 0, 0)))).toBe('2026-11-01 01:00');   // clocks go back to 1:00
  });

  test('week and month starts', () => {
    // Wed Nov 25, 2026: the week starts Sunday Nov 22; with Monday as the first day it would be Nov 23.
    expect(fmt(startOfWeek(wall(2026, 11, 25, 14, 30), 0))).toBe('2026-11-22 00:00');
    expect(fmt(startOfWeek(wall(2026, 11, 25, 14, 30), 1))).toBe('2026-11-23 00:00');
    expect(fmt(startOfWeek(wall(2026, 11, 22, 0, 0), 0))).toBe('2026-11-22 00:00'); // a Sunday starts its own week
    expect(fmt(startOfMonth(wall(2026, 11, 25)))).toBe('2026-11-01 00:00');
    expect(fmt(addDays(wall(2026, 11, 30, 9, 0), 2))).toBe('2026-12-02 09:00');
  });
});

describe('occurrences: the snapshot (answers worked out by hand)', () => {
  test('LARG Meeting: Wednesdays at 1 PM from Dec 2, until May 5, 2027 (23 of them)', () => {
    // DTSTART Wed Dec 2 13:00; BYDAY=WE; UNTIL=20270506T095959Z = May 6 4:59 AM Austin (daylight time).
    // Dec 2 + 22 weeks = 154 days = May 5, 2027, a Wednesday before UNTIL. The next one, May 12, is after it.
    // All its EXDATEs (Sep 23, Oct 7, Oct 14, Nov 25) are before the first date, so nothing is skipped.
    const list = occurrences(one('LARG Meeting'), WINDOW_FROM, WINDOW_TO);
    expect(when(list).slice(0, 5)).toEqual(['2026-12-02 13:00', '2026-12-09 13:00', '2026-12-16 13:00', '2026-12-23 13:00', '2026-12-30 13:00']);
    expect(list).toHaveLength(23);
    expect(when(list)[22]).toBe('2027-05-05 13:00');
  });

  test('LARG Meeting stays at 1 PM across the March 14, 2027 clock change', () => {
    // Wednesdays: Mar 10 and Mar 17 are both 13:00 wall-clock time even though the clocks moved on Mar 14.
    const list = occurrences(one('LARG Meeting'), wall(2027, 3, 8), wall(2027, 3, 20));
    expect(when(list)).toEqual(['2027-03-10 13:00', '2027-03-17 13:00']);
  });

  test('NLL: NLP Reading Group: every 2 weeks on Fridays from Nov 27, UNTIL Dec 5 -> only Nov 27', () => {
    // Week of Nov 27 is week 0; the next one allowed by INTERVAL=2 is Dec 11 (Dec 4 is skipped), after UNTIL (Dec 5 5:59 AM).
    expect(when(occurrences(one('NLL: NLP Reading Group'), WINDOW_FROM, WINDOW_TO))).toEqual(['2026-11-27 12:00']);
  });

  test('SE+NLP Reading Group: every 2 weeks from Fri Dec 4, UNTIL Dec 12 -> only Dec 4 (Dec 18 is too late)', () => {
    expect(when(occurrences(one('SE+NLP Reading Group'), WINDOW_FROM, WINDOW_TO))).toEqual(['2026-12-04 12:00']);
  });

  test('FarmBrain Sync: COUNT=2 on Fridays from Nov 27 -> Nov 27 and Dec 4', () => {
    expect(when(occurrences(one('FarmBrain Sync'), WINDOW_FROM, WINDOW_TO))).toEqual(['2026-11-27 11:00', '2026-12-04 11:00']);
  });

  test('CS303E Office Hours: Tuesdays and Thursdays from Tue Nov 24 until Dec 4 -> Nov 24, 26, Dec 1, 3', () => {
    // Two days per week, in week order (Tuesday first). Tue Dec 8 is after UNTIL (Dec 4 5:59 AM).
    expect(when(occurrences(one('CS303E Office Hours'), WINDOW_FROM, WINDOW_TO))).toEqual([
      '2026-11-24 15:45', '2026-11-26 15:45', '2026-12-01 15:45', '2026-12-03 15:45',
    ]);
  });

  test('Kernel Development Meetup: weekly on Tuesdays (no BYDAY: same weekday as the start), COUNT=100', () => {
    expect(when(occurrences(one('Kernel Development Meetup'), WINDOW_FROM, wall(2026, 12, 9)))).toEqual([
      '2026-11-24 11:00', '2026-12-01 11:00', '2026-12-08 11:00',
    ]);
    // 100 occurrences, one a week: the 100th is 99 weeks (693 days) after Tue Nov 24, 2026 = Tue Oct 17, 2028.
    const all = occurrences(one('Kernel Development Meetup'), wall(2026, 1, 1), wall(2030, 1, 1));
    expect(all).toHaveLength(100);
    expect(fmt(all[99].start)).toBe('2028-10-17 11:00');
  });

  test('events without a repeat rule happen once, and only show in a window that touches them', () => {
    const lecture = one('Distinguished Lecture - Thomas Ball'); // Wed Dec 9, 4:00-5:15 PM
    expect(when(occurrences(lecture, wall(2026, 12, 9), wall(2026, 12, 10)))).toEqual(['2026-12-09 16:00']);
    expect(occurrences(lecture, wall(2026, 12, 10), wall(2026, 12, 11))).toEqual([]);
    expect(occurrences(lecture, wall(2026, 12, 8), wall(2026, 12, 9))).toEqual([]); // ends at midnight exactly: not included
  });

  test('an occurrence has the same length as the event', () => {
    const [o] = occurrences(one('Distinguished Lecture - Thomas Ball'), WINDOW_FROM, WINDOW_TO);
    expect(fmt(o.end)).toBe('2026-12-09 17:15');
  });
});

describe('occurrences: made-up events (rules the snapshot does not exercise)', () => {
  const make = (lines: string): CalEvent => {
    const [e] = parseIcs(`BEGIN:VEVENT\nSUMMARY:Test\nDTSTART;TZID=America/Chicago:20261130T090000\nDTEND;TZID=America/Chicago:20261130T100000\n${lines}\nEND:VEVENT`);
    return e;
  };

  test('EXDATE after DTSTART skips that week (and still counts toward COUNT)', () => {
    // Mondays at 9, COUNT=4 would be Nov 30, Dec 7, Dec 14, Dec 21. Dec 7 is skipped, and COUNT still stops at 4 tries: no Dec 28.
    const e = make('RRULE:FREQ=WEEKLY;COUNT=4\nEXDATE;TZID=America/Chicago:20261207T090000');
    expect(when(occurrences(e, wall(2026, 11, 1), wall(2027, 3, 1)))).toEqual(['2026-11-30 09:00', '2026-12-14 09:00', '2026-12-21 09:00']);
  });

  test('several EXDATE lines, and one line with commas', () => {
    const e = make('RRULE:FREQ=WEEKLY;COUNT=4\nEXDATE;TZID=America/Chicago:20261207T090000,20261214T090000\nEXDATE;TZID=America/Chicago:20261221T090000');
    expect(when(occurrences(e, wall(2026, 11, 1), wall(2027, 3, 1)))).toEqual(['2026-11-30 09:00']);
  });

  test('BYDAY before the start in the first week is not an occurrence (Wed start with BYDAY=MO,WE)', () => {
    // Start Mon Nov 30; use BYDAY=SU,MO,FR with WKST=SU: Sunday Nov 29 is before the start, so the first is Mon Nov 30, then Fri Dec 4, Sun Dec 6, Mon Dec 7.
    const e = make('RRULE:FREQ=WEEKLY;WKST=SU;BYDAY=SU,MO,FR;COUNT=4');
    expect(when(occurrences(e, wall(2026, 11, 1), wall(2027, 3, 1)))).toEqual(['2026-11-30 09:00', '2026-12-04 09:00', '2026-12-06 09:00', '2026-12-07 09:00']);
  });

  test('rules we do not support give just the first occurrence', () => {
    for (const rule of ['RRULE:FREQ=MONTHLY;COUNT=5', 'RRULE:FREQ=DAILY;COUNT=5', 'RRULE:FREQ=WEEKLY;BYDAY=1FR;COUNT=5', 'RRULE:FREQ=WEEKLY;BYMONTH=12;COUNT=5']) {
      expect(when(occurrences(make(rule), wall(2026, 11, 1), wall(2027, 3, 1)))).toEqual(['2026-11-30 09:00']);
    }
  });

  test('a UTC DTSTART is converted to Austin time', () => {
    // 15:00 UTC on Dec 1 = 9:00 AM in Austin (-6).
    const [e] = parseIcs('BEGIN:VEVENT\nSUMMARY:Z\nDTSTART:20261201T150000Z\nDTEND:20261201T160000Z\nEND:VEVENT');
    expect(fmt(e.start)).toBe('2026-12-01 09:00');
  });

  test('an event that runs past midnight is in the next day\'s window too', () => {
    const [e] = parseIcs('BEGIN:VEVENT\nSUMMARY:Late\nDTSTART:20261130T233000\nDTEND:20261201T003000\nEND:VEVENT');
    expect(occurrences(e, wall(2026, 12, 1), wall(2026, 12, 2))).toHaveLength(1);  // still going at 12:00 AM on Dec 1
    expect(occurrences(e, wall(2026, 11, 30), wall(2026, 11, 30, 23, 30))).toHaveLength(0); // starts exactly at the window's end
  });
});
