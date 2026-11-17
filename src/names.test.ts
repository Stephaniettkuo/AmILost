import { expect, test } from '@jest/globals';
import { floorLabel, placeName, searchPlaces, searchText } from './names';

test('names people see', () => {
  const base = { kind: 'room' as const, floor: 'GDC-2', x: 0, y: 0 };
  expect(placeName({ ...base, id: 'GDC-2.316' })).toBe('2.316');
  expect(placeName({ ...base, id: 'GDC-2.702', label: 'Front office' })).toBe('2.702 · Front office');
  expect(placeName({ ...base, id: 'GDC-2.1S1', kind: 'stairs', label: 'Stairs 2.1S1' })).toBe('Stairs 2.1S1');
  expect(placeName({ ...base, id: 'GDC-2-entrance-main', kind: 'entrance', label: 'Main entrance' })).toBe('Main entrance');
});

test('search matches number, name, and other names', () => {
  const n = { id: 'GDC-2.702', kind: 'room' as const, floor: 'GDC-2', x: 0, y: 0, label: 'Front office', aliases: ['Advising'] };
  for (const q of ['702', '2.702', 'front', 'advising']) expect(searchText(n)).toContain(q);
});

test('searchPlaces skips hallway points, ignores case and spaces, and respects the limit', () => {
  const base = { floor: 'GDC-2', x: 0, y: 0 };
  const nodes = [
    { ...base, id: 'GDC-2-hall-A', kind: 'hall' as const },
    { ...base, id: 'GDC-2.702', kind: 'room' as const, label: 'Front office' },
    { ...base, id: 'GDC-2.704', kind: 'room' as const },
    { ...base, id: 'GDC-2.706', kind: 'room' as const },
  ];
  // "hall" matches the hallway point's kind text, but hall points are never offered.
  expect(searchPlaces(nodes, 'hall')).toEqual([]);
  expect(searchPlaces(nodes, '  FRONT ').map((n) => n.id)).toEqual(['GDC-2.702']);
  expect(searchPlaces(nodes, '2.70', 2).map((n) => n.id)).toEqual(['GDC-2.702', 'GDC-2.704']);
  expect(searchPlaces(nodes, '')).toEqual([]);
  expect(floorLabel('GDC-3')).toBe('Floor 3');
});
