import { describe, expect, test } from '@jest/globals';
import { PX_PER_FOOT, Step, directions, distanceText, routeSummary, stepDistancePx } from './directions';
import { gdcGraph } from './data/gdc';
import { findRoute } from './routing';
import { MapNode, NodeKind, Route } from './types';

// ---- Helpers for the made-up routes ----
// Picture: x goes right, y goes DOWN (like the floor-plan images). Walking east
// (+x), a turn toward bigger y is a RIGHT turn, toward smaller y is a LEFT turn.
const F1 = 'GDC-1';
const F2 = 'GDC-2';
const pt = (id: string, floor: string, x: number, y: number, kind: NodeKind = 'hall', label?: string): MapNode =>
  ({ id, floor, x, y, kind, ...(label ? { label } : {}) });
const route = (...nodes: MapNode[]): Route => ({ nodes, cost: 0 });
const summary = (r: Route) => directions(r).map((s) => [s.arrow, s.text, s.from, s.to]);

const start = pt('A', F1, 0, 0, 'room', 'Start');

describe('directions: made-up routes', () => {
  test('straight line: one "head" step, then arrive', () => {
    // A(0,0) B(100,0) C(200,0) D(280,0): all the same heading, so no turns.
    // The walk ends at C; the nearest landmark to C is Library (80 px away, inside the 120 px limit).
    // Last hop C -> D continues in the same direction, so Library is "just ahead".
    expect(directions(route(start, pt('B', F1, 100, 0), pt('C', F1, 200, 0), pt('D', F1, 280, 0, 'room', 'Library')))).toEqual([
      { arrow: 'straight', text: 'Head toward Library', floor: F1, from: 0, to: 2 },
      { arrow: 'arrive', text: 'Library is just ahead', floor: F1, from: 2, to: 3 },
    ]);
  });

  test('one left turn (north when walking east)', () => {
    // A(0,0) -> B(100,0) east, then B -> C(100,-100) north (y smaller = up on screen).
    // Turn at B: heading (100,0), then (0,-100). Cross product = 100*(-100) - 0*0 = -10000 < 0 -> left.
    // Angle = 90 degrees -> a full turn. No room within 120 px of B, so no landmark in the text.
    // The last hop C -> D(100,-200) keeps going north: just ahead.
    expect(summary(route(start, pt('B', F1, 100, 0), pt('C', F1, 100, -100), pt('D', F1, 100, -200, 'room', 'Cafe')))).toEqual([
      ['straight', 'Head straight', 0, 1],
      ['left', 'Turn left', 1, 2],
      ['arrive', 'Cafe is just ahead', 2, 3],
    ]);
  });

  test('one right turn (south when walking east: y points down!)', () => {
    // A(0,0) -> B(100,0) east, then B -> C(100,100) toward bigger y = down the screen.
    // Cross product = 100*100 - 0*0 = +10000 > 0 -> right. (If the code forgot y is down, this would say left.)
    expect(summary(route(start, pt('B', F1, 100, 0), pt('C', F1, 100, 100), pt('D', F1, 100, 200, 'room', 'Cafe')))).toEqual([
      ['straight', 'Head straight', 0, 1],
      ['right', 'Turn right', 1, 2],
      ['arrive', 'Cafe is just ahead', 2, 3],
    ]);
  });

  test('a small bend (25-60 degrees) is a slight turn', () => {
    // East, then toward (100, 60): angle = atan(60/100) = 31 degrees. Down the screen = right.
    const right = route(start, pt('B', F1, 100, 0), pt('C', F1, 200, 60), pt('D', F1, 300, 120, 'room', 'Cafe'));
    expect(summary(right)[1]).toEqual(['slightRight', 'Turn slightly right', 1, 2]);
    // Mirror image (toward (100,-60), up the screen) = slight left.
    const left = route(start, pt('B', F1, 100, 0), pt('C', F1, 200, -60), pt('D', F1, 300, -120, 'room', 'Cafe'));
    expect(summary(left)[1]).toEqual(['slightLeft', 'Turn slightly left', 1, 2]);
  });

  test('a bend under 25 degrees is not a turn: it joins the current step', () => {
    // East, then toward (100, 40): angle = atan(40/100) = 21.8 degrees -> straight.
    // Walk ends at C(200,40); Cafe(300,80) is 107.7 px away (inside the limit).
    expect(summary(route(start, pt('B', F1, 100, 0), pt('C', F1, 200, 40), pt('D', F1, 300, 80, 'room', 'Cafe')))).toEqual([
      ['straight', 'Head toward Cafe', 0, 2],
      ['arrive', 'Cafe is just ahead', 2, 3],
    ]);
  });

  test('the destination is on the left or right of the hallway', () => {
    // Walking east along A-B-C, then the last hop goes to D. C -> D north (y smaller) is on the left,
    // south is on the right. Both are 60 px from C, so the walk step also names the room.
    const north = route(start, pt('B', F1, 100, 0), pt('C', F1, 200, 0), pt('D', F1, 200, -60, 'room', 'Lab'));
    expect(summary(north)).toEqual([
      ['straight', 'Head toward Lab', 0, 2],
      ['arrive', 'Lab is on your left', 2, 3],
    ]);
    const south = route(start, pt('B', F1, 100, 0), pt('C', F1, 200, 0), pt('D', F1, 200, 60, 'room', 'Lab'));
    expect(summary(south)[1]).toEqual(['arrive', 'Lab is on your right', 2, 3]);
  });

  test('turns are named after a room, stairs, elevator or entrance close by (never a hallway point)', () => {
    // East to B(100,0), then north through H1 (hall, 20 px from B), Gym (room, 60 px from B), C, to Cafe.
    // Turn at B: east -> north = left (90 degrees). Nearest non-hall point within 120 px is Gym (60 px);
    // H1 is closer but it's a hallway point, so it is skipped. The first step ends at B, so it names Gym too.
    // After B the walk continues straight north (no more turns) up to C, then the last hop to Cafe.
    const r = route(start, pt('B', F1, 100, 0), pt('H1', F1, 100, -20), pt('G', F1, 100, -60, 'room', 'Gym'),
      pt('C', F1, 100, -100), pt('D', F1, 100, -200, 'room', 'Cafe'));
    expect(summary(r)).toEqual([
      ['straight', 'Head toward Gym', 0, 1],
      ['left', 'Turn left at Gym', 1, 4],
      ['arrive', 'Cafe is just ahead', 4, 5],
    ]);
  });

  test.each([
    ['stairs', F1, F2, 'stairsUp', 'Take Stairs 1X up to floor 2'],
    ['stairs', F2, F1, 'stairsDown', 'Take Stairs 2X down to floor 1'],
    ['elevator', F1, 'GDC-3', 'elevatorUp', 'Take Elevator 1X up to floor 3'],
    ['elevator', 'GDC-3', F2, 'elevatorDown', 'Take Elevator 3X down to floor 2'],
  ] as const)('floor change via %s from %s to %s', (kind, from, to, arrow, text) => {
    // Start room (0,0) -> lift on the first floor (100,0) -> same lift on the next floor -> Lab (200,0).
    // Indexes: 0 start, 1 lift (leaving floor), 2 lift (arriving), 3 Lab.
    // The walk to the lift is one step ending at index 1 (the lift is the landmark, 0 px away).
    // The floor change is exactly one step covering 1 -> 2, happening on the FIRST floor.
    // After arriving, only the last hop is left (2 -> 3), so it goes straight to "arrive".
    const num = (f: string) => f.slice(-1);
    const name = (f: string) => `${kind === 'stairs' ? 'Stairs' : 'Elevator'} ${num(f)}X`;
    const r = route(
      pt('A', from, 0, 0, 'room', 'Start'),
      pt('L1', from, 100, 0, kind, name(from)),
      pt('L2', to, 100, 0, kind, name(to)),
      pt('R', to, 200, 0, 'room', 'Lab'),
    );
    expect(directions(r)).toEqual([
      { arrow: 'straight', text: `Head toward ${name(from)}`, floor: from, from: 0, to: 1 },
      { arrow, text, floor: from, from: 1, to: 2 },
      { arrow: 'arrive', text: 'Lab is just ahead', floor: to, from: 2, to: 3 },
    ]);
  });

  test('walking after a floor change gets its own step on the new floor', () => {
    // Start -> Stairs 1X (floor 1) -> Stairs 2X (floor 2) -> H(200,0) -> Lab(280,0).
    // Indexes 0..4. After the floor change (step 1 -> 2) the walk 2 -> 3 is a "head toward" step on
    // floor 2 (Lab is 80 px from H), then the last hop 3 -> 4.
    const r = route(
      pt('A', F1, 0, 0, 'room', 'Start'),
      pt('L1', F1, 100, 0, 'stairs', 'Stairs 1X'),
      pt('L2', F2, 100, 0, 'stairs', 'Stairs 2X'),
      pt('H', F2, 200, 0),
      pt('R', F2, 280, 0, 'room', 'Lab'),
    );
    expect(summary(r)).toEqual([
      ['straight', 'Head toward Stairs 1X', 0, 1],
      ['stairsUp', 'Take Stairs 1X up to floor 2', 1, 2],
      ['straight', 'Head toward Lab', 2, 3],
      ['arrive', 'Lab is just ahead', 3, 4],
    ]);
    expect(directions(r)[2].floor).toBe(F2);
  });

  test('odd routes: empty, and already there', () => {
    expect(directions(route())).toEqual([]);
    expect(directions(route(start))).toEqual([
      { arrow: 'arrive', text: "You're already at Start", floor: F1, from: 0, to: 0 },
    ]);
  });
});

