import { describe, expect, test } from '@jest/globals';
import { gdcGraph } from '../data/gdc';
import { groups } from '../data/groups';
import { MapGraph } from '../types';
import { Item, dayLabel, groupByDay, groupFor, inRange, makeItems, mergeItems, rangeBounds, roomFor, search } from './events';
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
