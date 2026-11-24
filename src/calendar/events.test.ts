import { describe, expect, test } from '@jest/globals';
import { gdcGraph } from '../data/gdc';
import { groups } from '../data/groups';
import { MapGraph } from '../types';
import {
  FEED_ORG, Item, dayLabel, forOrgs, formatTime, formatWhen, groupByDay, groupFor, inRange, makeItems, mergeItems,
  rangeBounds, rangeLabel, roomFor, search, shiftDate,
} from './events';
import { parseIcs } from './ics';
import { readRepoFile } from './readRepoFile';
import { wall } from './time';

// Same snapshot and same calendar as ics.test.ts: Nov 24, 2026 is a Tuesday, Dec 4 a Friday.
const feed = parseIcs(readRepoFile('data/cs-calendar.ics'));
const titles = (list: Item[]) => list.map((i) => i.title);
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// A bare item for the made-up range tests.
const item = (start: Date, end: Date, title = 'x'): Item => ({
  id: `${title}@${start.getTime()}`, title, description: '', start, end, location: '', room: null, groupId: null, url: '',
});

describe('roomFor: the patterns found in the org calendars (data/acm-cal.ics, hacs.ics, wics.ics)', () => {
  // Each answer was read off the calendars and the map data (rooms 3.314, 2.506, 5.302, 1.304, 2.100 exist;
  // 2.902 is not on the map; "UTC 1.118" is another building).
  test('a room with a note after it', () => {
    expect(roomFor('GDC 3.314 (ACM Office)', gdcGraph)).toBe('GDC-3.314');
    expect(roomFor('GDC 2.506 (Teaching Lab)', gdcGraph)).toBe('GDC-2.506');
  });
  test('no building written (old ACM entries): assume GDC', () => {
    expect(roomFor('5.302', gdcGraph)).toBe('GDC-5.302');
    expect(roomFor(' 1.304 ', gdcGraph)).toBe('GDC-1.304');
  });
  test('"GDC Atrium" is room 2.100 (also with other capitals)', () => {
    expect(roomFor('GDC Atrium', gdcGraph)).toBe('GDC-2.100');
    expect(roomFor('gdc atrium', gdcGraph)).toBe('GDC-2.100');
  });
  test('empty location: the room written in the description is used', () => {
    expect(roomFor('', gdcGraph, 'Join us at GDC 1.304 for pizza')).toBe('GDC-1.304');
    expect(roomFor('', gdcGraph, 'room: gdc 1.304.')).toBe('GDC-1.304');
  });
  test('the description is NOT used when there is a location (even a non-GDC one)', () => {
    expect(roomFor('Welch Patio', gdcGraph, 'also GDC 1.304')).toBeNull();
  });
  test('not GDC, not on the map, or not a room -> null (the screens show the text)', () => {
    expect(roomFor('UTC 1.118', gdcGraph)).toBeNull();
    expect(roomFor('Welch Patio', gdcGraph)).toBeNull();
    expect(roomFor('Texas Union', gdcGraph)).toBeNull();
    expect(roomFor('https://utexas.zoom.us/j/99602011660', gdcGraph)).toBeNull();
    expect(roomFor('Gates Dell Complex, 2317 Speedway, Austin, TX 78712, USA', gdcGraph)).toBeNull();
    expect(roomFor('GDC 6th Floor Bridge', gdcGraph)).toBeNull();
    expect(roomFor('GDC 2.902', gdcGraph)).toBeNull();
    expect(roomFor('', gdcGraph, 'We meet in UTC 1.118')).toBeNull();
  });
});

