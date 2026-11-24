// Tests for "I'm lost". Every expected answer is worked out by hand on a small made-up map (drawn below)
// BEFORE running the code.
import { describe, expect, test } from '@jest/globals';
import { MAX_NEARBY, nearbyPlaces, reroute } from './lost';
import { directions, Step } from './directions';
import { findRoute } from './routing';
import { gdcGraph } from './data/gdc';
import { MapGraph, MapNode, NodeKind, Route } from './types';

const node = (id: string, kind: NodeKind, x: number, y: number, floor = 'F'): MapNode => ({ id, kind, floor, x, y });
const stepOf = (from: number, to: number, floor = 'F'): Step => ({ arrow: 'straight', text: '', floor, from, to });

describe('nearbyPlaces', () => {
  // The route runs along y = 0:  R0 (0,0) ---- H1 (100,0) ---- H2 (200,0) ---- R9 (300,0)
  // The current step covers R0 .. H2 (route points 0 to 2), so the walk is the line from x = 0 to x = 200.
  const R0 = node('R0', 'room', 0, 0), H1 = node('H1', 'hall', 100, 0), H2 = node('H2', 'hall', 200, 0), R9 = node('R9', 'room', 300, 0);
  const route: Route = { nodes: [R0, H1, H2, R9], cost: 300 };
  // Distances to that line (the closest point is on it, or the end point 200,0 for places beyond it):
  const C1 = node('C1', 'room', 50, 30);          //  30: straight up from (50,0)
  const C2 = node('C2', 'stairs', 150, -90);      //  90: straight down from (150,0)
  const C3 = node('C3', 'elevator', 250, 40);     //  past the end: to (200,0) = sqrt(50*50 + 40*40) = sqrt(4100) = 64.03
  const C4 = node('C4', 'entrance', 100, 150);    // 150: exactly at the limit, so it counts
  const C5 = node('C5', 'room', 100, 151);        // 151: just too far
  const junk = [
    node('HALL', 'hall', 50, 10),                  // hallway points are never offered
    node('OUT', 'outdoor', 60, 10),                // neither are outdoor spots
    node('OTHER', 'room', 50, 10, 'G'),            // a room on another floor
  ];
  // R0 is on the line (0). R9 (300,0) is 100 from the end point (200,0).
  const graph: MapGraph = { floors: [], nodes: [R0, H1, H2, R9, C1, C2, C3, C4, C5, ...junk], edges: [] };

  test('rooms, stairs, elevators, entrances within 150 px, closest first; far ones, halls, outdoor and other floors left out', () => {
    // Closest first: R0 0, C1 30, C3 64.03, C2 90, R9 100, C4 150. (C5 151, HALL, OUT, OTHER are out.)
    expect(nearbyPlaces(graph, route, stepOf(0, 2)).map((n) => n.id)).toEqual(['R0', 'C1', 'C3', 'C2', 'R9', 'C4']);
  });

  test('at most 6: with a 7th place at 140, the farthest one (150) drops off', () => {
    const C10 = node('C10', 'room', 100, 140);
    const more = { ...graph, nodes: [...graph.nodes, C10] };
    // R0 0, C1 30, C3 64.03, C2 90, R9 100, C10 140 | C4 150 is the 7th
    expect(MAX_NEARBY).toBe(6);
    expect(nearbyPlaces(more, route, stepOf(0, 2)).map((n) => n.id)).toEqual(['R0', 'C1', 'C3', 'C2', 'R9', 'C10']);
  });

  test('a later step is judged on its own part of the route (only x = 200..300 now)', () => {
    // walk = H2 (200,0) -> R9 (300,0). C1 (50,30) is 150.8 away from (200,0): sqrt(150*150+30*30) = 152.97 -> out.
    // C3 (250,40) is 40 from the line -> in. C2 (150,-90): to (200,0) = sqrt(2500+8100) = 102.96 -> in.
    // R0 (0,0) is 200 away -> out. C4 (100,150): to (200,0) = sqrt(10000+22500) = 180.3 -> out. R9 itself: 0.
    expect(nearbyPlaces(graph, route, stepOf(2, 3)).map((n) => n.id)).toEqual(['R9', 'C3', 'C2']);
  });

  test('equal distances are ordered by id', () => {
    const A = node('A', 'room', 20, 10), B = node('B', 'room', 20, -10); // both 10 from the line
    const g = { ...graph, nodes: [R0, H1, H2, B, A] };
    // R0 is 0 away; A and B are both 10: "A" comes before "B".
    expect(nearbyPlaces(g, route, stepOf(0, 2)).map((n) => n.id)).toEqual(['R0', 'A', 'B']);
  });

  test('a step between floors is judged on the floor it starts on, from the stairs themselves', () => {
    // Floor F: S1 (50,0); floor G: S2 (50,0). The step covers route points 0..1 = S1 -> S2.
    const S1 = node('S1', 'stairs', 50, 0, 'F'), S2 = node('S2', 'stairs', 50, 0, 'G');
    const X = node('X', 'room', 50, 100, 'F');   // 100 from S1: in
    const Y = node('Y', 'room', 50, 20, 'G');    // right by S2 but on the other floor: out
    const g: MapGraph = { floors: [], nodes: [S1, S2, X, Y], edges: [] };
    const r: Route = { nodes: [S1, S2], cost: 150 };
    expect(nearbyPlaces(g, r, stepOf(0, 1, 'F')).map((n) => n.id)).toEqual(['S1', 'X']);
  });

  test('a step with no points on its floor gives nothing', () => {
    expect(nearbyPlaces(graph, route, stepOf(0, 2, 'Z'))).toEqual([]);
  });

  test('real map: for a real route, every step gives at most 6 places, all on that step\'s floor, none a hallway point', () => {
    const real = findRoute(gdcGraph, 'GDC-1.304', 'GDC-3.304')!;
    const steps = directions(real);
    steps.forEach((step) => {
      const found = nearbyPlaces(gdcGraph, real, step);
      expect(found.length).toBeLessThanOrEqual(6);
      found.forEach((n) => {
        expect(n.floor).toBe(step.floor);
        expect(n.kind).not.toBe('hall');
      });
    });
    expect(nearbyPlaces(gdcGraph, real, steps[0]).length).toBeGreaterThan(0); // there is always something near the start
  });
});

