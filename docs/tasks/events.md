# Task: org accounts, events, and "I'm lost" (Firebase)

Goal: student orgs have accounts. Org officers post events (by hand or by importing their
calendar), choosing **Public** or **Members only**. Students sign in, join orgs (private orgs
need an **invite code**), browse and search events, and tap **Directions** to be guided to the
room with the existing route + arrow screens. Plus an **"I'm lost"** re-route button.

Branch: `events` (it already has Part 1 calendar logic in `src/calendar/` — reuse it).
Do the parts **in order**, stop after each one so we can check it, commit each separately.
Follow the design system in `CLAUDE.md`; reuse existing components and screens.

---

## Ground rules
- **Navigation never depends on Firebase.** Search, routes, arrows, editor work signed out,
  offline, and with Firebase unreachable. Events are an extra.
- Firebase JS SDK only (`firebase` package, already installed) — works in Expo Go.
  Config: `src/firebaseConfig.ts` (public, committed). Auth persistence: AsyncStorage.
- **Security lives in `firestore.rules`** (already written — read it; don't loosen it without
  asking). Rules are not filters: shape queries so they only ask for what the user may read
  (e.g. `where('visibility','==','public')` for non-members, then members-only events
  separately for orgs the user belongs to).
- `secrets/` is gitignored. The admin key `secrets/firebase-admin.json` is only for the seed
  script. **Never print, copy, commit, or read its contents into code.**
- Course rule: staff must be able to run it without our live project → the **Firebase emulator**
  with seed data (Part 4). `npm test` must keep working without the emulator; rules tests run
  with a separate script.

## Data model (matches `firestore.rules`)
```
users/{uid}                       { displayName, createdAt }
orgs/{orgId}                      { name, short, description, isPrivate, claimed, calendarUrl? }
orgs/{orgId}/members/{uid}        { role: 'member'|'admin', joinedAt, inviteCode? | claimCode? }
orgs/{orgId}/events/{eventId}     { title, description?, start, end (Timestamps), placeId?,
                                    locationText?, visibility: 'public'|'members',
                                    createdBy, source: 'manual'|'import', importUid?, updatedAt? }
orgs/{orgId}/inviteCodes/{code}   {}   (private orgs; admins create/delete)
orgs/{orgId}/claimCodes/{code}    {}   (seed script only; how officers become admin)
```

