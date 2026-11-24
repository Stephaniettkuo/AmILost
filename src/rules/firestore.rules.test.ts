// Tests for firestore.rules. They need the Firestore emulator, so they are NOT part of `npm test`:
//   npm run test:rules        (starts the emulator, runs these, stops it; needs Java 11+ and firebase-tools)
// The expected answers come from reading firestore.rules (the comments say which rule), not from running it.
import { afterAll, beforeAll, beforeEach, describe, test } from '@jest/globals';
import {
  RulesTestEnvironment, assertFails, assertSucceeds, initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { readFileSync } from 'fs';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'amilost-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await env.cleanup(); });

// Three orgs: "open" (public), "closed" (private), and the users:
//   alice = admin of "open" and of "closed"; bob = plain member of both; carol = signed in, member of nothing.
const when = Timestamp.fromMillis(Date.UTC(2026, 11, 5, 18));
const later = Timestamp.fromMillis(Date.UTC(2026, 11, 5, 19));
const event = (over: Record<string, unknown> = {}) => ({
  title: 'Pizza night', start: when, end: later, visibility: 'public', createdBy: 'alice', source: 'manual', ...over,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'orgs/open'), { name: 'Open', short: '', description: '', isPrivate: false, claimed: true });
    await setDoc(doc(db, 'orgs/closed'), { name: 'Closed', short: '', description: '', isPrivate: true, claimed: true });
    for (const org of ['open', 'closed']) {
      await setDoc(doc(db, `orgs/${org}/members/alice`), { role: 'admin', joinedAt: when });
      await setDoc(doc(db, `orgs/${org}/members/bob`), { role: 'member', joinedAt: when });
      await setDoc(doc(db, `orgs/${org}/events/pub`), event({ visibility: 'public' })); // ("closed" has an old public one, from before it went private)
      await setDoc(doc(db, `orgs/${org}/events/priv`), event({ visibility: 'members', title: 'Members only' }));
    }
    await setDoc(doc(db, 'orgs/closed/inviteCodes/GOOD42'), {});
    await setDoc(doc(db, 'orgs/open/claimCodes/CLAIM1'), {});
    await setDoc(doc(db, 'orgs/closed/claimCodes/CLAIM2'), {});
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const signedOut = () => env.unauthenticatedContext().firestore();

describe('reading events', () => {
  // Rule: events read = visibility == 'public' || isMember.
  test('signed-out can read a public event', async () => {
    await assertSucceeds(getDoc(doc(signedOut(), 'orgs/open/events/pub')));
  });
  test('signed-out can list public events (asking only for public ones)', async () => {
    await assertSucceeds(getDocs(query(collection(signedOut(), 'orgs/open/events'), where('visibility', '==', 'public'))));
  });
  test('signed-out cannot read a members-only event', async () => {
    await assertFails(getDoc(doc(signedOut(), 'orgs/open/events/priv')));
  });
  test('rules are not filters: signed-out asking for ALL events (members-only included) is refused', async () => {
    await assertFails(getDocs(collection(signedOut(), 'orgs/open/events')));
  });
  test('a signed-in non-member cannot read a members-only event', async () => {
    await assertFails(getDoc(doc(as('carol'), 'orgs/open/events/priv')));
    await assertFails(getDocs(query(collection(as('carol'), 'orgs/open/events'), where('visibility', '==', 'members'))));
  });
  test('a member can read members-only events', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'orgs/open/events/priv')));
    await assertSucceeds(getDocs(query(collection(as('bob'), 'orgs/open/events'), where('visibility', '==', 'members'))));
  });
  test('anyone can read an org (so students can find private orgs)', async () => {
    await assertSucceeds(getDoc(doc(signedOut(), 'orgs/closed')));
  });
});