describe('roomFor', () => {
  test('the 4 real locations of the feed map to points that exist on our map', () => {
    expect(roomFor('GDC 2.100 (Atrium)', gdcGraph)).toBe('GDC-2.100'); // the "(Atrium)" part is ignored
    expect(roomFor('GDC 2.216', gdcGraph)).toBe('GDC-2.216');
    expect(roomFor('GDC 4.516', gdcGraph)).toBe('GDC-4.516');
    expect(roomFor('GDC 6.816', gdcGraph)).toBe('GDC-6.816');
  });

  test('other buildings, "Zoom", nothing, or rooms we have not mapped -> null', () => {
    expect(roomFor('Zoom', gdcGraph)).toBeNull();
    expect(roomFor('PAI 3.02', gdcGraph)).toBeNull();
    expect(roomFor('', gdcGraph)).toBeNull();
    expect(roomFor('GDC 9.999', gdcGraph)).toBeNull(); // looks right, but there is no such point
    expect(roomFor('GDC', gdcGraph)).toBeNull();
  });

  test('capitals do not matter, and a hallway point is never a room', () => {
    expect(roomFor('gdc 2.216', gdcGraph)).toBe('GDC-2.216');
    const graph: MapGraph = {
      floors: [],
      nodes: [{ id: 'GDC-2.555', kind: 'hall', floor: 'GDC-2', x: 0, y: 0 }, { id: 'GDC-2.302A', kind: 'room', floor: 'GDC-2', x: 1, y: 1 }],
      edges: [],
    };
    expect(roomFor('GDC 2.555', graph)).toBeNull();
    expect(roomFor('GDC 2.302a', graph)).toBe('GDC-2.302A'); // rooms can end in a letter
  });
});

describe('groupFor', () => {
  test('across the whole feed exactly these 9 events get a group (worked out by hand from the titles and descriptions)', () => {
    // Titles with a keyword: AMRL, LARG, NLL, RobIn, Project AMAZE, Texas Convergent, DiRP, FoCS.
    // "LLM Reasoning Reading Group" has no keyword in its title, but its description mentions DiRP and the Directed Reading Program.
    // The other 19 events (office hours, "Group Meeting", PhD proposals ...) match nothing.
    const found = feed.flatMap((e) => { const g = groupFor(e.title, e.description); return g ? [[e.title, g.id]] : []; });
    expect(found.sort()).toEqual([
      ['AMRL Lab Meeting', 'amrl'],
      ['FoCS: Finals Fuel Stop with Dante', 'focs'],
      ['LARG Meeting', 'larg'],
      ['LLM Reasoning Reading Group', 'dirp'],
      ['NLL: NLP Reading Group', 'nll'],
      ['Phil.AI DiRP', 'dirp'],
      ['Project AMAZE (ECLAIR)', 'amaze'],
      ['RobIn Lab Meeting', 'robin'],
      ['Texas Convergent Forge Team Meeting', 'convergent'],
    ]);
  });

  test('a keyword in the title beats one in the description', () => {
    expect(groupFor('FoCS: Study night', 'with the LARG folks')!.id).toBe('focs');
    expect(groupFor('Study night', 'with the LARG folks')!.id).toBe('larg');
  });

  test('only whole words count, and capitals do not matter', () => {
    expect(groupFor('Calarge meeting', '')).toBeNull();      // LARG inside another word
    expect(groupFor('larg meeting', '')!.id).toBe('larg');
    expect(groupFor('Weekly sync', '')).toBeNull();
    expect(groupFor('SE+NLP Reading Group', '')).toBeNull(); // NLP is not NLL
  });

  test('every group has an id nobody else has and at least one keyword', () => {
    expect(new Set(groups.map((g) => g.id)).size).toBe(groups.length);
    for (const g of groups) expect(g.keywords.length).toBeGreaterThan(0);
  });
});

