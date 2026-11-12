// Route finding with Dijkstra's algorithm. See docs/dijkstra.md for a
// step-by-step walkthrough with a small example.
import { MapEdge, MapGraph, MapNode, Route } from './types';

export type RouteOptions = {
  avoidStairs?: boolean; // elevator-only: never take stairs between floors
};

// How "long" one line is: its `cost` if set (stairs/elevators between floors),
// otherwise the straight-line distance in image pixels.
export function edgeCost(a: MapNode, b: MapNode, e: MapEdge): number {
  return e.cost ?? Math.hypot(a.x - b.x, a.y - b.y);
}

// Lines the route is allowed to use with these options.
function usable(a: MapNode, b: MapNode, options: RouteOptions): boolean {
  const changesFloor = a.floor !== b.floor;
  if (options.avoidStairs && changesFloor && (a.kind === 'stairs' || b.kind === 'stairs')) return false;
  return true;
}

// Shortest walk from start to end, or null if there's no way there.
export function findRoute(
  graph: MapGraph, startId: string, endId: string, options: RouteOptions = {},
): Route | null {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!byId.has(startId) || !byId.has(endId)) return null;

  // For each point: which points can I walk to directly, and how far is it?
  const neighbors = new Map<string, { id: string; cost: number }[]>(
    graph.nodes.map((n) => [n.id, []]),
  );
  for (const e of graph.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || !usable(a, b, options)) continue;
    const cost = edgeCost(a, b, e);
    neighbors.get(a.id)!.push({ id: b.id, cost });
    neighbors.get(b.id)!.push({ id: a.id, cost }); // lines go both ways
  }

  const best = new Map<string, number>([[startId, 0]]); // shortest distance found so far
  const cameFrom = new Map<string, string>();           // the step before, on that shortest walk
  const done = new Set<string>();                       // points whose distance is final

  while (true) {
    // 1. Pick the closest point that isn't finished yet.
    let current: string | null = null;
    for (const [id, d] of best) {
      if (!done.has(id) && (current === null || d < best.get(current)!)) current = id;
    }
    if (current === null) return null; // nothing left to explore: no path
    if (current === endId) break;      // the destination is the closest unfinished point: done
    done.add(current);

    // 2. See if going through it gives a shorter way to any neighbor.
    for (const { id, cost } of neighbors.get(current)!) {
      const throughCurrent = best.get(current)! + cost;
      if (throughCurrent < (best.get(id) ?? Infinity)) {
        best.set(id, throughCurrent);
        cameFrom.set(id, current);
      }
    }
  }

  // 3. Walk backwards from the destination to rebuild the path.
  const path = [endId];
  while (path[0] !== startId) path.unshift(cameFrom.get(path[0])!);
  return { nodes: path.map((id) => byId.get(id)!), cost: best.get(endId)! };
}
