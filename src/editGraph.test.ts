import { expect, test } from '@jest/globals';
import {
  addEdge, splitEdgeAt, addNode, attachToEdge, idMatchesKind, idPattern, suggestId, updateNode, connectToNode, detach, nearestEdge, nextHallId, removeEdge, removeNode, snapToNetwork,
} from './editGraph';
import { MapGraph } from './types';

// A tiny map:   A ---- R ---- B        (R is a room on the A-B hallway)
//                              |
//                              C
const g: MapGraph = {
  floors: [{ id: 'F', name: 'F', width: 100, height: 100 }],
  nodes: [
    { id: 'A', kind: 'hall', floor: 'F', x: 0, y: 0 },
    { id: 'R', kind: 'room', floor: 'F', x: 50, y: 0 },
    { id: 'B', kind: 'hall', floor: 'F', x: 100, y: 0 },
    { id: 'C', kind: 'hall', floor: 'F', x: 100, y: 80 },
  ],
  edges: [{ from: 'A', to: 'R' }, { from: 'R', to: 'B' }, { from: 'B', to: 'C' }],
};
const pairs = (m: MapGraph) => m.edges.map((e) => [e.from, e.to].sort().join('-')).sort();

test('detach joins the two old neighbors so the hallway stays connected', () => {
  expect(pairs(detach(g, 'R'))).toEqual(['A-B', 'B-C']);
});

test('attachToEdge moves the room onto the other hallway and splits it', () => {
  const out = attachToEdge(g, 'R', { from: 'B', to: 'C' }, { x: 90, y: 40 });
  expect(pairs(out)).toEqual(['A-B', 'B-R', 'C-R']);
  expect(out.nodes.find((n) => n.id === 'R')).toMatchObject({ x: 100, y: 40 }); // snapped onto the line
});

test('connectToNode attaches the room straight to another point', () => {
  expect(pairs(connectToNode(g, 'R', 'C'))).toEqual(['A-B', 'B-C', 'C-R']);
});

test('nearestEdge finds the line under a tap and can skip the selected node', () => {
  expect(nearestEdge(g, 'F', { x: 98, y: 40 }, 10)).toMatchObject({ from: 'B', to: 'C' });
  expect(nearestEdge(g, 'F', { x: 25, y: 3 }, 10, 'R')).toBeNull(); // A-R touches R, so skipped
});

