# Task: CS events, following groups, posting events, and "I'm lost"

Goal: students browse real UTCS events, search and filter them, follow groups, and tap
**Directions** to be guided to the room with the existing route + arrow screens. Plus an
**"I'm lost"** button that re-routes from a room the student says they're near.

Work on a branch called `events`. Do the parts **in order** and stop after each part so we
can check it (tests pass, it looks right on the phone, we understand the code). Commit each
part separately. Follow the design system in `CLAUDE.md` and reuse existing components and
screens (search, `FloorMap`, Route preview, Directions). This replaces the earlier version of
this spec.

---

## The data source (read this first)

UTCS publishes its events calendar as an iCal feed (linked from the "iCal" button on
https://apps.cs.utexas.edu/calendar). Do **not** scrape the calendar web pages
(their robots.txt disallows it); only use the feed.

- Live feed: `https://p106-caldav.icloud.com/published/2/MTczOTUxOTA2ODExNzM5NbIQ75YFeLwK-LANlyWBYbU8ZPTfALGVK_nN5W3UJYXs2o6iwRiFvI8pW5y9gwDat10HOpVkpKfXYVCE6ZTfedg`
  (the site shows it as `webcal://…`; use `https://`).
- Snapshot (committed): `data/cs-calendar.ics`, downloaded 2026-11-24. Used when the fetch
  fails, on web (the browser will likely block the fetch: CORS), in tests, and for grading.
  Metro can't import `.ics` files, so add `scripts/snapshot-calendar.mjs` that turns
  `data/cs-calendar.ics` into `src/data/calendarSnapshot.ts` (`export default \`…\``), and put
  the command in the README. To refresh: download the feed to `data/cs-calendar.ics`, rerun.

What the feed contains (checked by hand, 28 events):
- `SUMMARY` (title), `DESCRIPTION` (text, escaped `\,` `\;` `\n`, long lines folded with a
  leading space), `DTSTART`/`DTEND` with `TZID=America/Chicago` (wall-clock Austin time),
  `UID`, `URL` (the event's UTCS page).
- **Repeats:** most events have `RRULE:FREQ=WEEKLY` with `INTERVAL`, `BYDAY`, and `COUNT` or
  `UNTIL`, plus `EXDATE` lines for skipped weeks. All repeats in the feed are weekly.
- **Rooms:** only **4 of 28** events have `LOCATION`, e.g. `GDC 2.216`, `GDC 2.100 (Atrium)`,
  `GDC 4.516`, `GDC 6.816` — all four exist in `gdc.ts`. Most others are room bookings
  (URL contains `/calendar/rooms/`) with no room number in the feed.
- **No organization field.** Group names only appear in titles sometimes:
  "FoCS: …", "Project AMAZE (ECLAIR)", "Texas Convergent …", "NLL: …", "LARG …", "AMRL …",
  "RobIn …", "… DiRP" / "Directed Reading Program".

## Part 1 — Calendar logic (no UI)

`src/calendar/ics.ts`
- `parseIcs(text): CalEvent[]` — unfold lines, unescape text, read the fields above.
  Hand-written (the format is simple); no new package.
- `occurrences(event, from, to): Occurrence[]` — expand weekly repeats (INTERVAL, BYDAY,
  COUNT, UNTIL, EXDATE). Unknown/unsupported RRULEs: just the first occurrence.
- Times: treat `TZID=America/Chicago` values as Austin wall-clock time; make tests independent
  of the computer's time zone (e.g. compare wall-clock fields, or set `TZ=America/Chicago`
  for Jest in package.json).

`src/calendar/events.ts`
- `roomFor(location, graph)` — `"GDC 2.100 (Atrium)"` → `GDC-2.100` if that node exists;
  otherwise `null` (other buildings, missing rooms).
- `groupFor(title, description)` — a small hand-made table in `src/data/groups.ts`
  (`{ id, name, keywords[] }`) for the groups above; no match → no group.
- `search(list, query)` — matches title, description, group name; case-insensitive.
- `inRange(list, 'day' | 'week' | 'month', date)` and `groupByDay(list, now)`
  ("Today", "Tomorrow", then "Fri, Dec 4").
- Merges feed events + locally posted events (Part 3) into one sorted list.

`src/calendar/source.ts`
- `loadEvents()` — try the live feed (timeout ~8 s); on success save the text with
  AsyncStorage and use it; on failure use the last saved copy; else the snapshot. Report which
  one was used ("Live", "Saved Nov 24", "Offline snapshot") so the UI can show it.
- `@react-native-async-storage/async-storage` is approved for this task (`npx expo install`).
  Wrap every storage call in try/catch.

Tests (`src/calendar/*.test.ts`), answers worked out by hand from `data/cs-calendar.ics`
first, with the reasoning in comments; break the code once to see a test fail:
- parsing: folded DESCRIPTION, `\,` and `\n`, the 4 LOCATION events
- repeats (checked by hand against the snapshot):
  - "LARG Meeting": weekly Wednesdays from Dec 2, UNTIL May 2027 → Dec 2, 9, 16, …
  - "NLL: NLP Reading Group": every 2 weeks on Fridays from Nov 27, UNTIL Dec 5 → **only Nov 27**
  - "FarmBrain Sync": COUNT=2, Fridays from Nov 27 → Nov 27 and Dec 4
  - EXDATE: in this feed every EXDATE is *before* its event's DTSTART (the feed lists the next
    occurrence as DTSTART), so also test skipping with a small made-up event whose EXDATE
    falls after DTSTART
