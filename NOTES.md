# AmILost — working notes

Running log for the final slides. Add a line when it happens, with the date,
who, and a link to the commit or file.

## Decisions
Format: what we chose · what else we considered · why (evidence) · what the agent did, what we checked

- 2026-11-08 · Expo (React Native + TypeScript) instead of a plain web app · web app · we want a real phone app; Expo also runs in the browser for the demo
- 2026-11-08 · Map stored as a graph (nodes + edges) in our own types (`src/types.ts`) · drawing routes freehand / an outside indoor-map service · lets us use Dijkstra and test routes against answers worked out by hand from the floor plans

## Debugging log
Format: symptom · how we narrowed it down · fix · how we checked it

- 2026-11-08 · Tracing mode on web recorded taps as `x: NaN, y: NaN` and drew no dots · scripted browser test clicked known image pixels (1000,500) and logged the output; `nativeEvent.locationX` was undefined, so the bug was in reading the tap, not in the scale math · `Pressable onPress` on web is a click event with no location; switched to the responder handlers (`onStartShouldSetResponder` + `onResponderRelease`), which report `locationX/Y` on web and phone · same test now logs (1000,500) and (1799,439) for clicks at (1000,500) and (1800,440); off by ≤1 px from rounding. Agent (Claude) wrote the first version, caught it in its own browser test, and fixed it

## Who did what
- Stephanie:
- Cienna:

## Reused code and libraries
- Expo SDK 58 (`blank-typescript` template), react-native-svg 15.16.0, jest-expo 58

## Limitations / ideas for later
-