describe('distanceText', () => {
  test('uses 3 px per foot and rounds to the nearest 5 ft (never below 5)', () => {
    expect(PX_PER_FOOT).toBe(3);
    expect(distanceText(180)).toBe('about 60 ft'); // 180 / 3 = 60
    expect(distanceText(100)).toBe('about 35 ft'); // 33.3 -> 35
    expect(distanceText(3)).toBe('about 5 ft');    // 1 ft -> 5
  });
});

describe('stepDistancePx and routeSummary', () => {
  test('step distance adds up the straight segments inside the step', () => {
    // (0,0) -> (300,0) -> (300,400) -> (300,500): a step covering points 0..2 is 300 + 400 = 700 px.
    const r = route(start, pt('B', F1, 300, 0), pt('C', F1, 300, 400), pt('D', F1, 300, 500));
    const walk: Step = { arrow: 'straight', text: '', floor: F1, from: 0, to: 2 };
    expect(stepDistancePx(r, walk)).toBe(700);
    // A step between floors has no walking distance, even if the two points were far apart on the plans
    // (here 300 px across and 400 px down would be 500 px if the code wrongly counted it).
    const lift = route(pt('L1', F1, 0, 0, 'stairs'), pt('L2', F2, 300, 400, 'stairs'));
    expect(stepDistancePx(lift, { arrow: 'stairsUp', text: '', floor: F1, from: 0, to: 1 })).toBe(0);
  });

  test('summary: steps, minutes (250 ft per minute), floors when they change', () => {
    // cost 1500 px = 500 ft (3 px per ft) = 2 minutes. A straight 4-point route is 2 steps (head, arrive).
    const flat = { nodes: [start, pt('B', F1, 100, 0), pt('C', F1, 200, 0), pt('D', F1, 280, 0, 'room', 'Library')], cost: 1500 };
    expect(routeSummary(flat, directions(flat))).toBe('2 steps · about 2 min');
    // With stairs: head, take stairs, arrive = 3 steps, and the floors are listed in order visited.
    const up = {
      nodes: [pt('A', F1, 0, 0, 'room', 'Start'), pt('L1', F1, 100, 0, 'stairs', 'Stairs 1X'),
        pt('L2', F2, 100, 0, 'stairs', 'Stairs 2X'), pt('R', F2, 200, 0, 'room', 'Lab')],
      cost: 1500,
    };
    expect(routeSummary(up, directions(up))).toBe('3 steps · about 2 min · floors 1 → 2');
    // Very short walks still say 1 min (never 0), and one step is "1 step".
    const tiny = { nodes: [start, pt('B', F1, 50, 0, 'room', 'Cafe')], cost: 100 };
    expect(routeSummary(tiny, directions(tiny))).toBe('1 step · about 1 min');
  });
});