describe('reroute', () => {
  // Two floors. Floor F1: P (0,0), stairs S1 (100,0), elevator E1 (0,100). Floor F2: S2 (100,0), E2 (0,100),
  // and the destination D (100,100). Hallways: P-S1 100, P-E1 100, S2-D 100, E2-D 100.
  // Between floors (given): stairs S1-S2 cost 150, elevator E1-E2 cost 250. Z is joined to nothing.
  const g: MapGraph = {
    floors: [],
    nodes: [
      node('P', 'room', 0, 0, 'F1'), node('S1', 'stairs', 100, 0, 'F1'), node('E1', 'elevator', 0, 100, 'F1'),
      node('S2', 'stairs', 100, 0, 'F2'), node('E2', 'elevator', 0, 100, 'F2'), node('D', 'room', 100, 100, 'F2'),
      node('Z', 'room', 500, 500, 'F1'), node('Q', 'room', 0, 200, 'F1'),
    ],
    edges: [
      { from: 'P', to: 'S1' }, { from: 'P', to: 'E1' }, { from: 'S2', to: 'D' }, { from: 'E2', to: 'D' },
      { from: 'S1', to: 'S2', cost: 150 }, { from: 'E1', to: 'E2', cost: 250 }, { from: 'Q', to: 'E1' },
    ],
  };
  // The route you were walking: it ends at D (the destination). Its other points don't matter here.
  const walking: Route = { nodes: [g.nodes[1], g.nodes[3], g.nodes[5]], cost: 0 };

  test('new route from the picked place to the same destination (stairs: 100 + 150 + 100 = 350)', () => {
    const r = reroute(g, walking, 'P', false);
    expect(r.kind).toBe('route');
    if (r.kind === 'route') {
      expect(r.route.nodes.map((n) => n.id)).toEqual(['P', 'S1', 'S2', 'D']);
      expect(r.route.cost).toBe(350);
    }
  });

  test('Elevator only is kept: 100 + 250 + 100 = 450, through E1 and E2', () => {
    const r = reroute(g, walking, 'P', true);
    expect(r.kind).toBe('route');
    if (r.kind === 'route') {
      expect(r.route.nodes.map((n) => n.id)).toEqual(['P', 'E1', 'E2', 'D']);
      expect(r.route.cost).toBe(450);
    }
  });

  test('picking the destination itself means you have arrived', () => {
    expect(reroute(g, walking, 'D', false)).toEqual({ kind: 'arrived' });
  });

  test('no way there, or an unknown place: none', () => {
    expect(reroute(g, walking, 'Z', false)).toEqual({ kind: 'none' });
    expect(reroute(g, walking, 'nope', false)).toEqual({ kind: 'none' });
  });

  test('elevator only with no elevator way: none (Q hangs off E1, the only way up is the elevator, so use stairs-only graph)', () => {
    // Remove the elevator link: only stairs go up, so with Elevator only there is no route (and with stairs there is).
    const noLift: MapGraph = { ...g, edges: g.edges.filter((e) => e.from !== 'E1' || e.to !== 'E2') };
    expect(reroute(noLift, walking, 'P', true)).toEqual({ kind: 'none' });
    expect(reroute(noLift, walking, 'P', false).kind).toBe('route');
  });

  test('an empty route has no destination: none', () => {
    expect(reroute(g, { nodes: [], cost: 0 }, 'P', false)).toEqual({ kind: 'none' });
  });
});
