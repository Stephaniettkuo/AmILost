// Shared map types: the "contract" between map data/routing and the screens.
// Change this file together, not alone.

// What a point on the map is.
export type NodeKind = 'room' | 'hall' | 'stairs' | 'elevator' | 'entrance';

// One point on one floor.
export type MapNode = {
  id: string;     // unique, e.g. "GDC-3.106" or "GDC-3-hall-A"
  kind: NodeKind;
  floor: string;  // which Floor it's on, e.g. "GDC-3"
  x: number;      // position in pixels on that floor's plan image
  y: number;
  label?: string; // what users see, e.g. "GDC 3.106" (rooms only)
};

// A walkable connection. Edges go both ways.
export type MapEdge = {
  from: string; // MapNode id
  to: string;   // MapNode id
  cost?: number; // if missing, use the straight-line distance between the two nodes.
                 // Required for stairs/elevator edges between floors.
};

// One floor plan.
export type Floor = {
  id: string;     // e.g. "GDC-3"
  name: string;   // e.g. "GDC Floor 3"
  width: number;  // plan image size in pixels, so x/y line up with the image
  height: number;
};

// Everything the app knows about the map.
export type MapGraph = {
  floors: Floor[];
  nodes: MapNode[];
  edges: MapEdge[];
};

// What routing returns: nodes in order from start to end, plus total cost.
// findRoute(graph, startId, endId) returns a Route, or null if there's no path.
export type Route = {
  nodes: MapNode[];
  cost: number;
};