- `roomFor`: the 4 real locations map to existing node ids; "Zoom" / "PAI 3.02" → null
- `groupFor`, `search`, `inRange` (day/week/month edges at midnight), `groupByDay`
- `loadEvents` falls back correctly (mock fetch to succeed / fail)

## Part 2 — Events screens

Add screens to `App.tsx` (state-based, like the others):

1. **Events** — search box (event or group name); **Day / Week / Month** toggle with a simple
   date strip (arrows to move by a day/week/month); a **Following** filter chip; list grouped
   by day. Each card: title, time, group chip (if any), room + floor or "Room not listed".
   Small source label ("Live" / "Offline snapshot"). Pull to refresh on the phone.
   Empty states: "No events this week" / "No matches".
2. **Event detail** — title, group (tap → group page), date + time, room, description
   (scrollable), and:
   - room on our map → small `FloorMap` with a pin + **Directions** (To = the room, keep From,
     go to Route preview)
   - no room → "Room not listed" + **Open on UTCS calendar** (opens the event's URL)
   - **Follow group** if it has a group.
3. **Groups** — the groups from `groups.ts`: name, short description, number of upcoming
   events, **Follow / Following ✓**. Tap → **Group page**: its upcoming events.
4. **Home** — add an "Events" entry: "Happening today: N events" (or "See upcoming events").
5. Followed groups are saved on the phone (AsyncStorage) and survive restarts.

## Part 3 — Post an event (local only)

- **Post an event** button on Events. Fields: title, description, group (optional, from
  `groups.ts`), day (chips: Today, Tomorrow, next 5 days), start time (simple chips or
  steppers — **no new date-picker package**), length (30/60/90/120 min), room (existing
  search). Live preview card. Validation with friendly messages next to the fields: title
  required (≤ 60 chars), room must be a real room, time in the future.
- Posted events are saved **only on this phone**, shown with a "Posted by you" badge, merged
  into the list, have Directions, and can be deleted.
- Pure `validateNewEvent` + tests (each rule fails and passes).

## Part 4 — "I'm lost"

On the **Directions** screen, an **I'm lost** button:
1. Opens a card: "No worries! What room are you near?"
2. **Suggestions first:** rooms/stairs/elevators/entrances within ~150 px of the current
   step's part of the route, on that floor, closest first (max 6). Below: the normal room search.
3. Picking one re-runs `findRoute` from that place to the **same destination**, with the same
   Elevator-only setting, and restarts Directions at step 1 with a short note
   ("New route from 2.316").
4. Picked the destination → go to Arrived. No route → "Can't find a way from there — try a
   nearby room?"
- Pure `nearbyPlaces(graph, route, stepIndex)` and `reroute(...)` + tests (worked out by hand).

## Done when
- `npx tsc --noEmit` and `npm test` pass.
- On a phone (Expo Go) with internet: Events shows "Live"; search "lecture" → Distinguished
  Lecture → Directions → arrows to GDC 2.216. Follow a group, restart the app, still followed.
  Post an event, get directions to it, delete it. On a route, tap I'm lost → pick a nearby
  room → new route.
- With internet off (or on web): Events shows the snapshot and still works.
- README: how to refresh the snapshot. `CLAUDE.md`: new screens/files, AsyncStorage approved,
  "never scrape the calendar pages, only the iCal feed".
- `NOTES.md`: decisions (iCal feed + snapshot instead of scraping — robots.txt; groups from a
  keyword table because the feed has no org field; local-only posting) and limitations (only
  4 of 28 feed events list a room; group matching by keywords can miss/mislabel; posts live on
  one phone).
- Explain the new code to us in plain words before each commit.