## Part 1 — Firebase setup + accounts
- `src/firebase.ts`: init app, Auth (AsyncStorage persistence), Firestore. If
  `EXPO_PUBLIC_USE_EMULATOR=1`, connect to the emulators (host from
  `EXPO_PUBLIC_EMULATOR_HOST`, default `localhost`; on a phone use the laptop's LAN IP).
- Screens: **Sign in / Create account** (email + password + display name; friendly errors:
  wrong password, email in use, weak password, no internet), **Account** (name, sign out,
  my orgs) reachable from Settings.
- Signed-out users can still use navigation and see public events.

## Part 2 — Orgs: join, invite codes, claim, admin tools
- **Organizations** screen: all orgs (name, short description, "Private" badge, "Not yet
  claimed by this org" if `claimed == false`), search.
- **Org page**: description, upcoming events the user may see, and
  - public org: **Join / Leave**
  - private org: **Join with invite code** (text box) / Leave
  - **"I'm an officer"** → enter a claim code → become admin (then set `claimed: true`).
- **Admin tools** (only for admins of that org): edit description; toggle Private; manage invite
  codes (create a random 6-character code, copy, delete); **Post event**; edit/delete events;
  **Import calendar** (paste a Google Calendar / iCal link → fetch on the phone → preview →
  import upcoming + last 30 days as `source: 'import'`, `importUid` = the iCal UID so re-import
  updates instead of duplicating).
- **Post event**: title, description, day + start time (chips/steppers, no new date-picker
  package), length, room (existing room search → `placeId`) or free-text location for places
  not on the map, **Public / Members only** (private orgs: members only, locked).

## Part 3 — Events screens (students)
- **Find events** (from the Home button): search (event or org name), **Day / Week / Month**
  with a date strip, **My orgs** filter, list grouped by day. Card: title, org, time, room +
  floor or the location text, "Members only" badge.
- **Event detail**: everything above + description; room on the map → small map with pin +
  **Directions** (To = room, keep From → Route preview); not on the map → location text +
  "Not on our map yet".
- Hide all-day entries with no location (calendars include "Study Days", "Finals", …).

### Room matching (reuse `src/calendar/events.ts` `roomFor`, extend it)
Checked by hand against `data/acm-cal.ics`, `data/hacs.ics`, `data/wics.ics`:
- `GDC 6.302`, `gdc 6.302` (case!), `GDC 3.314 (ACM Office)`, `GDC 2.506 (Teaching Lab)` → room
- `5.302` with no building (old ACM entries) → assume GDC
- `GDC Atrium` → `GDC-2.100`
- HACS often leaves LOCATION empty and writes the room in DESCRIPTION (`GDC 1.304`) → use it
- Not GDC (`UTC 1.118`, `Welch Patio`, `Texas Union`, addresses) → no room, show the text
- Google times are UTC (`...Z`) → show in Austin time

## Part 4 — Seed data, emulator, rules tests
- `scripts/seed.mjs` (Node, `firebase-admin`, dev dependency):
  - creates orgs: **ACM, WiCS, HACS** (with `calendarUrl`), plus **Friends of Computer
    Science (FoCS)** and **Department of Computer Science**, plus other UTCS orgs we list later;
    all `claimed: false`; one made-up **private** demo org ("Demo Study Group") to show invites
  - imports `data/acm-cal.ics`, `data/hacs.ics`, `data/wics.ics` (last 30 days + upcoming) as
    public events
  - creates a random claim code per org and writes them to `secrets/claim-codes.txt`
    (gitignored) — we hand these to each org's officers privately
  - `--emulator` flag: seed the local emulator instead, with **fixed demo codes** listed in the
    README, and a demo admin + demo student account
  - live project: uses `secrets/firebase-admin.json`; refuse to run if it's missing
- `npm run emulators` (starts Auth + Firestore emulators with seeded data; needs Java 11+ and
  `firebase-tools` — document in README).
- **Rules tests** `src/rules/firestore.rules.test.ts` with `@firebase/rules-unit-testing`
  (dev dependency), run by `npm run test:rules` (emulator), excluded from `npm test`:
  - signed-out can read public events, can't read members-only events
  - a non-member can't read members-only events; a member can
  - can't join a private org without a valid invite code; can with one
  - can't make yourself admin without a valid claim code; can with one
  - a non-admin can't create/edit/delete events; an admin can
  - private org: an admin can't post a **public** event
  - nobody can read claim codes; non-admins can't read invite codes
  Break a rule once to confirm a test fails.

## Part 5 — "I'm lost"
On **Directions**: **I'm lost** → card "No worries! What room are you near?" with suggestions
first (rooms/stairs/elevators/entrances within ~150 px of the current step, same floor,
closest first, max 6) and the normal room search below → re-route from there to the same
destination with the same Elevator-only setting → restart Directions at step 1
("New route from 2.316"). Picked the destination → Arrived. No route → friendly message.
Pure `nearbyPlaces` / `reroute` with tests worked out by hand.

## Done when
- `npx tsc --noEmit`, `npm test`, and `npm run test:rules` pass.
- On a phone (Expo Go): sign up → join ACM → Find events → open an event → Directions →
  arrows to the room. As a demo officer: claim an org, post a members-only event, create an
  invite code; as a second account: can't see that event until joining with the code.
  "I'm lost" re-routes.
- With the emulator (no live project): the same flow works with the seeded demo accounts.
- README: Firebase setup, emulator + seed commands, demo accounts/codes, how to refresh calendars.
- `CLAUDE.md`: new screens/files, Firebase rules ("don't loosen firestore.rules", "never touch
  secrets/"), approved packages (`firebase`, `@react-native-async-storage/async-storage`,
  dev: `firebase-admin`, `firebase-tools`, `@firebase/rules-unit-testing`).
- `NOTES.md`: decisions (Firebase + rules instead of local-only; invite codes; claim codes for
  officers; org calendars instead of the UTCS feed — rooms missing there; scraping avoided —
  robots.txt) and limitations (calendar rooms are free text; HACS leaves most blank; orgs
  must be claimed by real officers; the Dec 8 HACS meeting has no room).
- Explain the new code to us in plain words before each commit.
