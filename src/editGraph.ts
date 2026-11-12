// Map editing used by the in-app editor. Pure functions: each takes a graph
// and returns a new one, so they're easy to test.
import { MapEdge, MapGraph, MapNode, NodeKind } from './types';

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
  return addEdge(detach(g, id), targetId, id);
}

// Add a line, unless it's already there.
export function addEdge(g: MapGraph, a: string, b: string): MapGraph {
  if (a === b || g.edges.some((e) => same(e, a, b))) return g;
  return { ...g, edges: [...g.edges, { from: a, to: b }] };
}

// Split a line with a new hallway point at the spot on the line closest to p:
// a - b becomes a - new - b. Returns the new graph and the new point's id
// (id is null if the line isn't in the graph; if p is on top of an end point,
// nothing is split and that end point's id is returned).
export function splitEdgeAt(
  g: MapGraph, edge: MapEdge, p: Point,
): { graph: MapGraph; id: string | null } {
  const a = g.nodes.find((n) => n.id === edge.from);
  const b = g.nodes.find((n) => n.id === edge.to);
  if (!a || !b || !g.edges.some((e) => same(e, edge.from, edge.to))) return { graph: g, id: null };
  const c = closestOnSegment(p, a, b);
  const end = [a, b].find((n) => dist(n, c) < 1);
  if (end) return { graph: g, id: end.id };
  const node: MapNode = { id: nextHallId(g, a.floor), kind: 'hall', floor: a.floor, x: c.x, y: c.y };
  const out = removeEdge(addNode(g, node), edge);
  return { graph: { ...out, edges: [...out.edges, { from: a.id, to: node.id }, { from: node.id, to: b.id }] }, id: node.id };
}

export function addNode(g: MapGraph, node: MapNode): MapGraph {
  return { ...g, nodes: [...g.nodes, node] };
}

// Delete a node. Like detach: if it sat between two neighbors, they get joined.
export function removeNode(g: MapGraph, id: string): MapGraph {
  const out = detach(g, id);
  return { ...out, nodes: out.nodes.filter((n) => n.id !== id) };
}

// Remove one line (if a line was listed twice by mistake, one copy stays).
export function removeEdge(g: MapGraph, edge: MapEdge): MapGraph {
  const i = g.edges.findIndex((e) => same(e, edge.from, edge.to));
  return i < 0 ? g : { ...g, edges: [...g.edges.slice(0, i), ...g.edges.slice(i + 1)] };
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
  if (end) return addEdge(out, end.id, id);
  const junction: MapNode = { id: nextHallId(out, node.floor), kind: 'hall', floor: node.floor, x: c.x, y: c.y };
  out = addNode(out, junction);
  out = removeEdge(out, edge);
  return {
    ...out,
    edges: [...out.edges, { from: edge.from, to: junction.id }, { from: junction.id, to: edge.to },
      { from: junction.id, to: id }],
  };
}

// Our id formats: rooms/stairs/elevators use the plan number (GDC-2.702, GDC-2.1S1),
// hallway points get letters (GDC-2-hall-B), entrances/outdoor spots use their name.
export const idPattern = /^GDC-\d(\.[0-9A-Z]+|-hall-[A-Z]+|-(entrance|outdoor)-[a-z0-9-]+)$/;

// "North Patio!" -> "north-patio"
export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// A good id for a node of this kind (used when its category changes).
export function suggestId(
  g: MapGraph, floorId: string, kind: NodeKind, label: string, currentId: string,
): string {
  if (kind === 'hall') return currentId.includes('-hall-') ? currentId : nextHallId(g, floorId);
  if (kind === 'entrance' || kind === 'outdoor') {
    return label.trim() ? `${floorId}-${kind}-${slug(label)}` : ''; // needs a name
  }
  // room / stairs / elevator: keep a plan number if it already has one
  return /^GDC-\d\.[0-9A-Z]+$/.test(currentId) ? currentId : '';
}

// Does the id fit the category? (hall -> "-hall-", outdoor -> "-outdoor-",
// entrance -> "-entrance-", room/stairs/elevator -> a plan number.)
export function idMatchesKind(id: string, kind: NodeKind): boolean {
  if (kind === 'hall' || kind === 'entrance' || kind === 'outdoor') return id.includes(`-${kind}-`);
  return /^GDC-\d\.[0-9A-Z]+$/.test(id);
}

// Change a node's details. If the id changes, its lines are renamed too.
export function updateNode(g: MapGraph, id: string, changes: Partial<MapNode>): MapGraph {
  const newId = changes.id ?? id;
  const rename = (x: string) => (x === id ? newId : x);
  return {
    ...g,
    nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...changes, id: newId } : n)),
    edges: g.edges.map((e) => ({ ...e, from: rename(e.from), to: rename(e.to) })),
  };
}
