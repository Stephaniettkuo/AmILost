// Map editing used by the in-app editor. Pure functions: each takes a graph
// and returns a new one, so they're easy to test.
import { MapEdge, MapGraph, MapNode } from './types';

export type Point = { x: number; y: number };

const touches = (e: MapEdge, id: string) => e.from === id || e.to === id;
const same = (e: MapEdge, a: string, b: string) =>
  (e.from === a && e.to === b) || (e.from === b && e.to === a);

// The point on segment a-b closest to p.
function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: Math.round(a.x + t * dx), y: Math.round(a.y + t * dy) };
}

const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);

// Nearest node on this floor within `reach` of p (or null).
export function nearestNode(g: MapGraph, floorId: string, p: Point, reach: number): MapNode | null {
  let best: MapNode | null = null;
  for (const n of g.nodes) {
    if (n.floor === floorId && dist(n, p) < (best ? dist(best, p) : reach)) best = n;
  }
  return best;
}

// Nearest edge on this floor within `reach` of p, ignoring edges touching `skipId`.
export function nearestEdge(
  g: MapGraph, floorId: string, p: Point, reach: number, skipId?: string,
): MapEdge | null {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  let best: MapEdge | null = null;
  let bestDist = reach;
  for (const e of g.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || a.floor !== floorId || b.floor !== floorId) continue;
    if (skipId && touches(e, skipId)) continue;
    const d = dist(p, closestOnSegment(p, a, b));
    if (d < bestDist) { best = e; bestDist = d; }
  }
  return best;
}

export function moveNode(g: MapGraph, id: string, p: Point): MapGraph {
  return { ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, x: p.x, y: p.y } : n)) };
}

// Take a node off its current line. If it sat between exactly two
// neighbors (a - node - b), join them (a - b) so the hallway stays connected.
export function detach(g: MapGraph, id: string): MapGraph {
  const neighbors = g.edges.filter((e) => touches(e, id)).map((e) => (e.from === id ? e.to : e.from));
  let edges = g.edges.filter((e) => !touches(e, id));
  const [a, b] = neighbors;
  if (neighbors.length === 2 && !edges.some((e) => same(e, a, b))) edges = [...edges, { from: a, to: b }];
  return { ...g, edges };
}

// Move a node onto edge a-b: detach it, place it on the line near p,
// and split the line into a - node - b.
export function attachToEdge(g: MapGraph, id: string, edge: MapEdge, p: Point): MapGraph {
  let out = detach(g, id);
  const byId = new Map(out.nodes.map((n) => [n.id, n]));
  const a = byId.get(edge.from)!, b = byId.get(edge.to)!;
  out = moveNode(out, id, closestOnSegment(p, a, b));
  const edges = out.edges.filter((e) => !same(e, edge.from, edge.to));
  return { ...out, edges: [...edges, { from: edge.from, to: id }, { from: id, to: edge.to }] };
}

// Detach a node and connect it straight to another node instead.
export function connectToNode(g: MapGraph, id: string, targetId: string): MapGraph {
  const out = detach(g, id);
  return { ...out, edges: [...out.edges, { from: targetId, to: id }] };
}

export function addNode(g: MapGraph, node: MapNode): MapGraph {
  return { ...g, nodes: [...g.nodes, node] };
}

// Delete a node. Like detach: if it sat between two neighbors, they get joined.
export function removeNode(g: MapGraph, id: string): MapGraph {
  const out = detach(g, id);
  return { ...out, nodes: out.nodes.filter((n) => n.id !== id) };
}

export function removeEdge(g: MapGraph, edge: MapEdge): MapGraph {
  return { ...g, edges: g.edges.filter((e) => !same(e, edge.from, edge.to)) };
}

// Next unused hallway id on a floor: GDC-2-hall-A, ..., Z, AA, AB, ...
export function nextHallId(g: MapGraph, floorId: string): string {
  const used = new Set(g.nodes.map((n) => n.id));
  for (let i = 0; ; i++) {
    const name = i < 26 ? String.fromCharCode(65 + i)
      : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26));
    const id = `${floorId}-hall-${name}`;
    if (!used.has(id)) return id;
  }
}

// Connect a loose node (no edges) at p to the nearest hallway line:
// - dropped ON a line (within `onLine`): it becomes part of that line;
// - dropped near a line (within `near`): a short connector is added from the
//   closest point on the line (an existing point if one is right there,
//   otherwise a new hallway point that splits the line);
// - nothing near: it stays unconnected.
export function snapToNetwork(
  g: MapGraph, id: string, p: Point, onLine: number, near: number,
): MapGraph {
  const node = g.nodes.find((n) => n.id === id)!;
  let out = moveNode(g, id, p);
  const edge = nearestEdge(out, node.floor, p, near, id);
  if (!edge) return out;
  const byId = new Map(out.nodes.map((n) => [n.id, n]));
  const a = byId.get(edge.from)!, b = byId.get(edge.to)!;
  const c = closestOnSegment(p, a, b);
  if (dist(p, c) <= onLine) return attachToEdge(out, id, edge, p);
  const end = [a, b].find((n) => dist(n, c) <= 8);
  if (end) return { ...out, edges: [...out.edges, { from: end.id, to: id }] };
  const junction: MapNode = { id: nextHallId(out, node.floor), kind: 'hall', floor: node.floor, x: c.x, y: c.y };
  out = addNode(out, junction);
  out = removeEdge(out, edge);
  return {
    ...out,
    edges: [...out.edges, { from: edge.from, to: junction.id }, { from: junction.id, to: edge.to },
      { from: junction.id, to: id }],
  };
}
