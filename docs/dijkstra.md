# How `findRoute` works (Dijkstra's algorithm)

**Goal:** given our map (points + lines with lengths), find the shortest walk
from a start point to a destination.

## The idea in one analogy

Imagine pouring water at the start point. It spreads along every hallway at
the same speed. The first time the water *reaches* a point, it got there by
the shortest possible path — nothing could have arrived sooner. Dijkstra
simulates that: it always "finishes" whichever point the water reaches next.

## The three things it keeps track of

| Name in the code | What it means |
|---|---|
| `best` | shortest distance found **so far** to each point |
| `cameFrom` | for each point, the step right before it on that shortest walk |
| `done` | points whose distance is final (the water has reached them) |

## The loop

1. **Pick** the unfinished point with the smallest `best` distance. Mark it done.
2. **Relax its neighbors:** for each neighbor, is `best[current] + line length`
   shorter than the neighbor's `best`? If yes, update `best` and set
   `cameFrom[neighbor] = current`.
3. **Repeat** until the destination is picked (found) or nothing is left
   (no path → `null`).
4. **Rebuild the path** by following `cameFrom` backwards from the destination.

## Worked example

```
        4         1
  S --------- A ------- E
  |                    /
  1                   5
  |                  /
  B --------------- C
          1
```
Lines: S–A 4, A–E 1, S–B 1, B–C 1, C–E 5. Shortest S → E?

| Step | Pick (done) | Updates to `best` (and `cameFrom`) | `best` after the step |
|---|---|---|---|
| 0 | — | start: S = 0 | S 0 |
| 1 | **S** (0) | A = 0+4 = 4 (from S), B = 0+1 = 1 (from S) | A 4, B 1 |
| 2 | **B** (1) — smallest | C = 1+1 = 2 (from B) | A 4, C 2 |
| 3 | **C** (2) | E = 2+5 = 7 (from C) | A 4, E 7 |
| 4 | **A** (4) | E: 4+1 = 5 < 7 → E = 5 (from **A**) | E 5 |
| 5 | **E** (5) — destination | stop | |

Walk back: E ← A ← S. **Route S → A → E, length 5.**

Notice step 3: going S → B → C → E looked good at first (E = 7), but A was
still unfinished and closer, so Dijkstra checked it before trusting 7 —
and found 5. That's why it always picks the *closest unfinished* point.

## How this maps to our app

- A **point** is a `MapNode` (room door, hallway corner, stairs, …).
- A **line's length** is the straight-line distance in pixels between its two
  points (`edgeCost`), or the `cost` we set by hand for stairs/elevators
  between floors, where pixel distance means nothing.
- **Elevator only** = skip stair lines between floors (`avoidStairs`).
- Our version picks the closest point by looking through all of them each
  time. That's the simplest way to write it and plenty fast for a few
  hundred points. (Big maps use a "priority queue" to pick faster.)

## How we test it

`src/routing.test.ts`:
- **Small made-up maps** where the answer is obvious, including one where the
  route with *more stops* is *shorter* — a router that just counts stops fails it.
- **Real GDC trips** whose expected paths we worked out from the floor plan
  *before* running the code (e.g. main entrance → 2.316 goes up the main
  hallway, ~344 px, not around the NW wing, ~523 px).
- We checked the tests can fail: changing `edgeCost` to "count stops" makes 3 fail.
