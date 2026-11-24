// Everything the Find events screen needs from Firebase, in one go: the orgs, which ones I belong to,
// and the events I may see. Only built from orgData's functions; if any one org fails, the rest still show.
import { getMyRole, listOrgs, loadOrgEvents } from './orgData';
import { Org, OrgEvent } from './orgRules';

export type FindData = { orgs: Org[]; myOrgIds: string[]; events: OrgEvent[] };

export async function loadFindEvents(uid: string | null): Promise<FindData> {
  const orgs = await listOrgs();
  const mine = await Promise.all(orgs.map((o) => (uid ? getMyRole(o.id, uid).catch(() => null) : Promise.resolve(null))));
  const myOrgIds = orgs.filter((_, i) => mine[i] !== null).map((o) => o.id);
  // Public events for everyone; each org's members-only events are asked for only when I'm a member of it.
  const perOrg = await Promise.all(orgs.map((o) => loadOrgEvents(o.id, myOrgIds.includes(o.id)).catch(() => [] as OrgEvent[])));
  return { orgs, myOrgIds, events: perOrg.flat() };
}
