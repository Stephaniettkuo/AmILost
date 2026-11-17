# Task: turn-by-turn arrows + app redesign

> **Update (2026-11-18):** the visual style below (cute, puffy, Fredoka/Nunito, orange) was replaced by the
> parchment theme. The structure, parts and screens are unchanged; the current look is the
> "Design system" section of `CLAUDE.md`.

Goal: turn AmILost from a dev tool into a real, cute app that guides a person
step by step to a room in GDC. Follow the **Design system** in `CLAUDE.md`.

Work on a branch called `arrows-redesign`. Do the parts **in order** and stop after
each part so we can check it (tests pass, it looks right, we understand the code).
Commit each part separately.

---

## Part 1 — Directions logic (no UI)

`src/directions.ts`: `directions(route: Route): Step[]`

```ts
type Arrow = 'straight' | 'left' | 'right' | 'slightLeft' | 'slightRight'
           | 'stairsUp' | 'stairsDown' | 'elevatorUp' | 'elevatorDown' | 'arrive';
type Step = {
  arrow: Arrow;
  text: string;        // "Turn left at hall-G", "Take Elevator 2.2E2 up to floor 3", "2.316 is on your left"
  floor: string;       // floor this step happens on (for switching the map)
  from: number;        // index of the first route point this step covers
  to: number;          // index of the last route point this step covers
};
```
- Turn direction from the angle between consecutive segments (remember image **y points down**):
  under ~25° = straight (merge into the current step), 25–60° = slight left/right, more = left/right.
- A floor change (consecutive points on different floors) = one step: stairs/elevator, up/down,
  "to floor N". Use the stair/elevator's `placeName`.
- Last step = `arrive`; say whether the destination is on the left or right of the last segment
  (sign of the cross product).
- Name turns by the nearest meaningful point: prefer a room/stairs/elevator/entrance name over
  `hall-X`; if only hallway points, just "Turn left".
- Also `distanceText(px)` → "about 60 ft" using `PX_PER_FOOT = 3` (rough; we'll calibrate on the walk test).

`src/directions.test.ts` (rules from CLAUDE.md: work out expected answers by hand first, write the
reasoning in comments, break the code once to see a test fail):
- tiny made-up routes: straight line; one left; one right (check y-down!); slight turn; floor change up and down
- 2–3 real GDC routes, e.g. `GDC-2.316 → GDC-3.304` and `GDC-2-entrance-main → GDC-2.702`,
  expected steps worked out from the floor plans

## Part 2 — Theme + building blocks

- `src/theme.ts` with the tokens from CLAUDE.md.
- Install fonts/icons (`npx expo install expo-font @expo-google-fonts/fredoka @expo-google-fonts/nunito @expo/vector-icons`).
- `src/components/`: `PuffyButton` (squish on press, candy bottom edge; primary/secondary),
  `Card` (vanilla, 28 radius, soft shadow, springs in), `Chip`, `DirectionArrow` (SVG arrow per `Arrow`,
  thick rounded strokes, bobs gently, rotates/springs between directions), `FloorMap` (rounded card
  with the faded floor plan + the orange route; can zoom/center on a set of route points),
  `ProgressDots`.
- A small hidden "style check" is fine during development, but don't ship it.

## Part 3 — Screens (`src/screens/`)

1. **Home** — big friendly "Where to?" title (Fredoka), one large search box (reuse the search
   logic from `PlacePicker`/`names.ts`), "From: Main entrance" chip (tap to change), a row of
   quick chips (Restrooms, Elevators, Lecture hall 1.304, Front office), a gear icon → Settings.
2. **Place** — bottom sheet/card for a chosen room: big name, floor, other names, small map
   preview with a pin, puffy **Directions** button.
3. **Route preview** — map with the whole route, summary ("6 steps · about 3 min · floors 2 → 3"),
   Stairs / Elevator-only toggle (pill switch), puffy **Start** button.
4. **Directions** (the arrow screen) — top: big animated `DirectionArrow` + step text + distance;
   middle: `FloorMap` zoomed to the current step, current step's part of the route bright orange,
   rest faded; bottom: Back / Next puffy buttons + `ProgressDots` ("Step 2 of 6"). On a floor change,
   show a special card ("Take Elevator 2.2E2 up to floor 3" with the elevator icon sliding up)
   and switch the map floor. The card must not change height between steps (map must not jump).
5. **Arrived** — "You made it! 🎉" with a bounce + confetti dots, the room name, buttons
   "Done" (→ Home) and "Directions back".
6. **Settings** — default "Elevator only" switch, "About AmILost" (team names, course, that floor
   plans are UT's), and **Map editor (team only)** → the existing editor.
7. **Map editor** — the existing editor, moved into `src/screens/EditorScreen.tsx` with **no behavior
   changes**; restyle only lightly (theme colors/fonts). All editor tests must still pass.

Screen switching: state in `App.tsx`. A back arrow on every screen except Home. Keep the chosen
From/To/options in `App.tsx` so screens stay simple.

## Part 4 — Polish

- Animations as described in CLAUDE.md; respect Reduce Motion.
- Check on a phone (Expo Go) and in the browser at phone width.
- Empty/error states: no search results ("Hmm, can't find that room"), no route ("No way there yet").

## Done when

- `npx tsc --noEmit` and `npm test` pass (all existing tests + new directions tests).
- In the browser and on a phone: Home → search "2.316" → Place → Preview → Start → step through to
  Arrived, for a one-floor route and a route that changes floors, with Elevator only on and off.
- The map editor still works (add/move/delete/undo, export box).
- `NOTES.md` has decision entries (state-based screens instead of Expo Router; built-in Animated;
  how turn angles are classified) and any debugging stories.
- You explained the new code to us in plain words before each commit.