describe('joining', () => {
  test('anyone signed in can join a PUBLIC org as a member', async () => {
    await assertSucceeds(setDoc(doc(as('carol'), 'orgs/open/members/carol'), { role: 'member', joinedAt: when }));
  });
  test('signed-out cannot join', async () => {
    await assertFails(setDoc(doc(signedOut(), 'orgs/open/members/carol'), { role: 'member', joinedAt: when }));
  });
  test('you cannot add somebody else', async () => {
    await assertFails(setDoc(doc(as('carol'), 'orgs/open/members/dave'), { role: 'member', joinedAt: when }));
  });
  test('cannot join a PRIVATE org with no invite code', async () => {
    await assertFails(setDoc(doc(as('carol'), 'orgs/closed/members/carol'), { role: 'member', joinedAt: when }));
  });
  test('cannot join a private org with a code that does not exist', async () => {
    await assertFails(setDoc(doc(as('carol'), 'orgs/closed/members/carol'), { role: 'member', joinedAt: when, inviteCode: 'NOPE99' }));
  });
  test('CAN join a private org with a valid invite code', async () => {
    await assertSucceeds(setDoc(doc(as('carol'), 'orgs/closed/members/carol'), { role: 'member', joinedAt: when, inviteCode: 'GOOD42' }));
  });
  test('a valid invite code cannot be used to become admin', async () => {
    await assertFails(setDoc(doc(as('carol'), 'orgs/closed/members/carol'), { role: 'admin', joinedAt: when, inviteCode: 'GOOD42' }));
  });
  test('cannot make yourself admin without a claim code (even in a public org)', async () => {
    await assertFails(setDoc(doc(as('carol'), 'orgs/open/members/carol'), { role: 'admin', joinedAt: when }));
    await assertFails(setDoc(doc(as('carol'), 'orgs/open/members/carol'), { role: 'admin', joinedAt: when, claimCode: 'WRONG' }));
  });
  test('CAN become admin with a valid claim code', async () => {
    await assertSucceeds(setDoc(doc(as('carol'), 'orgs/open/members/carol'), { role: 'admin', joinedAt: when, claimCode: 'CLAIM1' }));
  });
  test('a claim code of another org does not work', async () => {
    await assertFails(setDoc(doc(as('carol'), 'orgs/open/members/carol'), { role: 'admin', joinedAt: when, claimCode: 'CLAIM2' }));
  });
  test('a member cannot change their own role', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'orgs/open/members/bob'), { role: 'admin' }));
  });
  test('you can leave; others cannot remove you unless they are admin', async () => {
    await assertSucceeds(deleteDoc(doc(as('bob'), 'orgs/open/members/bob')));
    await assertFails(deleteDoc(doc(as('carol'), 'orgs/open/members/alice')));
    await assertSucceeds(deleteDoc(doc(as('alice'), 'orgs/closed/members/bob')));
  });
  test('you can read your own member document, not somebody else\'s (unless admin)', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'orgs/open/members/bob')));
    await assertFails(getDoc(doc(as('bob'), 'orgs/open/members/alice')));
    await assertSucceeds(getDoc(doc(as('alice'), 'orgs/open/members/bob')));
  });
});

describe('posting events', () => {
  test('a plain member cannot create, edit or delete events', async () => {
    const db = as('bob');
    await assertFails(setDoc(doc(db, 'orgs/open/events/new'), event({ createdBy: 'bob' })));
    await assertFails(updateDoc(doc(db, 'orgs/open/events/pub'), { title: 'Changed' }));
    await assertFails(deleteDoc(doc(db, 'orgs/open/events/pub')));
  });
  test('a non-member cannot either', async () => {
    await assertFails(setDoc(doc(as('carol'), 'orgs/open/events/new'), event({ createdBy: 'carol' })));
  });
  test('an admin can create, edit and delete events', async () => {
    const db = as('alice');
    await assertSucceeds(setDoc(doc(db, 'orgs/open/events/new'), event()));
    await assertSucceeds(setDoc(doc(db, 'orgs/open/events/pub'), event({ title: 'Changed' }))); // same createdBy
    await assertSucceeds(deleteDoc(doc(db, 'orgs/open/events/pub')));
  });
  test('createdBy must be the admin who posts it, and cannot be changed later', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'orgs/open/events/new'), event({ createdBy: 'bob' })));
    await assertFails(setDoc(doc(db, 'orgs/open/events/pub'), event({ createdBy: 'bob' })));
  });
  test('PRIVATE org: an admin cannot post a PUBLIC event, but can post a members-only one', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'orgs/closed/events/new'), event({ visibility: 'public' })));
    await assertSucceeds(setDoc(doc(db, 'orgs/closed/events/new'), event({ visibility: 'members' })));
  });
  test('making an event of a private org members-only (what "make private" does) is allowed', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'orgs/closed/events/pub'), { visibility: 'members' }));
  });
  test('event checks: empty title, end before start, bad visibility, unknown field are all refused', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'orgs/open/events/new'), event({ title: '' })));
    await assertFails(setDoc(doc(db, 'orgs/open/events/new'), event({ title: 'x'.repeat(81) })));
    await assertFails(setDoc(doc(db, 'orgs/open/events/new'), event({ start: later, end: when })));
    await assertFails(setDoc(doc(db, 'orgs/open/events/new'), event({ visibility: 'friends' })));
    await assertFails(setDoc(doc(db, 'orgs/open/events/new'), event({ sneaky: true })));
  });
  test('an imported event (source import, with importUid and updatedAt) is allowed', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'orgs/open/events/import-a'), event({ source: 'import', importUid: 'a@x', updatedAt: when })));
  });
});