describe('directions: real GDC routes (worked out from the floor plan)', () => {
  test('2.316 -> 3.304: walk to the NW stairs, go up one floor, arrive', () => {
    // Plan: 2.316 (750,488) sits right next to the NW stairs 2.3S2 (692,488). The stairs go up to
    // 3.3S2 (740,510), and 3.304 (862,510) is just along the hall from there.
    // Route points: 0 = 2.316, 1 = 2.3S2, 2 = 3.3S2, 3 = 3.304.
    // Steps: walk to the stairs; take them up (on floor 2); arrive. We don't know which way you face
    // when you step out of the stairs, so the arrive text says "just ahead".
    const r = findRoute(gdcGraph, 'GDC-2.316', 'GDC-3.304')!;
    expect(directions(r)).toEqual([
      { arrow: 'straight', text: 'Head toward Stairs 2.3S2', floor: 'GDC-2', from: 0, to: 1 },
      { arrow: 'stairsUp', text: 'Take Stairs 2.3S2 up to floor 3', floor: 'GDC-2', from: 1, to: 2 },
      { arrow: 'arrive', text: '3.304 is just ahead', floor: 'GDC-3', from: 2, to: 3 },
    ]);
  });

  test('main entrance -> 2.702: across the atrium, 2.702 is on your right', () => {
    // Plan: main doors (752,820) -> hall-Q (800,820) -> hall-Z (921,844) -> 2.702's door (920,942).
    // Q: heading (48,0) then (121,24) is a 11 degree bend -> not a turn, so the walk is one step (0 -> 2).
    // 2.702 is 98 px from Z (inside the 120 px landmark limit).
    // Last hop: heading (121,24) then (-1,98): cross = 121*98 - 24*(-1) = +11882 > 0 and the angle is
    // about 79 degrees -> right (south of an east-bound walk is on your right).
    const r = findRoute(gdcGraph, 'GDC-2-entrance-main', 'GDC-2.702')!;
    expect(directions(r)).toEqual([
      { arrow: 'straight', text: 'Head toward 2.702', floor: 'GDC-2', from: 0, to: 2 },
      { arrow: 'arrive', text: '2.702 is on your right', floor: 'GDC-2', from: 2, to: 3 },
    ]);
  });

  test("men's room 2.202 -> 2.816: around the stairwell, down past the elevator, east (7 steps)", () => {
    // Route (already checked in routing.test.ts) with points (x,y):
    //   0 2.202 (975,522)  1 2.204  2 hall-G  3 hall-N (975,705)  4 hall-O (1035,712)  5 hall-S (1090,821)
    //   6 hall-U (975,950)  7 Elevator 2.6E1 (975,975)  8 hall-T (978,1151)
    //   9..16 = 2.802 ... 2.816, all along y=1150 (x from 1048 to 1200)
    // Turns (cross product; negative = left, positive = right, y points down):
    //   2.204, hall-G: straight south
    //   hall-N: south (0,100) -> east (60,7): cross = -6000, 83 degrees -> LEFT (facing south, east is on your left)
    //   hall-O: (60,7) -> (55,109): cross = +6155, 57 degrees -> SLIGHT RIGHT
    //   hall-S: (55,109) -> (-115,129): cross = +19630, 68 degrees -> RIGHT
    //   hall-U: (-115,129) -> (0,25): cross = -2875, 42 degrees -> SLIGHT LEFT
    //   6E1: (0,25) -> (3,176): 1 degree -> straight
    //   hall-T: south (3,176) -> east (70,-1): cross = -12323, 90 degrees -> LEFT
    //   2.802 ... 2.814: straight east, and the last hop to 2.816 is too -> "just ahead"
    // Names (landmark within 120 px, never a hall point, never the start):
    //   N: 2.204 is 143 px away -> none.  O: 2.204 is 161 px -> none.  S: the elevator is 192 px -> none.
    //   U: Elevator 2.6E1 is 25 px away -> named.  T: 2.802 is 70 px away (the closest) -> named.
    const r = findRoute(gdcGraph, 'GDC-2.202', 'GDC-2.816')!;
    expect(directions(r)).toEqual([
      { arrow: 'straight', text: 'Head straight', floor: 'GDC-2', from: 0, to: 3 },
      { arrow: 'left', text: 'Turn left', floor: 'GDC-2', from: 3, to: 4 },
      { arrow: 'slightRight', text: 'Turn slightly right', floor: 'GDC-2', from: 4, to: 5 },
      { arrow: 'right', text: 'Turn right', floor: 'GDC-2', from: 5, to: 6 },
      { arrow: 'slightLeft', text: 'Turn slightly left at Elevator 2.6E1', floor: 'GDC-2', from: 6, to: 8 },
      { arrow: 'left', text: 'Turn left at 2.802', floor: 'GDC-2', from: 8, to: 15 },
      { arrow: 'arrive', text: '2.816 is just ahead', floor: 'GDC-2', from: 15, to: 16 },
    ]);
  });
});
