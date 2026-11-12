// How points are named for people (search results, map labels, directions).
import { MapNode } from './types';

// "GDC-2.316" -> "2.316", "GDC-2-hall-B" -> "hall-B"
export function shortId(id: string): string {
  return id.replace(/^GDC-(\d+-)?/, '');
}

// "2.316", "Main entrance", "Stairs 2.1S1", "2.702 · Front office"
export function placeName(n: MapNode): string {
  const short = shortId(n.id);
  if (!n.label || n.label.includes(short)) return n.label ?? short;
  return /^\d/.test(short) ? `${short} · ${n.label}` : n.label;
}

// Everything a search box should match for this point, lowercased.
export function searchText(n: MapNode): string {
  return [shortId(n.id), n.label ?? '', ...(n.aliases ?? []), n.kind].join(' ').toLowerCase();
}
