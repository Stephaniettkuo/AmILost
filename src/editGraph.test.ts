import { expect, test } from '@jest/globals';
import {
  addNode, attachToEdge, connectToNode, detach, nearestEdge, nextHallId, removeEdge, removeNode, snapToNetwork,
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