describe('makeItems', () => {
  // Friday Dec 4, 2026 from the feed. Worked out by hand (events that happen that day, in start order, ties by title):
  //   09:00 Group Meeting
  //   11:00 Computing & Canines (GDC 2.100), Elias Lab meeting, FarmBrain Sync, Group Meeting
  //   12:00 RobIn Lab Meeting (GDC 4.516), SE+NLP Reading Group
  //   15:00 AMRL Lab Meeting, Honors Thesis Defense: William Bolduc, Yihan (Joey) Zhou's PhD Proposal
  //   16:00 Venkat Arun Group Meeting (GDC 6.816)
  const dec4 = makeItems(feed, wall(2026, 12, 4), wall(2026, 12, 5), gdcGraph);

  test('Friday Dec 4 has these 11 items, earliest first', () => {
    expect(titles(dec4)).toEqual([
      'Group Meeting', 'Computing & Canines', 'Elias Lab meeting', 'FarmBrain Sync', 'Group Meeting',
      'RobIn Lab Meeting', 'SE+NLP Reading Group',
      'AMRL Lab Meeting', 'Honors Thesis Defense: William Bolduc', "Yihan (Joey) Zhou's PhD Proposal",
      'Venkat Arun Group Meeting',
    ]);
    expect(dec4.map((i) => fmt(i.start).split(' ')[1])).toEqual(['09:00', '11:00', '11:00', '11:00', '11:00', '12:00', '12:00', '15:00', '15:00', '15:00', '16:00']);
  });

  test('items know their room and group', () => {
    const by = (t: string) => dec4.find((i) => i.title === t)!;
    expect(by('Computing & Canines').room).toBe('GDC-2.100');
    expect(by('RobIn Lab Meeting').room).toBe('GDC-4.516');
    expect(by('Venkat Arun Group Meeting').room).toBe('GDC-6.816');
    expect(by('Elias Lab meeting').room).toBeNull(); // a room booking: the feed has no room number
    expect(by('RobIn Lab Meeting').groupId).toBe('robin');
    expect(by('AMRL Lab Meeting').groupId).toBe('amrl');
    expect(by('FarmBrain Sync').groupId).toBeNull();
  });

  test('every item has its own id, even when the same event repeats', () => {
    const month = makeItems(feed, wall(2026, 11, 1), wall(2027, 1, 1), gdcGraph);
    expect(new Set(month.map((i) => i.id)).size).toBe(month.length);
  });
});

describe('search', () => {
  // Window Nov 24 - Dec 31, 2026. Counts worked out by hand from the feed.
  const list = makeItems(feed, wall(2026, 11, 24), wall(2027, 1, 1), gdcGraph);

  test('finds a word in the title', () => {
    expect(titles(search(list, 'lecture'))).toEqual(['Distinguished Lecture - Thomas Ball']); // happens once, Dec 9
    expect(search(list, 'kernel')).toHaveLength(6); // Tuesdays Nov 24, Dec 1, 8, 15, 22, 29
  });

  test('finds a word in the description, and capitals do not matter', () => {
    expect(titles(search(list, 'THERAPY dogs'))).toEqual(['Computing & Canines']); // only its description says it
  });

  test('"reading group": NLL Nov 27 (1) + SE+NLP Dec 4 (1) + LLM Reasoning Dec 2 and 9 (2) = 4 items', () => {
    expect(search(list, 'reading group')).toHaveLength(4);
  });

  test('finds by group name too: "directed reading" -> the DiRP group: Phil.AI DiRP Dec 3 + LLM Reasoning Dec 2, 9', () => {
    const found = search(list, 'directed reading');
    expect(found.map((i) => i.groupId)).toEqual(['dirp', 'dirp', 'dirp']);
    expect(titles(found)).toEqual(['LLM Reasoning Reading Group', 'Phil.AI DiRP', 'LLM Reasoning Reading Group']);
  });

  test('empty search keeps everything; no match gives nothing', () => {
    expect(search(list, '')).toBe(list);
    expect(search(list, '   ')).toBe(list);
    expect(search(list, 'zzzzz')).toEqual([]);
  });
});

