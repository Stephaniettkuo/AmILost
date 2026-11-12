// Draws a route over one floor plan: the path, a start pin, an end pin, and
// a marker where the route changes floor. Coordinates are image pixels.
import { Circle, G, Polyline, Text as SvgText } from 'react-native-svg';
import { placeName } from './names';
import { Route } from './types';

export default function RouteOverlay({ route, floorId }: { route: Route; floorId: string }) {
  const nodes = route.nodes;
  // Split the route into runs of consecutive points on this floor.
  const runs: { x: number; y: number }[][] = [];
  nodes.forEach((n, i) => {
    if (n.floor !== floorId) return;
    if (i === 0 || nodes[i - 1].floor !== floorId) runs.push([]);
    runs[runs.length - 1].push(n);
  });
  const start = nodes[0], end = nodes[nodes.length - 1];
  // Points where the route leaves this floor (stairs/elevator).
  const leaves = nodes.filter((n, i) => n.floor === floorId && nodes[i + 1] && nodes[i + 1].floor !== floorId);
  // Points where the route arrives on this floor from another one.
  const arrives = nodes.filter((n, i) => n.floor === floorId && i > 0 && nodes[i - 1].floor !== floorId);

  return (
    <G>
      {runs.map((run, i) => {
        const pts = run.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <G key={i}>
            <Polyline points={pts} fill="none" stroke="white" strokeWidth={14} strokeLinejoin="round" />
            <Polyline points={pts} fill="none" stroke="#f76707" strokeWidth={8} strokeLinejoin="round" />
          </G>
        );
      })}
      {leaves.map((n) => {
        const next = nodes[nodes.indexOf(n) + 1];
        return (
          <SvgText key={n.id} x={n.x + 14} y={n.y + 5} fontSize={18} fontWeight="bold" fill="#9c36b5">
            {`${placeName(n)} → ${next.floor.replace('GDC-', 'Floor ')}`}
          </SvgText>
        );
      })}
      {arrives.map((n) => {
        const prev = nodes[nodes.indexOf(n) - 1];
        return (
          <SvgText key={`a-${n.id}`} x={n.x + 14} y={n.y + 24} fontSize={18} fontWeight="bold" fill="#9c36b5">
            {`${placeName(n)} ← from ${prev.floor.replace('GDC-', 'Floor ')}`}
          </SvgText>
        );
      })}
      {start.floor === floorId && <Pin x={start.x} y={start.y} color="#2f9e44" text={placeName(start)} />}
      {end.floor === floorId && <Pin x={end.x} y={end.y} color="#e03131" text={placeName(end)} />}
    </G>
  );
}

function Pin({ x, y, color, text }: { x: number; y: number; color: string; text: string }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={13} fill={color} stroke="white" strokeWidth={4} />
      <SvgText x={x + 16} y={y - 12} fontSize={18} fontWeight="bold" fill={color} stroke="white" strokeWidth={0.6}>
        {text}
      </SvgText>
    </G>
  );
}
