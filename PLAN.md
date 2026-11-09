# AmILost — project plan

Room-level navigation for GDC (floors 1–3). Pick a start and a destination,
see the route on the floor plans, choose stairs or elevator.

**Due:** demo + code + slide PDF on **Tue Dec 1, 3:00pm**. Slides can be
resubmitted until Dec 6.

---

## How we work (every task, same loop)

1. **Pick a task** from the checklist below and say who's on it.
2. **Make a branch**
   ```bash
   git checkout main && git pull
   git checkout -b short-task-name      # e.g. trace-floor-1
   ```
3. **Do it, with an agent when useful.** Tell the agent exactly what you want,
   which files to touch, and what "done" means. Point it at `src/types.ts`.
4. **Check the work yourself.** Read the diff, then run:
   ```bash
   npx tsc --noEmit   # type errors
   npm test           # tests
   npx expo start     # look at it on phone (Expo Go) or web (press w)
   ```
   Don't merge code neither of us understands. Either of us should be able to
   explain any file in the demo.
5. **Log it** in `NOTES.md` if you made a choice, fixed a bug, or the agent got
   something wrong.
6. **Push and open a pull request**
   ```bash
   git add -A && git commit -m "What changed"
   git push -u origin short-task-name
   ```
   Open the PR on GitHub. The other person looks it over, then merge into `main`.
7. **Delete the branch** after merging, and `git pull` on main before the next task.

Keep branches small (one task each) so merges don't conflict.

---

## Checklist

### Phase 0 — Setup (Nov 8–10)
- [x] Expo project, SVG, web support, Jest
- [x] Shared types (`src/types.ts`), sample graph, notes log
- [x] Floor plan images in `assets/` as `gdc-1.png`, `gdc-2.png`, `gdc-3.png`
- [x] Image sizes recorded in `src/data/floors.ts`
- [ ] Both partners run the app on their own phone from a fresh `git pull`

### Phase 1 — One floor working end to end (Nov 10–15)
- [ ] Screen shows one floor plan image with the sample route drawn on top
- [x] **Tracing mode:** tap the floor plan, app prints the x/y. This is how we
      get coordinates for nodes instead of guessing them
- [ ] Trace GDC floor 1: rooms, hallway corners/intersections, entrances,
      stairs, elevators → `src/data/gdc.ts`
- [ ] `findRoute(graph, startId, endId)` using Dijkstra → `src/routing.ts`
- [ ] First tests: 2–3 trips on floor 1 with answers worked out by hand
- [ ] Data check test: every edge points to real nodes, every room is reachable
- [ ] Screen draws a real route on floor 1

### Phase 2 — All three floors + choices (Nov 16–21)
- [ ] Trace GDC floors 2 and 3
- [ ] Connect floors with stairs and elevator edges (set `cost` by hand)
- [ ] Floor switcher: route shows each floor's part, user flips between them
- [ ] Start and destination pickers (search a room by label)
- [ ] Stairs / elevator option. Elevator-only routing skips stair edges
- [ ] Tests: one cross-floor trip, one elevator-only trip, one with no path → `null`

### Phase 3 — Make it usable (Nov 22–26, Thanksgiving week, plan light)
- [ ] Step-by-step directions ("Take the elevator to floor 3, turn left…")
- [ ] Pinch-to-zoom / pan on the floor plan
- [ ] **In-person walk test:** walk 3–5 routes in GDC, write down whether the
      app's route matched what you'd actually walk (results in `NOTES.md`)
- [ ] Fix anything the walk test exposed

### Phase 4 — Ship (Nov 27–Dec 1)
- [ ] README: setup steps, versions, how to run the app and the tests
- [ ] Fill in the slides (template: 6 slides) from `NOTES.md`
- [ ] Rehearse from a clean clone: `git clone`, `npm install`, `npm test`, `npx expo start`
- [ ] Run `git ls-files --error-unmatch PATH` on every file the slides link to
- [ ] Submit repo URL + slide PDF; book the demo slot

---

## How we test (three layers)

1. **Route tests (Jest).** Pick trips, work out the correct path by hand on the
   floor plan, write it as the expected answer. This is the "test that could
   catch a wrong result" for the demo; the expected answer comes from the floor plan.
2. **Data checks (Jest).** Catch tracing mistakes: edges to missing nodes,
   rooms that can't be reached, nodes on the wrong floor.
3. **Walk tests (in person).** Walk real routes in GDC and compare. Catches
   things code tests can't, like a "shortcut" through a locked door.

---

## Decisions already made
See `NOTES.md` → Decisions.

## Later, if there's time
- Events posted on the map (orgs/university), including unnamed spots
- More buildings, outdoor routes between buildings
