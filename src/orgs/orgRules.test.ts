// Tests for org rules. Every expected answer is worked out by hand in the comment above it.
import { describe, expect, jest, test } from '@jest/globals';
import {
  CODE_ALPHABET, EventForm, Org, buildEventDoc, clock, lengthText, makeInviteCode, normalizeCode,
  friendlyDbError, searchOrgs, stepStart, validateNewEvent,
} from './orgRules';
import { wall } from '../calendar/time';

const org = (id: string, name: string, short = '', isPrivate = false): Org =>
  ({ id, name, short, description: '', isPrivate, claimed: false });
const orgs = [
  org('acm', 'ACM', 'Association for Computing Machinery'),
  org('wics', 'WiCS', 'Women in Computer Science'),
  org('hacs', 'HACS', 'Hispanic Association for Computer Science'),
  org('demo', 'Demo Study Group', 'Practice private org', true),
];

describe('searchOrgs', () => {
  test('empty or blank query: everything', () => {
    expect(searchOrgs(orgs, '')).toHaveLength(4);
    expect(searchOrgs(orgs, '   ')).toHaveLength(4);
  });
  test('matches the name, ignoring capitals', () => {
    expect(searchOrgs(orgs, 'wics').map((o) => o.id)).toEqual(['wics']);
  });
  // "computer" appears in ACM's text? "Association for Computing Machinery" has "Computing", not "computer".
  // WiCS: "Women in Computer Science" yes. HACS: "...for Computer Science" yes. Demo: no.
  test('matches words in the short description', () => {
    expect(searchOrgs(orgs, 'computer').map((o) => o.id)).toEqual(['wics', 'hacs']);
  });
  test('no match: empty list', () => expect(searchOrgs(orgs, 'zzz')).toEqual([]));
});

