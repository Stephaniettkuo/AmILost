// Talking to Firestore about orgs, members, invite codes and events. Thin on purpose: the rules for what
// is allowed live in firestore.rules (enforced by Firebase), and the logic worth testing lives in
// orgRules.ts and importIcs.ts. Errors are Firebase's; screens pass them to friendlyDbError.
import {
  Timestamp, collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, query, serverTimestamp, setDoc, updateDoc,
  where, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ImportedEvent, importDocId } from './importIcs';
import { NewEventDoc, Org, OrgEvent, Role, Visibility, makeInviteCode, normalizeCode } from './orgRules';

// Reads use getDocFromServer / getDocsFromServer on purpose: the plain getDocs answers "nothing here" from an
// empty local cache when the server can't be reached, which looks like "no organizations" instead of an error.
//
// Every call below gives up after 10 seconds instead of waiting forever (when the database is unreachable
// the Firebase library just keeps trying, and a screen would spin without end). A write that times out may
// still go through later, so the message says "try again" and the screens reload afterwards.
export const TIMEOUT_MS = 10000;
function guard<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return (...args: A) => new Promise<R>((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { code: 'unavailable' })), TIMEOUT_MS);
    fn(...args).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// ---------- Orgs and membership ----------

const asOrg = (id: string, d: Record<string, unknown>): Org => ({
  id,
  name: String(d.name ?? id),
  short: String(d.short ?? ''),
  description: String(d.description ?? ''),
  isPrivate: d.isPrivate === true,
  claimed: d.claimed === true,
  calendarUrl: typeof d.calendarUrl === 'string' && d.calendarUrl ? d.calendarUrl : undefined,
});

async function listOrgsImpl(): Promise<Org[]> {
  const snap = await getDocsFromServer(collection(db, 'orgs'));
  return snap.docs.map((d) => asOrg(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
}

async function getOrgImpl(orgId: string): Promise<Org | null> {
  const snap = await getDocFromServer(doc(db, 'orgs', orgId));
  return snap.exists() ? asOrg(snap.id, snap.data()) : null;
}

// My role in an org, or null when I'm not a member. (You may read your own member document.)
async function getMyRoleImpl(orgId: string, uid: string): Promise<Role | null> {
  const snap = await getDocFromServer(doc(db, 'orgs', orgId, 'members', uid));
  if (!snap.exists()) return null;
  return snap.data().role === 'admin' ? 'admin' : 'member';
}

function joinPublicOrgImpl(orgId: string, uid: string): Promise<void> {
  return setDoc(doc(db, 'orgs', orgId, 'members', uid), { role: 'member', joinedAt: serverTimestamp() });
}

function joinWithInviteCodeImpl(orgId: string, uid: string, code: string): Promise<void> {
  return setDoc(doc(db, 'orgs', orgId, 'members', uid), {
    role: 'member', joinedAt: serverTimestamp(), inviteCode: normalizeCode(code),
  });
}

// "I'm an officer": a valid claim code makes you an admin; then the org is marked claimed.
async function claimOrgImpl(orgId: string, uid: string, code: string): Promise<void> {
  await setDoc(doc(db, 'orgs', orgId, 'members', uid), {
    role: 'admin', joinedAt: serverTimestamp(), claimCode: normalizeCode(code),
  });
  await updateDoc(doc(db, 'orgs', orgId), { claimed: true });
}

function leaveOrgImpl(orgId: string, uid: string): Promise<void> {
  return deleteDoc(doc(db, 'orgs', orgId, 'members', uid));
}

// ---------- Admin: org details and invite codes ----------

function updateOrgDescriptionImpl(orgId: string, description: string): Promise<void> {
  return updateDoc(doc(db, 'orgs', orgId), { description: description.trim() });
}

function updateOrgCalendarUrlImpl(orgId: string, calendarUrl: string): Promise<void> {
  return updateDoc(doc(db, 'orgs', orgId), { calendarUrl });
}

// Making an org private also turns its public events into members-only ones (the rules say a private
// org's events must be members-only, and old public ones would stay readable by everyone).
async function setOrgPrivateImpl(orgId: string, isPrivate: boolean): Promise<void> {
  await updateDoc(doc(db, 'orgs', orgId), { isPrivate });
  if (!isPrivate) return;
  const open = await getDocsFromServer(query(collection(db, 'orgs', orgId, 'events'), where('visibility', '==', 'public')));
  for (let i = 0; i < open.docs.length; i += 400) {
    const batch = writeBatch(db);
    open.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { visibility: 'members' }));
    await batch.commit();
  }
}

async function listInviteCodesImpl(orgId: string): Promise<string[]> {
  const snap = await getDocsFromServer(collection(db, 'orgs', orgId, 'inviteCodes'));
  return snap.docs.map((d) => d.id).sort();
}

// Makes a random 6-character code. (If it happens to exist already, setting it again changes nothing.)
async function createInviteCodeImpl(orgId: string): Promise<string> {
  const code = makeInviteCode();
  await setDoc(doc(db, 'orgs', orgId, 'inviteCodes', code), {});
  return code;
}

