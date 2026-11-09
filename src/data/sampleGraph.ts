// A tiny made-up floor so the screens can be built before real data exists.
// Not a real building.
import { MapGraph, Route } from '../types';

export const sampleGraph: MapGraph = {
  floors: [{ id: 'DEMO-1', name: 'Demo Floor 1', width: 400, height: 300 }],
  nodes: [
    { id: 'DEMO-entrance', kind: 'entrance', floor: 'DEMO-1', x: 20, y: 150, label: 'Entrance' },
    { id: 'DEMO-hall-A', kind: 'hall', floor: 'DEMO-1', x: 200, y: 150 },
    { id: 'DEMO-hall-B', kind: 'hall', floor: 'DEMO-1', x: 200, y: 50 },
    { id: 'DEMO-1.101', kind: 'room', floor: 'DEMO-1', x: 350, y: 150, label: 'DEMO 1.101' },
    { id: 'DEMO-1.102', kind: 'room', floor: 'DEMO-1', x: 350, y: 50, label: 'DEMO 1.102' },
  ],
  edges: [
    { from: 'DEMO-entrance', to: 'DEMO-hall-A' },
    { from: 'DEMO-hall-A', to: 'DEMO-hall-B' },
    { from: 'DEMO-hall-A', to: 'DEMO-1.101' },
    { from: 'DEMO-hall-B', to: 'DEMO-1.102' },
  ],
};

// A hand-written route (entrance -> 1.102) for drawing before findRoute exists.
const byId = (id: string) => sampleGraph.nodes.find((n) => n.id === id)!;
export const sampleRoute: Route = {
  nodes: ['DEMO-entrance', 'DEMO-hall-A', 'DEMO-hall-B', 'DEMO-1.102'].map(byId),
  cost: 180 + 100 + 150, // straight-line lengths of the three segments
};
