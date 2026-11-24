// Turns a route (a list of points) into turn-by-turn steps for the arrow screen.
// No UI here: just geometry and wording, so it is easy to test.
import { placeName } from './names';
import { MapNode, Route } from './types';

export type Arrow =
  | 'straight' | 'left' | 'right' | 'slightLeft' | 'slightRight'
  | 'stairsUp' | 'stairsDown' | 'elevatorUp' | 'elevatorDown' | 'arrive';

export type Step = {
  arrow: Arrow;
  text: string;   // "Turn left at Men's restroom (2.202)", "Take Elevator 2.2E2 up to floor 3"
  floor: string;  // floor this step happens on (for switching the map)
  from: number;   // index of the first route point this step covers
  to: number;     // index of the last route point this step covers
};

export const PX_PER_FOOT = 3; // rough; to be calibrated on the walk test

const STRAIGHT_DEG = 25; // a bend smaller than this is not a turn
const SLIGHT_DEG = 60;   // 25-60 degrees is "slight", more is a full turn
const LANDMARK_PX = 120; // a name is used only if the room/stairs is this close (about 40 ft)

// "about 60 ft": feet rounded to the nearest 5, never less than 5.
export function distanceText(px: number): string {
  const feet = Math.max(5, Math.round(px / PX_PER_FOOT / 5) * 5);
  return `about ${feet} ft`;
}

// The turn made at point b when walking a -> b -> c, in degrees.
// The image's y axis points DOWN, so a positive angle is a RIGHT turn on screen.
function turnAngle(a: MapNode, b: MapNode, c: MapNode): number {
  const ux = b.x - a.x, uy = b.y - a.y; // way in
  const vx = c.x - b.x, vy = c.y - b.y; // way out
  return (Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy) * 180) / Math.PI; // cross, dot
}

function turnArrow(angle: number): Arrow {
  const size = Math.abs(angle);
  if (size < STRAIGHT_DEG) return 'straight';
  if (size < SLIGHT_DEG) return angle < 0 ? 'slightLeft' : 'slightRight';
  return angle < 0 ? 'left' : 'right';
}

const TURN_TEXT: Partial<Record<Arrow, string>> = {
  left: 'Turn left', right: 'Turn right',
  slightLeft: 'Turn slightly left', slightRight: 'Turn slightly right',
};

// Name of the closest room/stairs/elevator/entrance on the route near point i
// (hallway points are never used, and neither is the start: you're leaving it).
function landmarkNear(nodes: MapNode[], i: number): string | null {
  let best: MapNode | null = null;
  let bestDist = Infinity;
  nodes.forEach((n, j) => {
    if (j === 0 || n.kind === 'hall' || n.floor !== nodes[i].floor) return;
    const d = Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y);
    if (d <= LANDMARK_PX && d < bestDist) { best = n; bestDist = d; }
  });
  return best ? placeName(best) : null;
}

// "GDC-3" -> 3
const floorNumber = (floorId: string) => Number(floorId.match(/(\d+)$/)?.[1] ?? 0);

// One step for walking from point a (on one floor) to point b (same lift, other floor).
function floorChangeStep(a: MapNode, b: MapNode, i: number): Step {
  const up = floorNumber(b.floor) > floorNumber(a.floor);
  const lift = a.kind === 'elevator' || b.kind === 'elevator';
  const arrow: Arrow = lift ? (up ? 'elevatorUp' : 'elevatorDown') : (up ? 'stairsUp' : 'stairsDown');
  return {
    arrow, floor: a.floor, from: i - 1, to: i,
    text: `Take ${placeName(a)} ${up ? 'up' : 'down'} to floor ${floorNumber(b.floor)}`,
  };
}

// Is the destination to the left or right of the way you were walking?
// Looks at the last hop (hallway point -> room) against the walk before it.
// If that bend is small, or the walk before it is on another floor, it's just "ahead".
function arriveText(nodes: MapNode[]): string {
  const last = nodes.length - 1;
  const dest = placeName(nodes[last]);
  if (last === 0) return `You're already at ${dest}`;
  const door = nodes[last - 1], before = nodes[last - 2];
  if (before && before.floor === door.floor && door.floor === nodes[last].floor) {
    const angle = turnAngle(before, door, nodes[last]);
    if (Math.abs(angle) >= STRAIGHT_DEG) return `${dest} is on your ${angle < 0 ? 'left' : 'right'}`;
  }
  return `${dest} is just ahead`;
}

// Steps share their end points: a step's `to` is the next step's `from`.
// The very last hop (to the destination) belongs to the "arrive" step, so a turn
// right before it is not a turn: that hop is just "the room is on your left/right".
export function directions(route: Route): Step[] {
  const nodes = route.nodes;
  const last = nodes.length - 1;
  if (last < 0) return [];

  const steps: Step[] = [];
  let start = 0;                 // where the walking step being built began
  let arrow: Arrow = 'straight'; // how it begins: the turn made at `start`, or straight

  // Close the walking step at point `to` (nothing to add if it would be empty).
  function walkTo(to: number) {
    if (to <= start) return;
    const text = arrow === 'straight'
      ? (landmarkNear(nodes, to) ? `Head toward ${landmarkNear(nodes, to)}` : 'Head straight')
      : `${TURN_TEXT[arrow]}${landmarkNear(nodes, start) ? ` at ${landmarkNear(nodes, start)}` : ''}`;
    steps.push({ arrow, text, floor: nodes[start].floor, from: start, to });
  }

  for (let i = 1; i <= last; i++) {
    const before = nodes[i - 1], here = nodes[i], next = nodes[i + 1];
    if (here.floor !== before.floor) {
      walkTo(i - 1);
      steps.push(floorChangeStep(before, here, i));
      start = i;
      arrow = 'straight';
    } else if (i <= last - 2 && next.floor === here.floor) {
      const turn = turnArrow(turnAngle(before, here, next));
      if (turn !== 'straight') {
        walkTo(i);
        start = i;
        arrow = turn;
      }
    }
  }

  walkTo(last - 1);
  steps.push({
    arrow: 'arrive', text: arriveText(nodes), floor: nodes[last].floor,
    from: Math.max(start, last - 1), to: last,
  });
  return steps;
}

export const WALK_FT_PER_MIN = 250; // about 3 mph

// How far a step walks, in plan pixels (0 for a step between floors).
export function stepDistancePx(route: Route, step: Step): number {
  let total = 0;
  for (let i = step.from; i < step.to; i++) {
    const a = route.nodes[i], b = route.nodes[i + 1];
    if (a.floor === b.floor) total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

// The short facts under the route: ["about 2 min", "Floors 1 to 2"] (or ["about 1 min", "Floor 2"]).
export function routeFacts(route: Route): string[] {
  const minutes = Math.max(1, Math.round(route.cost / PX_PER_FOOT / WALK_FT_PER_MIN));
  const floors = route.nodes.map((n) => n.floor.replace('GDC-', ''));
  const first = floors[0], last = floors[floors.length - 1];
  return [`about ${minutes} min`, first === last ? `Floor ${first}` : `Floors ${first} to ${last}`];
}