function deleteInviteCodeImpl(orgId: string, code: string): Promise<void> {
  return deleteDoc(doc(db, 'orgs', orgId, 'inviteCodes', code));
}

// ---------- Events ----------

const asEvent = (orgId: string, id: string, d: Record<string, unknown>): OrgEvent => ({
  id, orgId,
  title: String(d.title ?? ''),
  description: String(d.description ?? ''),
  startMs: (d.start as Timestamp).toMillis(),
  endMs: (d.end as Timestamp).toMillis(),
  placeId: typeof d.placeId === 'string' ? d.placeId : null,
  locationText: String(d.locationText ?? ''),
  visibility: d.visibility === 'members' ? 'members' : 'public',
  createdBy: String(d.createdBy ?? ''),
  source: d.source === 'import' ? 'import' : 'manual',
});

// Events of one org that I may see. Rules are not filters: a query must only ask for what I may read.
// Everyone may read the public ones; members-only ones are asked for separately, only by members.
async function loadOrgEventsImpl(orgId: string, isMember: boolean): Promise<OrgEvent[]> {
  const events = collection(db, 'orgs', orgId, 'events');
  const asked = [getDocsFromServer(query(events, where('visibility', '==', 'public')))];
  if (isMember) asked.push(getDocsFromServer(query(events, where('visibility', '==', 'members'))));
  const snaps = await Promise.all(asked);
  return snaps.flatMap((s) => s.docs.map((d) => asEvent(orgId, d.id, d.data())));
}

const toDoc = (e: NewEventDoc, uid: string) => ({
  title: e.title,
  ...(e.description ? { description: e.description } : {}),
  start: Timestamp.fromMillis(e.startMs),
  end: Timestamp.fromMillis(e.endMs),
  ...(e.placeId ? { placeId: e.placeId } : {}),
  ...(e.locationText ? { locationText: e.locationText } : {}),
  visibility: e.visibility,
  createdBy: uid,
  source: e.source,
});

async function postEventImpl(orgId: string, uid: string, e: NewEventDoc): Promise<void> {
  await setDoc(doc(collection(db, 'orgs', orgId, 'events')), toDoc(e, uid));
}

// Editing replaces the event; `createdBy` must stay the person who first posted it (the rules insist).
function updateEventImpl(orgId: string, eventId: string, createdBy: string, e: NewEventDoc): Promise<void> {
  return setDoc(doc(db, 'orgs', orgId, 'events', eventId), { ...toDoc(e, createdBy), updatedAt: serverTimestamp() });
}

function deleteEventImpl(orgId: string, eventId: string): Promise<void> {
  return deleteDoc(doc(db, 'orgs', orgId, 'events', eventId));
}

// Save imported events. The id comes from the iCal UID, so importing again UPDATES instead of duplicating.
// An event that already exists keeps its original `createdBy` (the rules don't allow changing it).
// Returns how many were new and how many were updated.
async function importEventsImpl(
  orgId: string, uid: string, imports: ImportedEvent[], visibility: Visibility,
): Promise<{ added: number; updated: number }> {
  const existing = await getDocsFromServer(query(collection(db, 'orgs', orgId, 'events'), where('source', '==', 'import')));
  const owner = new Map(existing.docs.map((d) => [d.id, String(d.data().createdBy ?? uid)]));
  let added = 0, updated = 0;
  for (let i = 0; i < imports.length; i += 400) {
    const batch = writeBatch(db);
    for (const e of imports.slice(i, i + 400)) {
      const id = importDocId(e.importUid);
      const old = owner.has(id);
      old ? updated++ : added++;
      batch.set(doc(db, 'orgs', orgId, 'events', id), {
        title: e.title,
        ...(e.description ? { description: e.description } : {}),
        start: Timestamp.fromMillis(e.startMs),
        end: Timestamp.fromMillis(e.endMs),
        ...(e.placeId ? { placeId: e.placeId } : e.locationText ? { locationText: e.locationText.slice(0, 100) } : {}),
        visibility,
        createdBy: owner.get(id) ?? uid,
        source: 'import',
        importUid: e.importUid,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return { added, updated };
}

export const listOrgs = guard(listOrgsImpl);
export const getOrg = guard(getOrgImpl);
export const getMyRole = guard(getMyRoleImpl);
export const joinPublicOrg = guard(joinPublicOrgImpl);
export const joinWithInviteCode = guard(joinWithInviteCodeImpl);
export const claimOrg = guard(claimOrgImpl);
export const leaveOrg = guard(leaveOrgImpl);
export const updateOrgDescription = guard(updateOrgDescriptionImpl);
export const updateOrgCalendarUrl = guard(updateOrgCalendarUrlImpl);
export const setOrgPrivate = guard(setOrgPrivateImpl);
export const listInviteCodes = guard(listInviteCodesImpl);
export const createInviteCode = guard(createInviteCodeImpl);
export const deleteInviteCode = guard(deleteInviteCodeImpl);
export const loadOrgEvents = guard(loadOrgEventsImpl);
export const postEvent = guard(postEventImpl);
export const updateEvent = guard(updateEventImpl);
export const deleteEvent = guard(deleteEventImpl);
export const importEvents = guard(importEventsImpl);
