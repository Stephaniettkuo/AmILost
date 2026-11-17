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
Approved extra packages (install with `npx expo install`): `expo-font`, `@expo-google-fonts/cormorant-garamond`,
`@expo-google-fonts/special-elite`, `@expo/vector-icons`. Ask before adding anything else.

## Files
| File | What it is |
|---|---|
| `App.tsx` | Loads fonts, holds the current screen + chosen From/To, switches screens. (Before the redesign it held Navigate + the editor directly.) |
| `src/theme.ts`, `src/fonts.ts` | Design tokens (colors, spacing, radii, shadows, font names) and the list of fonts to load. |
| `scripts/` | `make_paper.py` (paper texture) and `make_clear_plans.py` (sepia, transparent floor plans). Run with `python3`; the pictures they make are committed. |
| `src/screens/`, `src/components/` | One file per screen; shared UI pieces (stamp button, card, chip, arrow, map view, arrival stamp). |
| `src/directions.ts` | Turns a `Route` into turn-by-turn steps (arrows + text). |
| `src/types.ts` | Shared types: `MapNode`, `MapEdge`, `Floor`, `MapGraph`, `Route`. Change together, not alone. |
| `src/data/gdc.ts` | All map data: nodes and edges for floors 1–3, plus `needsCheck` (agent guesses to review). |
| `src/data/floors.ts` | Floor list, image sizes, image files (`assets/gdc-1.png` …). |
| `src/routing.ts` | `findRoute(graph, start, end, { avoidStairs })` — Dijkstra. Walkthrough in `docs/dijkstra.md`. |
| `src/editGraph.ts` | Pure editing functions used by the editor (move, detach, attach, snap, add, remove, rename). |
| `src/data/exportGraph.ts` | Writes the edited graph back out as the full text of `gdc.ts`. |
| `src/MapDataOverlay.tsx` | Draws nodes/edges over the floor plan in the editor. |
| `src/names.ts` | How places are named, and `searchPlaces` (used by the search box). |
| `NOTES.md`, `PLAN.md` | Decision/debugging log for the slides; checklist and timeline. |

## Screens
App flow: **Home → Place → Route preview → Directions → Arrived**, plus **Settings** and the
**Map editor** (team-only, opened from Settings). Screen = a piece of state in `App.tsx`
(`'home' | 'place' | 'preview' | 'directions' | 'arrived' | 'settings' | 'editor'`); each screen is a
component in `src/screens/`. Shared UI pieces live in `src/components/`. Full spec:
`docs/tasks/arrows-and-redesign.md`.

## Design system (follow this for every UI change)
Vibe: **old and warm** — tea-stained parchment, sepia ink, antique brass, postmarks and old survey
maps. Calm and uncluttered: few things on screen at once, plenty of space, serious but friendly.
- **All colors, sizes, radii, shadows and fonts come from `src/theme.ts`.** Never hard-code a color in a screen.
- Palette (paper, ink, brass):

  | Token | Hex | Use |
  |---|---|---|
  | `paper` | `#E8D8B8` | app background (under the paper texture) |
  | `parchment` | `#F2E6CC` | cards, sheets, inputs |
  | `wash` | `#DCC59A` | soft fills, selected chips |
  | `brass` | `#B8893A` | secondary accents, route casing |
  | `rust` | `#9A5B2E` | primary buttons, route line, arrows |
  | `rustDark` | `#6E3E1C` | pressed state, button borders |
  | `ink` | `#3B2A1E` | main text and drawn lines |
  | `fadedInk` | `#6B5439` | secondary text, hints |
  | `line` | `#A68A5E` | thin borders on cards and chips |
  | `light` | `#FBF5E6` | text on rust, highlights |
  | `sage` | `#8A9A78` | start pin, success accents (sparingly) |
  | `seal` | `#8E3B2E` | wax-seal red: destination pin, arrival stamp |

- **Paper shapes:** small corners (cards 10, buttons and chips 6–8), thin 1 px borders in `line`,
  a soft sepia shadow (`#4A2F14`, opacity ~0.22, y-offset 3, blur 7). Buttons are brass-plate /
  rubber-stamp style: a double border, no candy "bottom edge".
- **Background:** every screen sits on `assets/paper.jpg` (tea-stained paper). It is generated by
  `scripts/make_paper.py` from random noise, so it is ours; don't copy photos from the internet.
- **Fonts:** `Cormorant Garamond` (titles and reading text) and `Special Elite` (a typewriter face
  for small labels, buttons, chips, stamps). Load with `expo-font` (list in `src/fonts.ts`); show the
  plain paper color until fonts are ready.
- **Icons/arrows:** drawn with `react-native-svg` (round line caps and joins) or
  `@expo/vector-icons` (Ionicons).
- **Motion (built-in `Animated`):** gentle, like paper settling: buttons press in (scale ~0.97);
  cards settle up when they appear; the direction arrow gently bobs and **springs/rotates** to the
  new direction on each step; the map glides between steps; arrival stamps down an "ARRIVED" postmark
  and wax seal. Keep animations short (150–400 ms). If the phone has "Reduce Motion" on
  (`AccessibilityInfo.isReduceMotionEnabled`), skip the bobbing and the stamp animation.
- **The floor plan** is shown as sepia ink on transparent paper (`assets/gdc-N-clear.png`, made by
  `scripts/make_clear_plans.py`, same pixel size as the originals so coordinates still line up),
  inside a parchment card, with the rust route on top. The original black-and-white plans stay in
  `assets/` for the map editor.
- Text: short and friendly ("Where to?", "Turn left at the restrooms", "You made it!"). Touch
  targets at least 48 px tall. Must look right on a phone first, then web.

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
