// Tests for turning org events into list items. Times worked out by hand (Austin = UTC-6 in winter).
import { describe, expect, test } from '@jest/globals';
import { eventToItem, isAllDay, itemsFromOrgEvents, worthShowing } from './eventItems';
import { Org, OrgEvent } from './orgRules';
import { wall } from '../calendar/time';

const ev = (over: Partial<OrgEvent>): OrgEvent => ({
  id: 'e1', orgId: 'acm', title: 'T', description: '', startMs: Date.UTC(2026, 11, 3, 22, 0), endMs: Date.UTC(2026, 11, 3, 23, 0),
  placeId: null, locationText: '', visibility: 'public', createdBy: 'u', source: 'manual', ...over,
});
const orgs: Org[] = [{ id: 'acm', name: 'ACM', short: '', description: '', isPrivate: false, claimed: true }];

describe('itemsFromOrgEvents', () => {
  test('22:00Z on Dec 3 is 4:00 PM in Austin; the org name, room and badge fields come across', () => {
    const [item] = itemsFromOrgEvents([ev({ placeId: 'GDC-2.216', visibility: 'members' })], orgs);
    expect(item.start).toEqual(wall(2026, 12, 3, 16, 0));
    expect(item.end).toEqual(wall(2026, 12, 3, 17, 0));
    expect(item).toMatchObject({ orgName: 'ACM', room: 'GDC-2.216', visibility: 'members', id: 'acm/e1', docId: 'e1' });
  });
  test('an unknown org falls back to its id; the list is earliest first', () => {
    const list = itemsFromOrgEvents([
      ev({ id: 'b', orgId: 'zzz', startMs: Date.UTC(2026, 11, 4, 22) , endMs: Date.UTC(2026, 11, 4, 23) }),
      ev({ id: 'a' }),
    ], orgs);
    expect(list.map((i) => i.docId)).toEqual(['a', 'b']);
    expect(list[1].orgName).toBe('zzz');
  });
});

describe('all-day entries', () => {
  // Dec 7 2026 00:00 CST = 06:00Z; a full day later = Dec 8 06:00Z.
  const day = { startMs: Date.UTC(2026, 11, 7, 6), endMs: Date.UTC(2026, 11, 8, 6) };
  test('midnight to midnight is all-day; a 1-hour event, or midnight for 90 minutes, is not', () => {
    expect(isAllDay(eventToItem(ev(day), 'ACM'))).toBe(true);
    expect(isAllDay(eventToItem(ev({}), 'ACM'))).toBe(false);
    expect(isAllDay(eventToItem(ev({ startMs: day.startMs, endMs: day.startMs + 90 * 60000 }), 'ACM'))).toBe(false);
  });
  test('an all-day entry with no place is hidden ("Finals"); with a room or a location text it is kept', () => {
    expect(itemsFromOrgEvents([ev({ ...day, title: 'Finals' })], orgs)).toEqual([]);
    expect(itemsFromOrgEvents([ev({ ...day, locationText: 'Welch Patio' })], orgs)).toHaveLength(1);
    expect(itemsFromOrgEvents([ev({ ...day, placeId: 'GDC-2.100' })], orgs)).toHaveLength(1);
    expect(itemsFromOrgEvents([ev({ ...day, locationText: '   ' })], orgs)).toEqual([]);
  });
  test('worthShowing keeps ordinary events with no place', () => {
    const [x] = itemsFromOrgEvents([ev({})], orgs);
    expect(worthShowing(x)).toBe(true);
  });
});
