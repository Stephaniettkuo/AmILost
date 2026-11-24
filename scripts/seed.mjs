// Fills Firebase with the starting data: the orgs, their events (from data/*.ics), and claim codes.
//
//   node --import ./scripts/register-ts.mjs scripts/seed.mjs --dry-run     only read the files and print counts
//   node --import ./scripts/register-ts.mjs scripts/seed.mjs --emulator    seed the LOCAL emulator (fixed demo codes)
//   node --import ./scripts/register-ts.mjs scripts/seed.mjs               seed the LIVE project (needs secrets/firebase-admin.json)
// (npm run seed:emulator and npm run seed:live do these.)
//
// The live run uses the admin key in secrets/, which skips the security rules. That file is secret: this
// script only passes its PATH to Firebase and never prints or copies what is inside it.
import { randomInt } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gdcGraph } from '../src/data/gdc.ts';
import { icsToImports, importDocId } from '../src/orgs/importIcs.ts';
import { CODE_ALPHABET } from '../src/orgs/orgRules.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const emulator = args.has('--emulator');
const PROJECT_ID = 'amilost';
const ADMIN_KEY = resolve(root, 'secrets/firebase-admin.json');
const CLAIM_FILE = resolve(root, 'secrets/claim-codes.txt');

// ---------- What to create ----------

// `file` = the calendar we import events from. `calendarUrl` can be filled in from data/calendar-urls.json
// ({ "acm": "https://…/basic.ics", … }) so officers can re-import from the app; we don't have those links in the repo.
const ORGS = [
  { id: 'acm', name: 'ACM', short: 'Association for Computing Machinery at UT Austin', description: 'Texas ACM: tech talks, workshops, socials and the fall retreat.', file: 'data/acm-cal.ics', demoClaim: 'ACM-CLAIM' },
  { id: 'wics', name: 'WiCS', short: 'Women in Computer Science', description: 'WiCS events: study nights, panels, socials.', file: 'data/wics.ics', demoClaim: 'WICS-CLAIM' },
  { id: 'hacs', name: 'HACS', short: 'Hispanic Association for Computer Science', description: 'HACS meetings, company nights and community events.', file: 'data/hacs.ics', demoClaim: 'HACS-CLAIM' },
  { id: 'focs', name: 'Friends of Computer Science (FoCS)', short: 'Friends of Computer Science', description: 'FoCS events in the Department of Computer Science.', demoClaim: 'FOCS-CLAIM' },
  { id: 'utcs', name: 'Department of Computer Science', short: 'UT Austin Department of Computer Science', description: 'Department events and seminars.', demoClaim: 'UTCS-CLAIM' },
  // Research groups and teams that appeared on the UTCS calendar. Add more here (id, name, short, description,
  // demoClaim) and run the seed again; each gets its own claim code. Officers can then post events or import a calendar.
  { id: 'amaze', name: 'Project AMAZE', short: 'Project AMAZE (ECLAIR) meetings', description: 'Project AMAZE (ECLAIR) meetings.', demoClaim: 'AMAZE-CLAIM' },
  { id: 'convergent', name: 'Texas Convergent', short: 'Texas Convergent team', description: 'Texas Convergent team meetings.', demoClaim: 'CONVERGENT-CLAIM' },
  { id: 'nll', name: 'NLL', short: 'Natural language learning group', description: 'The NLL reading group and meetings.', demoClaim: 'NLL-CLAIM' },
  { id: 'larg', name: 'LARG', short: 'LARG meetings', description: 'LARG meetings.', demoClaim: 'LARG-CLAIM' },
  { id: 'amrl', name: 'AMRL', short: 'Autonomous Mobile Robotics Laboratory', description: 'AMRL lab meetings.', demoClaim: 'AMRL-CLAIM' },
  { id: 'robin', name: 'RobIn', short: 'RobIn lab', description: 'RobIn lab meetings.', demoClaim: 'ROBIN-CLAIM' },
  { id: 'dirp', name: 'Directed Reading Program (DiRP)', short: 'Directed Reading Program', description: 'Directed Reading Program (DiRP) sessions and reading groups.', demoClaim: 'DIRP-CLAIM' },
  { id: 'demo-study-group', name: 'Demo Study Group', short: 'A made-up private org to try invite codes', description: 'Private: you need an invite code to join.', isPrivate: true, demoClaim: 'DEMO-CLAIM', demoInvite: 'DEMO42', demoEvent: true },
];

const DEMO_ADMIN = { email: 'demo-admin@example.com', password: 'demo1234', name: 'Demo Officer' };
const DEMO_STUDENT = { email: 'demo-student@example.com', password: 'demo1234', name: 'Demo Student' };

const randomCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
const readCalendarUrls = () => {
  const file = resolve(root, 'data/calendar-urls.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
};

// The events each org gets, worked out from its calendar file (the same code as the app's Import screen).
function eventsFor(org, nowMs) {
  if (!org.file) return [];
  return icsToImports(readFileSync(resolve(root, org.file), 'utf8'), gdcGraph, nowMs);
}

// ---------- Dry run: no Firebase at all ----------

const nowMs = Date.now();
if (dryRun) {
  for (const org of ORGS) {
    const events = eventsFor(org, nowMs);
    const rooms = events.filter((e) => e.placeId).length;
    console.log(`${org.id.padEnd(18)} ${String(events.length).padStart(4)} events (${rooms} with a mapped room)${org.isPrivate ? '  [private]' : ''}`);
  }
  console.log('Dry run: nothing was written.');
  process.exit(0);
}

// ---------- Connect ----------

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');

if (emulator) {
  process.env.FIRESTORE_EMULATOR_HOST ??= `${process.env.EMULATOR_HOST || 'localhost'}:8080`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${process.env.EMULATOR_HOST || 'localhost'}:9099`;
  initializeApp({ projectId: PROJECT_ID });
  console.log(`Seeding the EMULATOR (${process.env.FIRESTORE_EMULATOR_HOST}).`);
} else {
  if (!existsSync(ADMIN_KEY)) {
    console.error('Missing secrets/firebase-admin.json, so I will not seed the live project.\nGet the admin key from the Firebase console (Project settings → Service accounts) and save it there. It is gitignored.');
    process.exit(1);
  }
  initializeApp({ credential: cert(ADMIN_KEY), projectId: PROJECT_ID }); // only the path is passed; the file is never read here
  console.log('Seeding the LIVE project "amilost".');
}
const db = getFirestore();
const auth = getAuth();
const urls = readCalendarUrls();

// ---------- Orgs, claim codes, events ----------

async function seedOrg(org) {
  const ref = db.collection('orgs').doc(org.id);
  const existing = await ref.get();
  const fields = { name: org.name, short: org.short, description: org.description };
  if (urls[org.id]) fields.calendarUrl = urls[org.id];
  if (existing.exists) await ref.update(fields); // keep `claimed` and `isPrivate` as officers set them
  else await ref.set({ ...fields, isPrivate: !!org.isPrivate, claimed: false });

  // Claim codes. Emulator: a fixed code (listed in the README). Live: one random code per org, kept if it
  // already exists so a code we already gave to officers keeps working.
  let claimNote;
  const claimCodes = ref.collection('claimCodes');
  if (emulator) {
    await claimCodes.doc(org.demoClaim.replace(/[^A-Z0-9-]/g, '')).set({});
    claimNote = org.demoClaim;
  } else {
    const have = await claimCodes.limit(1).get();
    if (have.empty) {
      const code = randomCode();
      await claimCodes.doc(code).set({});
      mkdirSync(dirname(CLAIM_FILE), { recursive: true });
      appendFileSync(CLAIM_FILE, `${new Date().toISOString().slice(0, 10)}  ${org.name} (${org.id}): ${code}\n`);
      claimNote = `new code written to secrets/claim-codes.txt`;
    } else claimNote = 'already has a claim code (kept)';
  }
  if (emulator && org.demoInvite) await ref.collection('inviteCodes').doc(org.demoInvite).set({});

  // Events from the org's calendar file: public, or members-only for a private org.
  const events = eventsFor(org, nowMs);
  const visibility = org.isPrivate ? 'members' : 'public';
  for (let i = 0; i < events.length; i += 400) {
    const batch = db.batch();
    for (const e of events.slice(i, i + 400)) {
      batch.set(ref.collection('events').doc(importDocId(e.importUid)), {
        title: e.title,
        ...(e.description ? { description: e.description } : {}),
        start: Timestamp.fromMillis(e.startMs),
        end: Timestamp.fromMillis(e.endMs),
        ...(e.placeId ? { placeId: e.placeId } : e.locationText ? { locationText: e.locationText.slice(0, 100) } : {}),
        visibility, createdBy: 'seed', source: 'import', importUid: e.importUid, updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  if (org.demoEvent) {
    // A made-up members-only event in the private demo org, so the invite-code demo has something to show.
    const start = nowMs + 2 * 86400000;
    await ref.collection('events').doc('demo-study-session').set({
      title: 'Demo study session', description: 'Only members of this org can see this event.',
      start: Timestamp.fromMillis(start), end: Timestamp.fromMillis(start + 3600000), placeId: 'GDC-1.304',
      visibility: 'members', createdBy: 'seed', source: 'manual',
    });
  }
  console.log(`${org.id.padEnd(18)} ${String(events.length).padStart(4)} events · claim: ${claimNote}`);
}

for (const org of ORGS) await seedOrg(org);

// ---------- Emulator only: demo accounts ----------

async function demoUser(who, uid) {
  try { await auth.deleteUser(uid); } catch { /* not there yet */ }
  await auth.createUser({ uid, email: who.email, password: who.password, displayName: who.name });
  await db.collection('users').doc(uid).set({ displayName: who.name, createdAt: FieldValue.serverTimestamp() });
}
if (emulator) {
  await demoUser(DEMO_ADMIN, 'demo-admin');
  await demoUser(DEMO_STUDENT, 'demo-student');
  // The demo officer already runs ACM; the student has joined nothing yet (so "join" can be demoed).
  await db.doc('orgs/acm/members/demo-admin').set({ role: 'admin', joinedAt: FieldValue.serverTimestamp(), claimCode: 'ACM-CLAIM' });
  await db.doc('orgs/acm').update({ claimed: true });
  console.log(`Demo accounts: ${DEMO_ADMIN.email} (officer of ACM) and ${DEMO_STUDENT.email}, password ${DEMO_ADMIN.password}.`);
}
console.log('Done.');
