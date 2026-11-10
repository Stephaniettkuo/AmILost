// Writes a graph back out as the text of src/data/gdc.ts, so edits made
// in the app can be pasted over the file.
import { MapGraph, MapNode } from '../types';

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function nodeToLine(n: MapNode): string {
  const label = n.label ? `, label: ${q(n.label)}` : '';
  return `    { id: ${q(n.id)}, kind: ${q(n.kind)}, floor: ${q(n.floor)}, x: ${n.x}, y: ${n.y}${label} },`;
}

export function graphToFile(g: MapGraph, needsCheck: string[]): string {
  const ids = new Set(g.nodes.map((n) => n.id));
  return [
    '// GDC map data: points (nodes) and walkable connections (edges).',
    '//',
    '// Floor 2 started as an AGENT DRAFT (Claude, 2026-11-10) and is being',
    '// reviewed with the in-app editor. Review notes are in NOTES.md.',
    '// Points listed in `needsCheck` are guesses the agent was least sure of.',
    "import { MapGraph } from '../types';",
    "import { gdcFloors } from './floors';",
    '',
    'export const gdcGraph: MapGraph = {',
    '  floors: gdcFloors,',
    '  nodes: [',
    ...g.nodes.map(nodeToLine),
    '  ],',
    '  edges: [',
    ...g.edges.map((e) =>
      `    { from: ${q(e.from)}, to: ${q(e.to)}${e.cost !== undefined ? `, cost: ${e.cost}` : ''} },`),
    '  ],',
    '};',
    '',
    '// Agent guesses to check first (door position or connection uncertain).',
    'export const needsCheck: string[] = [',
    ...needsCheck.filter((id) => ids.has(id)).map((id) => `  ${q(id)},`),
    '];',
    '',
  ].join('\n');
}
