// Route tests. Expected answers were worked out by hand from the floor plan
// (assets/gdc-2.png) and the map data BEFORE running findRoute, so these
// check the code instead of copying its output.
import { describe, expect, test } from '@jest/globals';
import { findRoute } from './routing';
import { gdcGraph } from './data/gdc';
import { MapGraph } from './types';

const ids = (r: ReturnType<typeof findRoute>) => r?.nodes.map((n) => n.id.replace('GDC-2', '')) ?? null;

describe('small made-up maps (answers obvious by looking)', () => {
  //   S ---10--- A ---10--- E        S to E: through A = 20, the direct line = 25
  //    \_________25________/
  const tri: MapGraph = {
    floors: [{ id: 'F', name: 'F', width: 100, height: 100 }],
    nodes: [
      { id: 'S', kind: 'hall', floor: 'F', x: 0, y: 0 },
      { id: 'A', kind: 'hall', floor: 'F', x: 10, y: 0 },
      { id: 'E', kind: 'hall', floor: 'F', x: 20, y: 0 },
      { id: 'Z', kind: 'room', floor: 'F', x: 50, y: 50 }, // connected to nothing
    ],
    edges: [{ from: 'S', to: 'A' }, { from: 'A', to: 'E' }, { from: 'S', to: 'E', cost: 25 }],
  };

  test('takes the shorter total distance, even with more stops', () => {
    const r = findRoute(tri, 'S', 'E');
    expect(r?.nodes.map((n) => n.id)).toEqual(['S', 'A', 'E']);
    expect(r?.cost).toBe(20);
  });

  test('when the long-way-round is the only option, takes it', () => {
    const r = findRoute({ ...tri, edges: [{ from: 'S', to: 'E', cost: 25 }] }, 'S', 'E');
    expect(r?.cost).toBe(25);
  });

  test('start = destination is a route of one point', () => {
    expect(findRoute(tri, 'A', 'A')).toEqual({ nodes: [tri.nodes[1]], cost: 0 });
  });

  test('no way there -> null', () => {
    expect(findRoute(tri, 'S', 'Z')).toBeNull();
  });

  test('unknown point -> null', () => {
    expect(findRoute(tri, 'S', 'nope')).toBeNull();
  });
});

describe('GDC floor 2 (checked against the floor plan)', () => {
  test('main entrance -> 2.702 front office: down through the atrium', () => {
    // Only sensible way: in the main doors, diagonally across the atrium past 2.100, to 2.702's door.
    expect(ids(findRoute(gdcGraph, 'GDC-2-entrance-main', 'GDC-2.702'))).toEqual(
      ['-entrance-main', '-hall-Q', '-hall-AB', '-hall-T', '.702'],
    );
  });

  test('main entrance -> 2.316: up the main hallway, not around the NW wing', () => {
    // Two ways into the NW wing's north hallway from the main hallway (hall-G):
    //   up past the restrooms to hall-D, then west:  ~119 + 35 + 190 = ~344 px
    //   west along the south hallway, up, then east: ~35 + 283 + 112 + 93 = ~523 px
    expect(ids(findRoute(gdcGraph, 'GDC-2-entrance-main', 'GDC-2.316'))).toEqual([
      '-entrance-main', '-hall-Q', '-hall-M', '-hall-AC', '-hall-N', '-hall-G',
      '.204', '.202', '-hall-D', '-hall-C', '.326', '.324', '.322', '.320', '.318', '.316',
    ]);
  });

  test('2.402 -> 2.504: along the bottom hallway, then up the 2.500 hallway (cost by hand)', () => {
    const r = findRoute(gdcGraph, 'GDC-2.402', 'GDC-2.504');
    expect(ids(r)).toEqual(['.402', '-hall-K', '-hall-AD', '-hall-L', '.5S3', '.502', '.506', '.504']);
    // straight segments: 81 + 30 + 157 + 54 + 23 + 35 + 12 = 392 px
    expect(r?.cost).toBeCloseTo(392);
  });

  test("men's restroom 2.202 -> 2.816: around stairwell 2.1S1, down past 2.6E1, east", () => {
    expect(ids(findRoute(gdcGraph, 'GDC-2.202', 'GDC-2.816'))).toEqual([
      '.202', '.204', '-hall-G', '-hall-N', '-hall-AC', '-hall-M', '-hall-Q', '-hall-AB', '-hall-T',
      '-hall-U', '.6E1', '-hall-X', '-hall-AA',
      '.802', '.804', '.806', '.808', '.810', '.812', '.814', '.816',
    ]);
  });

  test('a route and its reverse are the same length', () => {
    const there = findRoute(gdcGraph, 'GDC-2.316', 'GDC-2.822')!;
    const back = findRoute(gdcGraph, 'GDC-2.822', 'GDC-2.316')!;
    expect(back.cost).toBeCloseTo(there.cost);
  });
});

describe('between floors', () => {
  const floors = (r: ReturnType<typeof findRoute>) =>
    r ? r.nodes.map((n) => n.floor).filter((f, i, all) => f !== all[i - 1]) : null;
  // Any step between floors that uses stairs?
  const usesStairs = (r: ReturnType<typeof findRoute>) =>
    !!r && r.nodes.some((n, i) => i > 0 && n.floor !== r.nodes[i - 1].floor && n.kind === 'stairs');

  test('2.316 -> 3.304: up the NW stairs (2.3S2 -> 3.3S2), right next to both rooms', () => {
    const r = findRoute(gdcGraph, 'GDC-2.316', 'GDC-3.304');
    expect(floors(r)).toEqual(['GDC-2', 'GDC-3']);
    const ids = r!.nodes.map((n) => n.id);
    expect(ids[ids.indexOf('GDC-2.3S2') + 1]).toBe('GDC-3.3S2');
  });

  test('same trip, elevator only: no stairs between floors, takes an elevator instead', () => {
    const r = findRoute(gdcGraph, 'GDC-2.316', 'GDC-3.304', { avoidStairs: true });
    expect(floors(r)).toEqual(['GDC-2', 'GDC-3']);
    expect(usesStairs(r)).toBe(false);
    expect(r!.nodes.some((n) => n.kind === 'elevator')).toBe(true);
  });

  test('1.304 lecture hall -> 2.702: elevator 1.2E2 -> 2.2E2 beats the NW stairs', () => {
    // Worked out by hand (px; stairs = 150, elevator = 250):
    //   via stairs 1.3S2 -> 2.3S2:   ~181 + 150 + ~1020 (around the NW wing, then the atrium) = ~1351
    //   via elevator 1.2E2 -> 2.2E2: ~344 + 250 + ~623 (main hallway, then the atrium)        = ~1217
    const ids = findRoute(gdcGraph, 'GDC-1.304', 'GDC-2.702')!.nodes.map((n) => n.id);
    expect(ids[ids.indexOf('GDC-1.2E2') + 1]).toBe('GDC-2.2E2');
  });

  test("floor 1's north and south blocks only connect through floor 2", () => {
    const r = findRoute(gdcGraph, 'GDC-1.702', 'GDC-1.304');
    expect(floors(r)).toEqual(['GDC-1', 'GDC-2', 'GDC-1']);
  });

  test('elevator-only never takes stairs, for every start/end pair of stairwells', () => {
    const stairs = gdcGraph.nodes.filter((n) => n.kind === 'stairs').map((n) => n.id);
    for (const a of stairs) for (const b of stairs) {
      expect(usesStairs(findRoute(gdcGraph, a, b, { avoidStairs: true }))).toBe(false);
    }
  });
});