test('removeNode deletes the room and closes the hallway back up', () => {
  const out = removeNode(g, 'R');
  expect(out.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C']);
  expect(pairs(out)).toEqual(['A-B', 'B-C']);
});

test('removeEdge deletes just that line', () => {
  expect(pairs(removeEdge(g, { from: 'C', to: 'B' }))).toEqual(['A-R', 'B-R']);
});

test('nextHallId skips names already used', () => {
  const m: MapGraph = { ...g, nodes: [...g.nodes, { id: 'F-hall-A', kind: 'hall', floor: 'F', x: 0, y: 0 }] };
  expect(nextHallId(m, 'F')).toBe('F-hall-B');
});

// A room dragged off the hallway: detach it first (hallway straightens), then snap.
test('snap: dropped on a line, the room joins that line', () => {
  const out = snapToNetwork(detach(g, 'R'), 'R', { x: 100, y: 42 }, 6, 80);
  expect(pairs(out)).toEqual(['A-B', 'B-R', 'C-R']);
});

test('snap: dropped beside a line, a connector is added from a new hallway point', () => {
  const out = snapToNetwork(detach(g, 'R'), 'R', { x: 40, y: 20 }, 6, 80);
  const j = out.nodes.find((n) => n.id === 'F-hall-A')!;
  expect(j).toMatchObject({ kind: 'hall', x: 40, y: 0 });       // on A-B, right above the room
  expect(pairs(out)).toEqual(['A-F-hall-A', 'B-C', 'B-F-hall-A', 'F-hall-A-R']);
  expect(out.nodes.find((n) => n.id === 'R')).toMatchObject({ x: 40, y: 20 }); // room stays where dropped
});

test('snap: next to an existing point, connect to that point instead of adding one', () => {
  const out = snapToNetwork(detach(g, 'R'), 'R', { x: 3, y: 20 }, 6, 80);
  expect(out.nodes).toHaveLength(4);
  expect(pairs(out)).toEqual(['A-B', 'A-R', 'B-C']);
});

test('snap: nothing nearby, the point stays unconnected', () => {
  const lone = addNode(g, { id: 'Z', kind: 'room', floor: 'F', x: 0, y: 0 });
  const out = snapToNetwork(lone, 'Z', { x: 50, y: 99 }, 6, 10);
  expect(out.edges).toEqual(g.edges);
});

test('updateNode changes the category/name and renames the id in its lines', () => {
  const out = updateNode(g, 'B', { id: 'F-outdoor-patio', kind: 'outdoor', label: 'Patio' });
  expect(out.nodes.find((n) => n.id === 'F-outdoor-patio')).toMatchObject({ kind: 'outdoor', label: 'Patio' });
  expect(out.nodes.some((n) => n.id === 'B')).toBe(false);
  expect(pairs(out)).toEqual(['A-R', 'C-F-outdoor-patio', 'F-outdoor-patio-R']);
});

test('suggestId builds ids the same way as our naming format', () => {
  expect(suggestId(g, 'GDC-2', 'outdoor', 'North Patio!', 'GDC-2-hall-S')).toBe('GDC-2-outdoor-north-patio');
  expect(suggestId(g, 'GDC-2', 'room', 'Front office', 'GDC-2.702')).toBe('GDC-2.702');
  expect(suggestId(g, 'GDC-2', 'room', '', 'GDC-2-hall-S')).toBe(''); // needs a room number
  expect(idPattern.test('GDC-2-outdoor-north-patio')).toBe(true);
  expect(suggestId(g, 'GDC-2', 'outdoor', '', 'GDC-2-hall-S')).toBe(''); // needs a name
  expect(idPattern.test('GDC-2-patio')).toBe(false);
  expect(idMatchesKind('GDC-2-hall-S', 'outdoor')).toBe(false);
  expect(idMatchesKind('GDC-2-outdoor-patio', 'outdoor')).toBe(true);
});

test('connecting to a point that is already connected does not add a second line', () => {
  const once = connectToNode(g, 'R', 'C');
  expect(pairs(connectToNode(once, 'R', 'C'))).toEqual(pairs(once));
});

test('deleting a line that was listed twice leaves one copy', () => {
  const twice: MapGraph = { ...g, edges: [...g.edges, { from: 'C', to: 'B' }] };
  expect(pairs(removeEdge(twice, { from: 'B', to: 'C' }))).toEqual(['A-R', 'B-C', 'B-R']);
});

// Lines mode. Map: A(0,0) -- R(50,0) -- B(100,0), B -- C(100,80).
test('addEdge joins two points and keeps every other line', () => {
  // A and C aren't joined yet, so one new line appears; the 3 old ones stay.
  expect(pairs(addEdge(g, 'A', 'C'))).toEqual(['A-C', 'A-R', 'B-C', 'B-R']);
});

test('addEdge refuses a duplicate (either direction) and a line to itself', () => {
  expect(addEdge(g, 'C', 'B')).toBe(g);
  expect(addEdge(g, 'A', 'A')).toBe(g);
});

test('splitEdgeAt puts a new hallway point on the line where you tapped', () => {
  // Tap (97, 30) beside B(100,0)-C(100,80): the closest spot on that vertical line is (100, 30).
  // The new point is the first free hall id, F-hall-A, and B-C becomes B-new-C.
  const { graph, id } = splitEdgeAt(g, { from: 'B', to: 'C' }, { x: 97, y: 30 });
  expect(id).toBe('F-hall-A');
  expect(graph.nodes.find((n) => n.id === id)).toMatchObject({ kind: 'hall', floor: 'F', x: 100, y: 30 });
  expect(pairs(graph)).toEqual(['A-R', 'B-F-hall-A', 'B-R', 'C-F-hall-A']);
});

test('splitEdgeAt then addEdge connects one hallway to another', () => {
  // Split A-R at (20,5) -> (20,0); split B-C at (100,40); join the two new points.
  const one = splitEdgeAt(g, { from: 'A', to: 'R' }, { x: 20, y: 5 });
  const two = splitEdgeAt(one.graph, { from: 'B', to: 'C' }, { x: 100, y: 40 });
  expect(two.id).toBe('F-hall-B');
  expect(pairs(addEdge(two.graph, one.id!, two.id!))).toEqual(
    ['A-F-hall-A', 'B-F-hall-B', 'B-R', 'C-F-hall-B', 'F-hall-A-F-hall-B', 'F-hall-A-R'],
  );
});

test('splitEdgeAt does nothing for a missing line or a tap on an end point', () => {
  expect(splitEdgeAt(g, { from: 'A', to: 'C' }, { x: 5, y: 5 })).toEqual({ graph: g, id: null });
  expect(splitEdgeAt(g, { from: 'B', to: 'C' }, { x: 100, y: -9 })).toEqual({ graph: g, id: 'B' });
});