describe('org details and codes', () => {
  test('an admin can change the description, private switch, calendar link and claimed flag', async () => {
    const db = as('alice');
    await assertSucceeds(updateDoc(doc(db, 'orgs/open'), { description: 'New text' }));
    await assertSucceeds(updateDoc(doc(db, 'orgs/open'), { isPrivate: true }));
    await assertSucceeds(updateDoc(doc(db, 'orgs/open'), { calendarUrl: 'https://example.com/a.ics', claimed: true }));
  });
  test('an admin cannot rename an org; a member cannot change anything', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'orgs/open'), { name: 'Hacked' }));
    await assertFails(updateDoc(doc(as('bob'), 'orgs/open'), { description: 'x' }));
  });
  test('nobody can create or delete an org from the app', async () => {
    await assertFails(setDoc(doc(as('alice'), 'orgs/new'), { name: 'New', isPrivate: false, claimed: false }));
    await assertFails(deleteDoc(doc(as('alice'), 'orgs/open')));
  });
  test('nobody can read claim codes (not even an admin), or write them', async () => {
    await assertFails(getDoc(doc(as('alice'), 'orgs/open/claimCodes/CLAIM1')));
    await assertFails(getDoc(doc(as('carol'), 'orgs/open/claimCodes/CLAIM1')));
    await assertFails(getDoc(doc(signedOut(), 'orgs/open/claimCodes/CLAIM1')));
    await assertFails(getDocs(collection(as('alice'), 'orgs/open/claimCodes')));
    await assertFails(setDoc(doc(as('alice'), 'orgs/open/claimCodes/MINE'), {}));
  });
  test('only admins can read or write invite codes', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'orgs/closed/inviteCodes/GOOD42')));
    await assertSucceeds(setDoc(doc(as('alice'), 'orgs/closed/inviteCodes/NEW123'), {}));
    await assertSucceeds(deleteDoc(doc(as('alice'), 'orgs/closed/inviteCodes/NEW123')));
    await assertFails(getDoc(doc(as('bob'), 'orgs/closed/inviteCodes/GOOD42')));
    await assertFails(getDoc(doc(as('carol'), 'orgs/closed/inviteCodes/GOOD42')));
    await assertFails(getDoc(doc(signedOut(), 'orgs/closed/inviteCodes/GOOD42')));
    await assertFails(setDoc(doc(as('bob'), 'orgs/closed/inviteCodes/MINE'), {}));
  });
});

describe('user profiles', () => {
  test('you can read and write only your own profile', async () => {
    await assertSucceeds(setDoc(doc(as('carol'), 'users/carol'), { displayName: 'Carol', createdAt: when }));
    await assertSucceeds(getDoc(doc(as('carol'), 'users/carol')));
    await assertFails(getDoc(doc(as('bob'), 'users/carol')));
    await assertFails(setDoc(doc(as('bob'), 'users/carol'), { displayName: 'Hacked' }));
    await assertFails(getDoc(doc(signedOut(), 'users/carol')));
  });
});
