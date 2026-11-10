import { expect, test } from '@jest/globals';
import { graphToFile, nodeToLine } from './exportGraph';
import { gdcGraph, needsCheck } from './gdc';

test('apostrophes in labels are escaped', () => {
  const line = nodeToLine({ id: 'X', kind: 'room', floor: 'F', x: 1, y: 2, label: "Men's" });
  expect(line).toBe("    { id: 'X', kind: 'room', floor: 'F', x: 1, y: 2, label: 'Men\\'s' },");
});

test('exported file keeps every node and edge', () => {
  const text = graphToFile(gdcGraph, needsCheck);
  for (const n of gdcGraph.nodes) expect(text).toContain(nodeToLine(n));
  expect(text.match(/from: /g)?.length).toBe(gdcGraph.edges.length);
});
