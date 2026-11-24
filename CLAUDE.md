# AmILost — notes for Claude

Room-level navigation app for UT Austin's GDC building (floors 1–3). Pick a
start and a destination, see the route on the floor plans, choose stairs or
elevator only. Final project for C S 378 (Agentic Software Engineering), built
by a team of two. **Due Tue Dec 1, 3:00pm** (demo + code + slide PDF).

## Course rules that affect the code
- Every file the slides cite must be **committed** (scripts, logs, outputs). Nothing in `/tmp` or ignored folders counts as evidence. `.expo/` is gitignored — never put evidence there.
- No course homework material in the repo or its history (starter code, solutions, tests, data, handouts).
- Staff must be able to run it from a clean clone: `npm install`, `npm test`, `npx expo start`. No accounts or paid services.
- We need two design/evaluation decisions, a debugging story, and limitations for the slides. **Log them in `NOTES.md` as they happen** (format is at the top of each section). Say what the agent did and what we checked.

## How we work
- One branch per task, then merge into `main`. Don't commit to `main` directly.
- Before saying a task is done: `npx tsc --noEmit` and `npm test` must pass, and check UI changes in the app (`npx expo start`, press `w` for web).
- Keep changes small and simple — we need to be able to explain every file in the demo. Explain new code in plain words when you finish.
- Ask before big rewrites or new dependencies.

## Commands
```bash
npx expo start        # run the app (w = browser, QR code = Expo Go on a phone)
npm test              # Jest (jest-expo preset)
npx tsc --noEmit      # type check
npx expo install <pkg>  # add packages (picks versions that match Expo SDK 58)
```

## Stack
Expo SDK 58, React Native 0.88, TypeScript, react-native-svg, react-native-web, Jest.
**`AGENTS.md` came with the Expo template.** Its Expo tips are useful, but ignore its
"use Expo Router" rule: we switch screens with simple state in `App.tsx` (see "Screens").
Animations use React Native's built-in `Animated` API (no Reanimated).
Approved extra packages (install with `npx expo install`): `expo-font`, `@expo-google-fonts/im-fell-english`,
`@expo-google-fonts/libre-franklin`, `@expo-google-fonts/pinyon-script`, `@expo/vector-icons`, `expo-status-bar`, `react-native-safe-area-context`, `@react-native-async-storage/async-storage` (for the events task). Ask before adding anything else.
**Events calendar: only use the UTCS iCal feed (see `docs/tasks/events.md`). Never scrape the calendar's web pages: their robots.txt disallows it.**

