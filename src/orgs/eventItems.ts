// Org events -> the Item shape the lists and cards already use, plus the rules for which ones to show.
// Pure functions.
import { Item } from '../calendar/events';
import { austinWallFromUtc, wallMinutes } from '../calendar/time';
import { Org, OrgEvent } from './orgRules';

export function eventToItem(e: OrgEvent, orgName: string): Item {
  return {
    id: `${e.orgId}/${e.id}`,
    title: e.title,
    description: e.description,
    start: austinWallFromUtc(e.startMs),
    end: austinWallFromUtc(e.endMs),
    location: e.locationText,
    room: e.placeId,
    groupId: null,
    url: '',
    orgId: e.orgId,
    orgName,
    visibility: e.visibility,
    docId: e.id,
    createdBy: e.createdBy,
    source: e.source,
  };
}

// An "all-day" entry starts at midnight and lasts whole days (Google writes them like that).
export function isAllDay(item: Pick<Item, 'start' | 'end'>): boolean {
  const minutes = wallMinutes(item.start, item.end);
  return item.start.getHours() === 0 && item.start.getMinutes() === 0 && minutes > 0 && minutes % (24 * 60) === 0;
}

// Calendars hold "Study Days", "Finals" ... as all-day entries with no place. They are no use for finding
// a room, so they are hidden. An all-day entry WITH a place is kept.
export function worthShowing(item: Item): boolean {
  return !(isAllDay(item) && !item.room && !item.location.trim());
}

// Org events as items, hiding the useless all-day ones, earliest first.
export function itemsFromOrgEvents(events: OrgEvent[], orgs: Org[]): Item[] {
  const names = new Map(orgs.map((o) => [o.id, o.name]));
  return events
    .map((e) => eventToItem(e, names.get(e.orgId) ?? e.orgId))
    .filter(worthShowing)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title));
}