describe('invite codes', () => {
  // random() returning 0 always picks index 0 = "A"; returning just under 1 picks the last = "9".
  test('six characters, from the first and last letters of the alphabet', () => {
    expect(makeInviteCode(() => 0)).toBe('AAAAAA');
    expect(makeInviteCode(() => 0.999999)).toBe('999999');
    expect(makeInviteCode(() => 0)).toHaveLength(6);
  });
  // 0.5 * 32 = index 16. Alphabet: A B C D E F G H J K L M N P Q R S ... (A=0, B=1, C=2, D=3, E=4, F=5,
  // G=6, H=7, J=8, K=9, L=10, M=11, N=12, P=13, Q=14, R=15, S=16) so index 16 is "S".
  test('a middle random number picks the letter at that spot', () => {
    expect(CODE_ALPHABET[16]).toBe('S');
    expect(makeInviteCode(() => 0.5)).toBe('SSSSSS');
  });
  test('the alphabet has 32 characters and nothing easy to mix up', () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(CODE_ALPHABET).not.toMatch(/[IO01]/);
  });
  test('real random codes only use the alphabet', () => {
    for (let i = 0; i < 50; i++) expect(makeInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  test('typed codes are trimmed, spaces removed, upper-cased', () => {
    expect(normalizeCode('  ab c-12 ')).toBe('ABC-12');
    expect(normalizeCode('x'.repeat(100))).toHaveLength(64);
  });
});

describe('time steppers', () => {
  test('clock: midnight, noon, half past noon, afternoon, last minute of the day', () => {
    expect(clock(0)).toBe('12:00 AM');
    expect(clock(12 * 60)).toBe('12:00 PM');
    expect(clock(12 * 60 + 30)).toBe('12:30 PM');
    expect(clock(16 * 60)).toBe('4:00 PM');
    expect(clock(23 * 60 + 59)).toBe('11:59 PM');
  });
  test('stepStart moves by the amount and stops at both ends of the day', () => {
    expect(stepStart(600, 30)).toBe(630);
    expect(stepStart(0, -30)).toBe(0);
    expect(stepStart(23 * 60 + 30, 30)).toBe(23 * 60 + 30);
  });
  test('lengthText', () => {
    expect(lengthText(30)).toBe('30 min');
    expect(lengthText(60)).toBe('1 hour');
    expect(lengthText(90)).toBe('1.5 hours');
    expect(lengthText(120)).toBe('2 hours');
  });
});

describe('validateNewEvent and buildEventDoc', () => {
  const form: EventForm = {
    title: 'Pizza night', description: '', day: wall(2026, 12, 2), startMinutes: 18 * 60, lengthMinutes: 90,
    placeId: 'GDC-2.100', locationText: '', visibility: 'public',
  };
  const open = { isPrivate: false }, closed = { isPrivate: true };

  test('a good form has no problem', () => expect(validateNewEvent(form, open)).toBeNull());
  test('title is needed (spaces do not count), and has a top size of 80', () => {
    expect(validateNewEvent({ ...form, title: '  ' }, open)).toMatch(/title/i);
    expect(validateNewEvent({ ...form, title: 'x'.repeat(81) }, open)).toMatch(/80/);
    expect(validateNewEvent({ ...form, title: 'x'.repeat(80) }, open)).toBeNull();
  });
  test('length must be above zero and at most a day', () => {
    expect(validateNewEvent({ ...form, lengthMinutes: 0 }, open)).toMatch(/how long/i);
    expect(validateNewEvent({ ...form, lengthMinutes: 1441 }, open)).toMatch(/how long/i);
  });
  test('a private org cannot post a public event, but members-only is fine', () => {
    expect(validateNewEvent(form, closed)).toMatch(/members-only/i);
    expect(validateNewEvent({ ...form, visibility: 'members' }, closed)).toBeNull();
  });

  // Dec 2 2026 is winter, Austin = UTC-6. 6:00 PM = 18:00 -> 00:00 UTC on Dec 3. Lasting 90 min: ends 01:30 UTC Dec 3.
  test('start and end are real moments in UTC (6:00 PM CST for 90 minutes)', () => {
    const doc = buildEventDoc(form, open);
    expect(doc.startMs).toBe(Date.UTC(2026, 11, 3, 0, 0));
    expect(doc.endMs).toBe(Date.UTC(2026, 11, 3, 1, 30));
    expect(doc.source).toBe('manual');
    expect(doc.visibility).toBe('public');
  });
  test('optional fields are left out when empty; a room wins over free text', () => {
    const doc = buildEventDoc({ ...form, description: '  ', locationText: 'Welch Patio' }, open);
    expect(doc).not.toHaveProperty('description');
    expect(doc.placeId).toBe('GDC-2.100');
    expect(doc).not.toHaveProperty('locationText');
    const text = buildEventDoc({ ...form, placeId: null, locationText: ' Welch Patio ', description: ' hi ' }, open);
    expect(text.locationText).toBe('Welch Patio');
    expect(text.description).toBe('hi');
    expect(text).not.toHaveProperty('placeId');
  });
  test('a private org always saves members-only', () => {
    expect(buildEventDoc(form, closed).visibility).toBe('members');
  });
  test('an event that runs past midnight ends on the next day', () => {
    // 11:30 PM for 60 min on Dec 2 (UTC-6): starts 05:30 UTC Dec 3, ends 06:30 UTC Dec 3.
    const doc = buildEventDoc({ ...form, startMinutes: 23 * 60 + 30, lengthMinutes: 60 }, open);
    expect(doc.endMs - doc.startMs).toBe(60 * 60000);
    expect(doc.startMs).toBe(Date.UTC(2026, 11, 3, 5, 30));
  });
});

describe('friendlyDbError', () => {
  test('permission-denied mentions the code; unavailable mentions internet and that maps still work', () => {
    expect(friendlyDbError({ code: 'permission-denied' })).toMatch(/code/i);
    expect(friendlyDbError({ code: 'unavailable' })).toMatch(/internet/i);
    expect(friendlyDbError({ code: 'unavailable' })).toMatch(/maps and directions still work/i);
    expect(friendlyDbError({ code: 'unauthenticated' })).toMatch(/sign in/i);
  });
  test('unknown errors get a general message and are logged with their code', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(friendlyDbError({ code: 'weird' })).toMatch(/something went wrong/i);
    expect(warn.mock.calls[0].join(' ')).toContain('weird');
    warn.mockRestore();
  });
});