## Files
| File | What it is |
|---|---|
| `App.tsx` | Sets up safe areas and the status bar, loads fonts, holds the current screen + chosen From/To, switches screens. (Before the redesign it held Navigate + the editor directly.) |
| `src/theme.ts`, `src/fonts.ts` | Design tokens (colors, spacing, radii, shadows, font names) and the list of fonts to load. |
| `scripts/` | `make_clear_plans.py` makes the sepia, transparent floor plans. Run with `python3`; the pictures it makes are committed. |
| `src/watercolor.ts`, `assets/watercolor/`, `WcIcon.tsx` | The earlier watercolor theme's pictures (with a README). Not used by the app since the white redesign; `src/art.ts` is. |
| `src/screens/`, `src/components/` | One file per screen; shared UI pieces (torn paper, painted button, arrow, map view, floor picker, slideshow, confetti, arrival stamp). |
| `src/components/Picture.tsx`, `Picture.web.tsx` | Every picture goes through `Picture`: React Native's `Image` on phones, a real `<img>` on the web. |
| `src/components/Text.tsx` | Our `Text`: follows the phone's text size, but only up to 1.2x. |
| `src/safeArea.ts` | `useEdges()`: how far to stay from the notch / Dynamic Island / home bar, and the app's real size. |
| `public/index.html` | The web page around the app; asks browsers and dark-mode extensions not to recolor it. |
| `src/art.ts`, `assets/kit/`, `assets/photos/` | Painted pictures (cut from our team's watercolor asset kit) and GDC photos, and the list that names them. |
| `src/directions.ts` | Turns a `Route` into turn-by-turn steps (arrows + text). |
| `src/lost.ts` | "I'm lost": `nearbyPlaces` (places near the current step) and `reroute` (new route from the place you pick). Tested by hand-worked cases. |
| `src/types.ts` | Shared types: `MapNode`, `MapEdge`, `Floor`, `MapGraph`, `Route`. Change together, not alone. |
| `src/data/gdc.ts` | All map data: nodes and edges for floors 1–3, plus `needsCheck` (agent guesses to review). |
| `src/data/floors.ts` | Floor list, image sizes, image files (`assets/gdc-1.png` …). |
| `src/routing.ts` | `findRoute(graph, start, end, { avoidStairs })` — Dijkstra. Walkthrough in `docs/dijkstra.md`. |
| `src/editGraph.ts` | Pure editing functions used by the editor (move, detach, attach, snap, add, remove, rename). |
| `src/data/exportGraph.ts` | Writes the edited graph back out as the full text of `gdc.ts`. |
| `src/MapDataOverlay.tsx` | Draws nodes/edges over the floor plan in the editor. |
| `src/names.ts` | How places are named, and `searchPlaces` (used by the search box). |
| `src/calendar/` | The events calendar, no screens: `ics.ts` reads the UTCS iCal feed and expands weekly repeats, `events.ts` finds rooms and groups and does search / day-week-month / "Today, Tomorrow" headings, `source.ts` loads live feed → saved copy → snapshot, `time.ts` is Austin wall-clock time. |
| `src/data/groups.ts`, `src/data/calendarSnapshot.ts`, `data/cs-calendar.ics`, `scripts/snapshot-calendar.mjs` | The hand-made group table; the snapshot of the feed (generated from `data/cs-calendar.ics` by the script; how to refresh is in the README). |
| `NOTES.md`, `PLAN.md` | Decision/debugging log for the slides; checklist and timeline. |

## Screens
App flow: **Home → Place → Route preview → Directions → Arrived**, plus **Settings** and the
**Map editor** (team-only, opened from Settings). Screen = a piece of state in `App.tsx`
(`'home' | 'place' | 'preview' | 'directions' | 'arrived' | 'settings' | 'editor' | 'events' | 'event' | 'auth' | 'account' | 'orgs' | 'org' | 'orgAdmin' | 'postEvent' | 'import'`);
**Find events** (the Home card) lists org events (Firebase) plus the UTCS feed, with search, Day/Week/Month and a **My orgs** filter; an **Event** page
has Directions (into Route preview) when the room is on the map, else the place text and "Not on our map yet". **Organizations** → **Org** page
(join, invite code, "I'm an officer") → **Admin tools** → **Post event** / **Import calendar**. `App.tsx` remembers where Back goes from `event`, `org`, `orgs` and `preview`. Each screen is a
component in `src/screens/`. Shared UI pieces live in `src/components/`. Full spec:
`docs/tasks/arrows-and-redesign.md`.

## Firebase (accounts, orgs, events)
Spec: `docs/tasks/events.md`. **Navigation never depends on Firebase** (signed out, offline, Firebase down: maps and
directions still work). `src/firebase.ts` sets up Auth + Firestore (emulator when `EXPO_PUBLIC_USE_EMULATOR=1`);
`src/accounts.ts` talks to Firebase; `src/accountRules.ts` is the pure part (form checks, friendly errors, tested).
`src/orgs/`: `orgData.ts` (all Firestore calls for orgs, members, codes, events), `orgRules.ts` (search, codes, event checks, friendly errors), `importIcs.ts` (org calendar file → events), `eventItems.ts` (org events → list items, hides empty all-day entries), `findEvents.ts` (what Find events loads). Logic goes in the pure files, with tests; `orgData.ts` stays thin.
`scripts/seed.mjs` (orgs + events + claim codes; `--dry-run`, `--emulator`), `scripts/emulators.mjs` (`npm run emulators`, needs Java 21+), `src/rules/firestore.rules.test.ts` (`npm run test:rules`, needs the emulator; not part of `npm test`). Commands and demo codes: README.
Screens: `'auth'` (sign in / create account) and `'account'` (name, my orgs, sign out), both reached from Settings.
**Don't loosen `firestore.rules` without asking. Never read, print or commit anything in `secrets/`.**
Approved packages for this task: `firebase`; dev: `firebase-admin`, `firebase-tools`, `@firebase/rules-unit-testing` (an `overrides` entry in `package.json` lets it use our `firebase` 13; don't install with `--legacy-peer-deps`, it drops a Jest preset).

## Design system (follow this for every UI change)
Vibe: **white torn paper, brown ink, burnt orange**, with a few small watercolor pictures. Simple and
easy to read: one main thing per screen, few decorations.
- **All colors, sizes, radii, shadows and fonts come from `src/theme.ts`.** Never hard-code a color in a screen.
- Palette:

  | Token | Hex | Use |
  |---|---|---|
  | `paper` | `#FFFFFF` | app background, torn panels |
  | `map` / `mapInk` | `#EADBBB` / `#2E1D10` | tan behind floor plans / plan lines |
  | `wash` | `#FBE0CC` | selected chip |
  | `orange` | `#BF5700` | line at the top of every screen, small accents |
  | `rust` | `#AE4600` | route line and route dots, switches |
  | `rustDark` | `#8A3D10` | text buttons, floor label, handwriting |
  | `ink` / `fadedInk` | `#4A3322` / `#5F564F` | text / hints |
  | `line` | `#CFCAC6` | dividers |
  | `light` | `#FFFBF0` | text on the painted button |
  | `seal` | `#8A3D20` | selected floor, arrival stamp |

- **Panels:** white with torn edges (`Torn`), a faint shadow. Screens use `Page`, `Header` or `Screen` from `Screen.tsx`.
- **Buttons:** `StampButton` — primary is the dark painted swash, secondary is plain `rustDark` text.
- **Fonts:** `IM Fell English` (titles, places, buttons), `Libre Franklin` (everything small or read while
  walking), `Pinyon Script` (at most one short line per screen). List in `src/fonts.ts`.
- **Pictures:** only from `src/art.ts`. Don't use UT's logo or longhorn silhouette. Color changes are saved
  into the PNG (image filters don't work the same on phones).
- **Photos** need permission or a license. Ajay Suresh's photo is CC BY 4.0: keep its credit in Settings.
- **The floor plan** is `assets/gdc-N-clear.png` tinted `mapInk` on tan. Route overview: solid line with a thin white
  edge. Directions: solid line for this step, dots for the rest, same color, nothing behind them. The map editor
  uses the original black-and-white plans.
- **Don't show step counts** ("Step 2 of 6"). Time and distance are fine.
- **Motion (built-in `Animated`):** buttons press in (~0.97), the arrow bobs gently and springs to the new
  direction, the map glides between steps, photos crossfade, the arrival stamp presses down. 150–400 ms
  (photos 1 s). With Reduce Motion on: no bobbing, turning, gliding,
  stamping or automatic photos. Confetti is one burst (~4 s) on Arrived; with Reduce Motion it falls straight
  down, no spin or sway.
- Text: short and friendly. Touch targets at least 48 px tall (44 wide is OK). Phone first, then web.
- **Every phone:** use `useEdges()` for top and bottom spacing (never a fixed status-bar height), `Text` from
  `src/components/Text.tsx`, and check 320, 360, 390 and 440 px wide. Home uses smaller lettering under 376 px.

## Map data rules
- Coordinates are **pixels on that floor's plan image** (images are ~2420×1520). Never resize or replace a floor image — all its coordinates would be wrong.
- Edges are two-way. Same-floor edges have no `cost` (length = pixel distance). Between-floor edges (same stair/elevator number on each floor) need a `cost`: stairs 150, elevator 250 per floor (rough guesses).
- Id formats (enforced by tests via `idPattern` / `idMatchesKind` in `editGraph.ts`):
  - rooms, stairs, elevators: plan number — `GDC-2.316`, `GDC-2.1S1`, `GDC-2.2E2`
  - hallway points: `GDC-2-hall-A`, `-hall-B`, … (`nextHallId`)
  - entrances / outdoor spots: from the name — `GDC-2-entrance-main`, `GDC-2-outdoor-patio`
- `label` = what people see ("Front office"); `aliases` = extra search words.
- Data checks in `src/data/gdc.test.ts`: unique ids, edges point to real nodes, no duplicate lines, ids fit their category, nodes inside their image, between-floor edges have a cost, and **no islands** (everything reachable).
- Floors 1–3 have been reviewed by us. A few points are still listed in `needsCheck`.

## The map editor (Edit map)
Modes: **Add** (kind + name, connects to nearest hallway), **Move** (hallway dots drag their lines; other dots leave their hallway and reconnect where dropped), **Reconnect** (move a dot onto a different line), **Delete** (a dot, or one line), **Edit** (category, name, other names, id). One **Undo** for every action. Edits live in memory; the user saves by copying the text box under the map over `src/data/gdc.ts`.
- Put editing logic in `src/editGraph.ts` as pure functions with tests in `src/editGraph.test.ts`; keep `App.tsx` to wiring.
- Every change goes through `change()` in `App.tsx` so Undo works.

## Testing rules
- Route tests: work out the expected path/cost **by hand from the floor plan before running the code**, and write the reasoning in a comment. Never paste the code's output in as the expected answer.
- After adding a test, break the code on purpose once and confirm the test fails, then restore it.
- In test files, import `test`/`expect`/`describe` from `@jest/globals` (otherwise `tsc` fails).

## Gotchas we already hit
- `Pressable` gives **no tap position on web**. The map uses the responder props (`onStartShouldSetResponder`, `onResponderGrant/Move/Release`) with `nativeEvent.locationX/Y`.
- Anything that appears/disappears above the map **shifts the map under the cursor**. Keep a fixed-height slot (see the message line, `minHeight`).
- Tapping near a short line can hit a dot instead; Delete uses a smaller dot radius (`reach / 2`).
- Deleting a line must remove **one** copy, not every match.
- Use `Picture`, not React Native's `Image`. On the web `Image` is a CSS background, and something in one of our browsers (probably a dark-mode extension) rewrote backgrounds and blew every picture up.
- iPhone crash "Cannot read property 'forEach' of null": a style's `transform` must not go from a value to `undefined`. Use `?? []`.
- On phones a `'100%'` width inside a padded box leaves out the padding (the web includes it). To fill a box, put the picture in a `StyleSheet.absoluteFill` view.
- An absolutely placed layer needs its own width **and height**; our first confetti layer had height 0 and hid everything.
- "It doesn't animate on my phone" is usually Reduce Motion (iPhone: Settings → Accessibility → Motion).
- The browser hides phone-only bugs. Try changes in Expo Go before calling them done.