describe('inRange', () => {
  const month = makeItems(feed, wall(2026, 11, 1), wall(2027, 1, 1), gdcGraph); // all of Nov and Dec 2026

  test('day: Tuesday Nov 24 has 3 items (Kernel 11:00, CS 376 OH 11:00, CS303E 15:45)', () => {
    expect(titles(inRange(month, 'day', wall(2026, 11, 24, 18, 0)))).toEqual(['CS 376 OH', 'Kernel Development Meetup', 'CS303E Office Hours']);
  });

  test('week: Sunday Nov 22 to Saturday Nov 28 has 12 items (counted by hand: Kernel 1, CS303E 2, CS 376 OH 2, Elias, NLL, SCEA, RobIn, AMAZE, Venkat, FarmBrain)', () => {
    expect(inRange(month, 'week', wall(2026, 11, 25))).toHaveLength(12);
  });

  test('month: November has 15 items', () => {
    expect(inRange(month, 'month', wall(2026, 11, 15))).toHaveLength(15);
  });

  test('bounds: a day is midnight to midnight, a week is Sunday to Sunday, a month is the 1st to the 1st', () => {
    const fmtBounds = (r: 'day' | 'week' | 'month', d: Date) => { const b = rangeBounds(r, d); return `${fmt(b.from)} - ${fmt(b.to)}`; };
    expect(fmtBounds('day', wall(2026, 11, 25, 14, 30))).toBe('11/25 00:00 - 11/26 00:00');
    expect(fmtBounds('week', wall(2026, 11, 25, 14, 30))).toBe('11/22 00:00 - 11/29 00:00');
    expect(fmtBounds('month', wall(2026, 11, 25))).toBe('11/1 00:00 - 12/1 00:00');
    expect(fmtBounds('month', wall(2027, 2, 10))).toBe('2/1 00:00 - 3/1 00:00'); // February 2027 has 28 days
  });

  test('day edges at midnight', () => {
    const endsAtMidnight = item(wall(2026, 11, 24, 22, 0), wall(2026, 11, 25, 0, 0), 'ends');
    const startsAtMidnight = item(wall(2026, 11, 25, 0, 0), wall(2026, 11, 25, 1, 0), 'starts');
    const overnight = item(wall(2026, 11, 24, 23, 30), wall(2026, 11, 25, 0, 30), 'overnight');
    const list = [endsAtMidnight, startsAtMidnight, overnight];
    expect(titles(inRange(list, 'day', wall(2026, 11, 24)))).toEqual(['ends', 'overnight']);
    expect(titles(inRange(list, 'day', wall(2026, 11, 25)))).toEqual(['starts', 'overnight']); // still going at 12:00 AM
  });

  test('week edges: Sunday 00:00 starts a week, Saturday 23:59 is its last minute', () => {
    const sunday = item(wall(2026, 11, 22, 0, 0), wall(2026, 11, 22, 1, 0), 'sun');
    const saturday = item(wall(2026, 11, 28, 23, 59), wall(2026, 11, 29, 0, 0), 'sat');
    const nextSunday = item(wall(2026, 11, 29, 0, 0), wall(2026, 11, 29, 1, 0), 'nextSun');
    expect(titles(inRange([sunday, saturday, nextSunday], 'week', wall(2026, 11, 25)))).toEqual(['sun', 'sat']);
  });

  test('month edges: Nov 30 23:59 is November, Dec 1 00:00 is December', () => {
    const last = item(wall(2026, 11, 30, 23, 59), wall(2026, 12, 1, 0, 0), 'last');
    const first = item(wall(2026, 12, 1, 0, 0), wall(2026, 12, 1, 1, 0), 'first');
    expect(titles(inRange([last, first], 'month', wall(2026, 11, 10)))).toEqual(['last']);
    expect(titles(inRange([last, first], 'month', wall(2026, 12, 10)))).toEqual(['first']);
  });
});

