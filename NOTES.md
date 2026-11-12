# AmILost — working notes

Running log for the final slides. Add a line when it happens, with the date,
who, and a link to the commit or file.

## Decisions
Format: what we chose · what else we considered · why (evidence) · what the agent did, what we checked

- 2026-11-08 · Expo (React Native + TypeScript) instead of a plain web app · web app · we want a real phone app; Expo also runs in the browser for the demo
- 2026-11-08 · Map stored as a graph (nodes + edges) in our own types (`src/types.ts`) · drawing routes freehand / an outside indoor-map service · lets us use Dijkstra and test routes against answers worked out by hand from the floor plans
- 2026-11-12 · Editor gets a **Lines** mode (dot→dot adds a line; tapping a line splits it with a new hallway point, then the next tap connects it) · a separate "connect two lines" tool / making users drag points to fix wrong routes · some lines send routes the wrong way and we could only edit points; one mode with two tap rules keeps the editor small, and it reuses `addEdge` (already refuses duplicates and self-lines) · agent wrote `splitEdgeAt` + tests (tests written first and seen failing; then broke `splitEdgeAt` on purpose and 2 tests failed). We checked in the browser on floor 2: split a line, connected it to a second line, tried a duplicate (refused, no Undo step), cancelled, undid both steps; the export box matched each step

## Debugging log
Format: symptom · how we narrowed it down · fix · how we checked it

- 2026-11-10 · New data checks failed on our own floor 2 data: a room id `GDC-2.Atrium` (not a plan number) and the line hall-AB – Atrium listed twice · tests "ids follow our naming format" and the new "no line is listed twice" named them · editor now refuses duplicate lines and wrong-category ids; the Atrium can be fixed in Edit mode (plan number 2.100, name "Atrium") · browser test of that fix + export passes all checks
- 2026-11-10 · Deleting the duplicated Atrium line cut the Atrium off entirely · Delete removed every copy of that line, not one · now removes one copy (unit test added). Also: on that ~30 px line, tapping its middle deleted the hall-AB dot instead (dots won within 15 px); Delete now needs a tap right on a dot, so short lines are tappable · browser test: one line left, map stays connected

- 2026-11-10 · Editor: a new room landed on the hallway line instead of 22 px below it, where it was tapped · browser test logged the map's position before and after the action: the map moved down 17 px when the first status message appeared, so the tap hit a different spot. An empty message line had zero height in the browser · gave the message line a fixed height · re-ran: map position identical before/after (y 210), room placed at the tapped spot (1110, 1172). Also found: names shortened one character too far ("GDC-2.402" shown as ".402") — fixed the regex

- 2026-11-10 · Floor 2 draft: two atrium edges drawn straight through stairwell 2.1S1 · agent rendered the graph over the floor plan and looked at each area; the lines from the main hallway into the atrium crossed the stair block · added two hallway points (hall-M, hall-O area) so the path goes around the stairwell · re-rendered; lines now stay in open floor. Caught by the agent's own overlay check, before our review

- 2026-11-08 · Tracing mode on web recorded taps as `x: NaN, y: NaN` and drew no dots · scripted browser test clicked known image pixels (1000,500) and logged the output; `nativeEvent.locationX` was undefined, so the bug was in reading the tap, not in the scale math · `Pressable onPress` on web is a click event with no location; switched to the responder handlers (`onStartShouldSetResponder` + `onResponderRelease`), which report `locationX/Y` on web and phone · same test now logs (1000,500) and (1799,439) for clicks at (1000,500) and (1800,440); off by ≤1 px from rounding. Agent (Claude) wrote the first version, caught it in its own browser test, and fixed it

## Who did what
- Stephanie:
- Cienna:

## Reused code and libraries
- Expo SDK 58 (`blank-typescript` template), react-native-svg 15.16.0, jest-expo 58

## Floor 2 draft review
Agent draft (commit d5309b2) vs. our reviewed data (commit 02684d7), compared by script:
- Points: 106 → 115. Moved more than 3 px: 6 (2.1S1, 2.216, 2.2E2, 2.2E3, 2.402, 2.5S3). Deleted: 0. Category changed: 0
- Added 9: 4 entrances the agent missed, 4 new hallway points, and the atrium (2.100). The main entrance (below) was also missed, but fixed before d5309b2 was committed
- Lines: 11 removed, 20 added (108 → 117)
- `needsCheck` flags: only 2 of the 6 moved points had been flagged (2.402, 2.1S1); 4 moved points were not flagged (both elevators 2.2E2/2.2E3, auditorium 2.216, stairs 2.5S3). The agent's own uncertainty didn't predict its mistakes well
- 2026-11-10 · Missing point: the main entrance is the double doors west of the atrium (by hall-Q); the agent hadn't marked it as an entrance. Added `GDC-2-entrance-main` at (752, 820), connected to hall-Q
- Verdict (use agent drafts for floors 1 and 3?): _decide together_ — about 94% of draft points kept their position, but it missed most entrances and misplaced both elevators

## Limitations / ideas for later
- Room 2.902 is left out on floor 2: its only door is on the outside walkway, not inside the building
- Floor 2 atrium (2.100): not sure which parts are open floor vs. open-to-below; draft assumes both sides of the 2.100 outline are walkable
- Routes can go outside through the floor 2 patio (between the atrium and the 2.400 hallway). Fine in good weather; no "stay indoors" option yet
- Floor 1 entrances are guesses (west entrance through 1.702, north entrance through 1.410, two east exits); floor 3 has no entrances or bridges to other buildings in the data
- Floor 1's north and south blocks don't connect on floor 1 in our data (we couldn't confirm a passage), so routes between them go through floor 2
- Stair/elevator costs (150 / 250) are guesses, not measured
- No live location: the user picks a starting point
