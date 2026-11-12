import { expect, test } from '@jest/globals';
import { placeName, searchText } from './names';

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
