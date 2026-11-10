// Data checks: catch tracing mistakes before they become wrong routes.
import { expect, test } from '@jest/globals';
import { gdcGraph, needsCheck } from './gdc';
import { idMatchesKind, idPattern } from '../editGraph';

const ids = gdcGraph.nodes.map((n) => n.id);
const byId = new Map(gdcGraph.nodes.map((n) => [n.id, n]));

test('node ids are unique', () => {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  expect(dupes).toEqual([]);
});

test('every edge connects two existing nodes', () => {
  const broken = gdcGraph.edges.filter((e) => !byId.has(e.from) || !byId.has(e.to));
  expect(broken).toEqual([]);
});

test('no line is listed twice', () => {
  const keys = gdcGraph.edges.map((e) => [e.from, e.to].sort().join(' – '));
  expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
});

test('every node sits on a known floor, inside its image', () => {
  const floors = new Map(gdcGraph.floors.map((f) => [f.id, f]));
  const bad = gdcGraph.nodes.filter((n) => {
    const f = floors.get(n.floor);
    return !f || n.x < 0 || n.y < 0 || n.x > f.width || n.y > f.height;
  });
  expect(bad.map((n) => n.id)).toEqual([]);
});

test('edges between floors have a cost; edges on one floor do not need one', () => {
  const missing = gdcGraph.edges.filter(
    (e) => byId.get(e.from)?.floor !== byId.get(e.to)?.floor && e.cost === undefined,
  );
  expect(missing).toEqual([]);
});

test('ids follow our naming format', () => {
  expect(ids.filter((id) => !idPattern.test(id))).toEqual([]);
});

test("each id fits its category (a patio isn't named hall-…)", () => {
  expect(gdcGraph.nodes.filter((n) => !idMatchesKind(n.id, n.kind)).map((n) => n.id)).toEqual([]);
});

test('every room can be reached from every other point (no islands)', () => {
  const neighbors = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of gdcGraph.edges) {
    neighbors.get(e.from)?.push(e.to);
    neighbors.get(e.to)?.push(e.from);
  }
  // Walk outward from one point and see what we can reach.
  const seen = new Set([ids[0]]);
  const queue = [ids[0]];
  while (queue.length) {
    for (const next of neighbors.get(queue.shift()!)!) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  expect(ids.filter((id) => !seen.has(id))).toEqual([]);
});

test('needsCheck only lists real nodes', () => {
  expect(needsCheck.filter((id) => !byId.has(id))).toEqual([]);
});