describe('groupByDay', () => {
  test('Today, Tomorrow, then "Fri, Dec 4": counted in calendar days', () => {
    // now = Tue Nov 24, 10:00. Nov 24 -> Today, Nov 25 -> Tomorrow, Dec 4 is a Friday.
    const now = wall(2026, 11, 24, 10, 0);
    const list = [
      item(wall(2026, 12, 4, 15, 0), wall(2026, 12, 4, 16, 0), 'late'),
      item(wall(2026, 11, 24, 15, 45), wall(2026, 11, 24, 16, 0), 'today'),
      item(wall(2026, 12, 4, 9, 0), wall(2026, 12, 4, 10, 0), 'early'),
      item(wall(2026, 11, 25, 8, 0), wall(2026, 11, 25, 9, 0), 'tomorrow'),
    ];
    expect(groupByDay(list, now).map((g) => [g.label, titles(g.items)])).toEqual([
      ['Today', ['today']], ['Tomorrow', ['tomorrow']], ['Fri, Dec 4', ['early', 'late']],
    ]);
  });

  test('around midnight: at 11:50 PM, 12:10 AM is already "Tomorrow"', () => {
    const now = wall(2026, 11, 24, 23, 50);
    expect(dayLabel(wall(2026, 11, 25, 0, 10), now)).toBe('Tomorrow');
    expect(dayLabel(wall(2026, 11, 24, 23, 55), now)).toBe('Today');
    expect(dayLabel(wall(2026, 11, 26, 9, 0), now)).toBe('Thu, Nov 26'); // Nov 26, 2026 is a Thursday
  });

  test('an item that runs past midnight stays under the day it starts', () => {
    const now = wall(2026, 11, 24, 10, 0);
    const groups = groupByDay([item(wall(2026, 11, 24, 23, 30), wall(2026, 11, 25, 0, 30), 'late')], now);
    expect(groups.map((g) => g.label)).toEqual(['Today']);
  });

  test('no items, no groups', () => {
    expect(groupByDay([], wall(2026, 11, 24))).toEqual([]);
  });
});

