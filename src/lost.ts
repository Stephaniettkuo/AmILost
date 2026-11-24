// "I'm lost": which places are near where you are on the route, and a new route from the place you pick.
// Pure functions, no screens, so they are easy to test.
import { Step } from './directions';
import { findRoute } from './routing';
import { MapGraph, MapNode, Route } from './types';

export const NEARBY_PX = 150; // "near" = this close to the current step (about 50 ft)
export const MAX_NEARBY = 6;

// How far point p is from the line segment a-b.
function distanceToSegment(p: MapNode, a: MapNode, b: MapNode): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// The places you could be standing next to while doing `step`: rooms, stairs, elevators and entrances on the
// same floor, within NEARBY_PX of the part of the route this step covers, closest first, at most 6.
// (Hallway points and outdoor spots mean nothing to a person, so they are never offered.)
// A step between floors is judged on the floor it starts on.
export function nearbyPlaces(graph: MapGraph, route: Route, step: Step): MapNode[] {
  const walk = route.nodes.slice(step.from, step.to + 1).filter((n) => n.floor === step.floor);
  if (walk.length === 0) return [];
  const distance = (p: MapNode) =>
    walk.length === 1 ? Math.hypot(p.x - walk[0].x, p.y - walk[0].y)
      : Math.min(...walk.slice(1).map((b, i) => distanceToSegment(p, walk[i], b)));

  return graph.nodes
    .filter((n) => n.floor === step.floor && ['room', 'stairs', 'elevator', 'entrance'].includes(n.kind))
    .map((n) => ({ n, d: distance(n) }))
    .filter(({ d }) => d <= NEARBY_PX)
    .sort((a, b) => a.d - b.d || a.n.id.localeCompare(b.n.id))
    .slice(0, MAX_NEARBY)
    .map(({ n }) => n);
}

// What happens when you say "I'm near <picked>":
//  - you picked the destination itself: you have arrived
//  - otherwise a new route from there to the same destination, with the same Elevator-only setting
//  - no way there (or an unknown place): none
export type Rerouted =
  | { kind: 'arrived' }
  | { kind: 'route'; route: Route }
  | { kind: 'none' };

export function reroute(graph: MapGraph, route: Route, pickedId: string, avoidStairs: boolean): Rerouted {
  const destination = route.nodes[route.nodes.length - 1];
  if (!destination) return { kind: 'none' };
  if (pickedId === destination.id) return { kind: 'arrived' };
  const fresh = findRoute(graph, pickedId, destination.id, { avoidStairs });
  return fresh ? { kind: 'route', route: fresh } : { kind: 'none' };
}
