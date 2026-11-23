# Task: events from student organizations

Goal: orgs post events in GDC rooms; students join orgs, browse events, and tap
**Directions** to be guided to the room with the existing route + arrow screens.

**No real accounts or server** (course rule: staff must run the demo with no private
accounts or paid services). "Joining" and "posting" are saved **only on this phone**.
Real org accounts, verification and a shared events server go on the "What remains" slide.

Work on a branch called `events`. Do the parts **in order** and stop after each part so we
can check it. Follow the design system in `CLAUDE.md` and reuse existing components
(`Card`, `Chip`, `StampButton`, `PlaceSearch`, `FloorMap`, `Screen`, `WcIcon`).

---

## Part 1 — Data + logic (no UI)

`src/data/orgs.ts` — 4–5 **made-up** sample orgs (don't use real UT org names, so nothing
looks like a real org's announcement), e.g. "Longhorn Code Club", "Pixel Art Society":
```ts
type Org = { id: string; name: string; short: string; description: string };
```

`src/data/events.ts` — 6–8 sample events in real GDC rooms on several floors (use ids that
exist in `gdc.ts`, e.g. lecture hall `GDC-1.304`, auditorium `GDC-2.216`, a few classrooms):
```ts
type CampusEvent = {
  id: string; orgId: string; title: string; description: string;
  start: string;          // ISO date-time
  minutes: number;        // length
  placeId: string;        // MapNode id of the room
  local?: boolean;        // posted on this phone
};
```
Sample dates are generated **relative to today** (today, tomorrow, +3 days…) so the demo
always has upcoming events. Mark sample events "Sample" in the UI.

`src/events.ts` — pure functions:
- `upcoming(events, now)` — not ended yet, sorted by start
- `groupByDay(events, now)` — "Today", "Tomorrow", then weekday + date
- `forOrgs(events, orgIds)` — events of joined orgs
- `validateNewEvent(draft, now, graph)` — title required (≤ 60 chars), org required and joined,
  room must exist in the graph and not be a hallway point, start in the future, length 15–240 min;
  returns a list of friendly error messages
- `makeEvent(draft)` — builds a `CampusEvent` with a new unique id and `local: true`
- `timeText(event)` — e.g. "Tue, Nov 24 · 7:00–8:30 PM"

`src/storage.ts` — save/load joined org ids and locally posted events with
`@react-native-async-storage/async-storage` (approved for this task; install with
`npx expo install`). Wrap every read/write in try/catch; if storage fails, the app still works
(just forgets on restart).

Tests (`src/events.test.ts`, fixed `now`, answers worked out by hand first):
- upcoming hides ended events and sorts correctly; an event that started 10 min ago but is
  still running counts as upcoming
- groupByDay labels Today / Tomorrow / later days correctly around midnight
- validateNewEvent: each rule has a failing case and a passing case
- data check: every sample event's `placeId` exists in `gdcGraph` and is a room/entrance,
  every `orgId` exists
Break the code once to confirm a test fails.

## Part 2 — Screens

Add to the `Screen` type in `App.tsx`; keep joined orgs + local events in `App.tsx` state
(loaded from storage on start).

1. **Events** — list grouped by day; a toggle **All / My orgs**; each event card: title, org
   chip, time, room name + floor, "Sample" badge if sample. Empty states: "No events yet" /
   "Join an org to see its events here". Buttons: **Organizations**, **Post an event**.
2. **Event detail** — title, org (tap → org page), time, room + floor, description, small
   `FloorMap` with a pin, **Directions** (sets To = the room, keeps From, goes to Route preview),
   and **Join org** if not joined.
3. **Organizations** — list of orgs with short description and number of upcoming events;
   **Join / Joined ✓** toggle on each; tap → org page.
4. **Org page** — name, description, Join/Leave, its upcoming events.
5. **Post an event** — only for orgs you've joined (if none: "Join an organization first" +
   button to Organizations). Fields: org (chips of joined orgs), title, description, day
   (chips: Today, Tomorrow, then the next 5 days), start time (simple hour/minute/AM-PM
   pickers made from chips or steppers — **no new date-picker package**), length (30/60/90/120
   min chips), room (existing `PlaceSearch`). A live preview card of the event. **Post** runs
   `validateNewEvent`; show errors next to the fields; on success go to the new Event detail.
   Locally posted events get a "Delete" button on their detail page.
6. **Home** — add an "Events" entry: a card "Happening today: N events" (or "See upcoming
   events") that opens Events.

Back button on every new screen. Keep layouts phone-first; nothing should jump when errors appear.

## Done when
- `npx tsc --noEmit` and `npm test` pass.
- In the browser and on a phone (Expo Go): join an org → see its events under "My orgs" →
  open one → Directions → arrows to the room. Post an event, see it in the list, get
  directions to it, delete it. Close and reopen the app: joined orgs and posted events are
  still there.
- `CLAUDE.md` updated: new screens in the Screens section, new files in the Files table,
  AsyncStorage added to approved packages.
- `NOTES.md`: decision entry (local-only orgs/events instead of a server — why, and what a real
  version needs: accounts, org verification, shared database, moderation) and a Limitations line
  (posts and memberships live only on one phone; anyone can post as any org they "joined").
- Explain the new code to us in plain words before each commit.