describe('mergeItems', () => {
  test('two lists become one, earliest first (ties by title)', () => {
    const a = [item(wall(2026, 11, 24, 9, 0), wall(2026, 11, 24, 10, 0), 'b'), item(wall(2026, 11, 24, 12, 0), wall(2026, 11, 24, 13, 0), 'd')];
    const b = [item(wall(2026, 11, 24, 9, 0), wall(2026, 11, 24, 10, 0), 'a'), item(wall(2026, 11, 24, 11, 0), wall(2026, 11, 24, 12, 0), 'c')];
    expect(titles(mergeItems(a, b))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('formatTime and formatWhen', () => {
  const at = (h1: number, m1: number, h2: number, m2: number, day = 4) => item(wall(2026, 12, day, h1, m1), wall(2026, 12, day + (h2 < h1 ? 1 : 0), h2, m2));
  test('AM/PM is shown once when start and end agree', () => {
    expect(formatTime(at(15, 0, 16, 30))).toBe('3:00–4:30 PM');
    expect(formatTime(at(9, 0, 10, 0))).toBe('9:00–10:00 AM');
  });
  test('and twice when the event crosses noon or midnight', () => {
    expect(formatTime(at(11, 30, 13, 0))).toBe('11:30 AM–1:00 PM');
    expect(formatTime(at(23, 30, 0, 30))).toBe('11:30 PM–12:30 AM');
  });
  test('noon is 12 PM', () => {
    expect(formatTime(at(12, 0, 13, 0))).toBe('12:00–1:00 PM');
  });
  test('with the day: Wed Dec 9, 4:00-5:15 PM', () => {
    expect(formatWhen(item(wall(2026, 12, 9, 16, 0), wall(2026, 12, 9, 17, 15)))).toBe('Wed, Dec 9 · 4:00–5:15 PM');
  });
});

describe('forOrgs (the "My orgs" filter)', () => {
  // Three made-up items: two from org "acm", one from "wics"; plus one feed item (no org id).
  const mk = (title: string, orgId?: string): Item => ({ ...item(wall(2026, 12, 2, 10), wall(2026, 12, 2, 11)), title, orgId });
  const list = [mk('a1', 'acm'), mk('a2', 'acm'), mk('w1', 'wics'), mk('feed')];
  test('keeps only items of my orgs', () => {
    expect(titles(forOrgs(list, ['acm']))).toEqual(['a1', 'a2']);
    expect(titles(forOrgs(list, ['acm', 'wics']))).toEqual(['a1', 'a2', 'w1']);
  });
  test('no orgs -> nothing; feed items are never "mine"', () => {
    expect(forOrgs(list, [])).toEqual([]);
    expect(titles(forOrgs(list, ['acm', 'wics']))).not.toContain('feed');
  });
});

describe('search also looks at the organization and the place', () => {
  const base = item(wall(2026, 12, 2, 10), wall(2026, 12, 2, 11));
  const list: Item[] = [
    { ...base, title: 'Pizza', orgName: 'WiCS', location: '' },
    { ...base, title: 'Talk', orgName: 'ACM', location: 'Welch Patio' },
  ];
  test('by org name (any capitals)', () => expect(titles(search(list, 'wics'))).toEqual(['Pizza']));
  test('by the place text', () => expect(titles(search(list, 'patio'))).toEqual(['Talk']));
});

describe('feed events get an organization name', () => {
  test('a group name when one matches, "UT CS calendar" otherwise', () => {
    const list = makeItems(feed, wall(2026, 11, 24), wall(2027, 1, 1), gdcGraph);
    const by = (title: string) => list.find((i) => i.title === title)!;
    expect(by('AMRL Lab Meeting').orgName).toBe('AMRL');
    expect(by('FarmBrain Sync').orgName).toBe(FEED_ORG);
  });
});

describe('shiftDate and rangeLabel (the date strip)', () => {
  const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  test('arrows move by a day, a week or a month', () => {
    expect(ymd(shiftDate(wall(2026, 11, 30), 'day', 1))).toBe('2026-12-1');
    expect(ymd(shiftDate(wall(2026, 11, 30), 'day', -1))).toBe('2026-11-29');
    expect(ymd(shiftDate(wall(2026, 11, 25), 'week', 1))).toBe('2026-12-2');
    expect(ymd(shiftDate(wall(2026, 11, 25), 'week', -1))).toBe('2026-11-18');
    expect(ymd(shiftDate(wall(2026, 12, 15), 'month', 1))).toBe('2027-1-15');   // across the new year
    expect(ymd(shiftDate(wall(2026, 12, 15), 'month', -1))).toBe('2026-11-15');
  });
  test('a month arrow keeps the last day when the next month is shorter', () => {
    expect(ymd(shiftDate(wall(2027, 1, 31), 'month', 1))).toBe('2027-2-28');    // February 2027 has 28 days
    expect(ymd(shiftDate(wall(2027, 3, 31), 'month', -1))).toBe('2027-2-28');
    expect(ymd(shiftDate(wall(2026, 11, 30), 'month', 1))).toBe('2026-12-30');
  });
  test('labels (now = Tue Nov 24, 2026)', () => {
    const now = wall(2026, 11, 24, 10, 0);
    expect(rangeLabel('day', wall(2026, 11, 24), now)).toBe('Today');
    expect(rangeLabel('day', wall(2026, 11, 25), now)).toBe('Tomorrow');
    expect(rangeLabel('day', wall(2026, 12, 4), now)).toBe('Fri, Dec 4');
    expect(rangeLabel('week', wall(2026, 11, 25), now)).toBe('Nov 22 – 28');        // Sunday Nov 22 to Saturday Nov 28
    expect(rangeLabel('week', wall(2026, 12, 1), now)).toBe('Nov 29 – Dec 5');      // a week that crosses two months
    expect(rangeLabel('month', wall(2026, 11, 24), now)).toBe('November 2026');
    expect(rangeLabel('month', wall(2027, 1, 5), now)).toBe('January 2027');
  });
});
