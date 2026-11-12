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
"use Expo Router" rule: this app is one screen in `App.tsx` on purpose.

## Files
| File | What it is |
|---|---|
| `App.tsx` | The only screen. Two views: **Navigate** (From/To pickers, route on the map) and **Edit map** (the map editor). |
| `src/types.ts` | Shared types: `MapNode`, `MapEdge`, `Floor`, `MapGraph`, `Route`. Change together, not alone. |
| `src/data/gdc.ts` | All map data: nodes and edges for floors 1–3, plus `needsCheck` (agent guesses to review). |
| `src/data/floors.ts` | Floor list, image sizes, image files (`assets/gdc-1.png` …). |
| `src/routing.ts` | `findRoute(graph, start, end, { avoidStairs })` — Dijkstra. Walkthrough in `docs/dijkstra.md`. |
| `src/editGraph.ts` | Pure editing functions used by the editor (move, detach, attach, snap, add, remove, rename). |
| `src/data/exportGraph.ts` | Writes the edited graph back out as the full text of `gdc.ts`. |
| `src/MapDataOverlay.tsx` | Draws nodes/edges over the floor plan in the editor. |
| `src/RouteOverlay.tsx` | Draws a route (line, start/end pins, floor-change labels). |
| `src/PlacePicker.tsx`, `src/names.ts` | Search box and how places are named/searched. |
| `NOTES.md`, `PLAN.md` | Decision/debugging log for the slides; checklist and timeline. |

## Map data rules
- Coordinates are **pixels on that floor's plan image** (images are ~2420×1520). Never resize or replace a floor image — all its coordinates would be wrong.
- Edges are two-way. Same-floor edges have no `cost` (length = pixel distance). Between-floor edges (same stair/elevator number on each floor) need a `cost`: stairs 150, elevator 250 per floor (rough guesses).
- Id formats (enforced by tests via `idPattern` / `idMatchesKind` in `editGraph.ts`):
  - rooms, stairs, elevators: plan number — `GDC-2.316`, `GDC-2.1S1`, `GDC-2.2E2`
  - hallway points: `GDC-2-hall-A`, `-hall-B`, … (`nextHallId`)
  - entrances / outdoor spots: from the name — `GDC-2-entrance-main`, `GDC-2-outdoor-patio`
- `label` = what people see ("Front office"); `aliases` = extra search words.
- Data checks in `src/data/gdc.test.ts`: unique ids, edges point to real nodes, no duplicate lines, ids fit their category, nodes inside their image, between-floor edges have a cost, and **no islands** (everything reachable).
- Floor 2 was reviewed by us. **Floors 1 and 3 are agent drafts, not yet reviewed.**

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
