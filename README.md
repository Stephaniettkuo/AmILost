# AmILost

Room-level navigation for UT Austin's Gates Dell Complex, plus student-org events.

```bash
npm install
npm test            # unit tests (no Firebase needed)
npx tsc --noEmit    # type check
npx expo start      # run the app (w = browser, QR code = Expo Go on a phone)
```

Maps, search, routes and arrows never need the internet or an account. Accounts, organizations and org
events are an extra on top (Firebase).

## Firebase: accounts, organizations, events

What lives where (details in `docs/tasks/events.md` and the comments in `firestore.rules`):

- `src/firebaseConfig.ts` is the project's **public** web config (every Firebase app ships it).
- `firestore.rules` decides who can read and write what; Firebase enforces it on its servers.
- `secrets/` is gitignored. `secrets/firebase-admin.json` (the admin key) is used **only** by the seed script.
  Never commit it, paste it anywhere, or put it in the app.

### One-time setup of the live project (Firebase console)

1. **Build → Firestore Database → Create database** (production mode). Until this is done, every org screen fails: the Cloud Firestore API is off for the project.
2. **Build → Authentication → Sign-in method → Email/Password** on.
3. Publish the rules and fill in the data (commands below): `npx firebase deploy --only firestore:rules --project amilost`, then `npm run seed:live`.

### Run the app against the live project

`npx expo start`, open Settings → "Sign in or create account". (The Email/Password sign-in method must be turned
on in the Firebase console → Authentication.)

### Run it with no live project (the emulator)

Needs **Java 21 or newer** (`brew install openjdk@21`). `firebase-tools` and `firebase-admin` come with `npm install`.

```bash
npm run emulators                                   # Auth + Firestore emulators, then fills them with demo data
EXPO_PUBLIC_USE_EMULATOR=1 npx expo start          # in a second terminal: the app talks to the emulators
```

On a phone, tell the app where your laptop is: `EXPO_PUBLIC_EMULATOR_HOST=192.168.x.x EXPO_PUBLIC_USE_EMULATOR=1 npx expo start`
(the laptop's address on your Wi-Fi). Emulator data disappears when you stop it.

**Demo accounts and codes (emulator only):**

| What | Value |
|---|---|
| Officer account (runs ACM) | `demo-admin@example.com` / `demo1234` |
| Student account (member of nothing) | `demo-student@example.com` / `demo1234` |
| Invite code for the private "Demo Study Group" | `DEMO42` |
| Claim codes (become an officer) | `<ORG>-CLAIM`: `ACM-CLAIM`, `WICS-CLAIM`, `HACS-CLAIM`, `FOCS-CLAIM`, `UTCS-CLAIM`, `AMAZE-CLAIM`, `CONVERGENT-CLAIM`, `NLL-CLAIM`, `LARG-CLAIM`, `AMRL-CLAIM`, `ROBIN-CLAIM`, `DIRP-CLAIM`, `DEMO-CLAIM` |

Try it: sign in as the student → Organizations → Demo Study Group → join with `DEMO42` → Find events shows its
members-only event. Sign in as the officer → ACM → Admin tools → post a members-only event.

### Seed commands

```bash
npm run seed:dry        # reads data/*.ics and prints how many events each org would get; touches nothing
npm run seed:emulator   # seeds the running emulators (npm run emulators already does this)
npm run seed:live       # seeds the LIVE project; refuses to run without secrets/firebase-admin.json
```

The live seed creates the orgs (all `claimed: false`), imports `data/acm-cal.ics`, `hacs.ics` and `wics.ics`
(last 30 days + upcoming) as public events, and makes one random **claim code per org**, saved in
`secrets/claim-codes.txt` (gitignored). Hand each code to that org's officers privately; they enter it under
"I'm an officer" on the org's page. Running it again keeps existing orgs, claims and codes.
To give an org a calendar link for the in-app Import screen, add `data/calendar-urls.json`
(`{ "acm": "https://…/basic.ics" }`) before seeding.

### Security rules

```bash
npm run test:rules      # starts the Firestore emulator, runs src/rules/firestore.rules.test.ts, stops it (Java 21+)
npx firebase deploy --only firestore:rules --project amilost   # publishes firestore.rules to the live project
```

`npm test` does not run the rules tests (they need the emulator).

### Refreshing calendars

- **Org calendars:** an officer opens Admin tools → Import calendar, pastes the Google Calendar "public address in
  iCal format", previews, and imports. Importing again updates events instead of adding copies.
- **Files in `data/`** (`acm-cal.ics`, `hacs.ics`, `wics.ics`) are only the seed's starting data. Replace the file and
  run the seed again to refresh it.
