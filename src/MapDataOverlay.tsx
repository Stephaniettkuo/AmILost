// Draws map data (nodes + edges) for one floor over the floor plan, for review.
// Coordinates are image pixels, like everything else.
import { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { MapGraph } from './types';

const colors: Record<string, string> = {
  hall: '#1c7ed6', room: '#e03131', stairs: '#2f9e44', elevator: '#9c36b5', entrance: '#f08c00',
};

type Props = {
  graph: MapGraph;
  floorId: string;
  needsCheck: string[];  // yellow ring: agent wasn't sure
  edited: Set<string>;   // green ring: changed in this session
  selected?: string | null; // black ring: picked in Reconnect mode
};

export default function MapDataOverlay({ graph, floorId, needsCheck, edited, selected }: Props) {
  const nodes = graph.nodes.filter((n) => n.floor === floorId);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = graph.edges.filter((e) => byId.has(e.from) && byId.has(e.to));

  const ring = (id: string) =>
    id === selected ? '#000' : edited.has(id) ? '#2f9e44' : needsCheck.includes(id) ? '#fab005' : null;

  return (
    <G>
      {edges.map((e, i) => {
        const a = byId.get(e.from)!, b = byId.get(e.to)!;
        return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1c7ed6" strokeWidth={3} />;
      })}
      {nodes.map((n) => (
        <G key={n.id}>
          {ring(n.id) && <Circle cx={n.x} cy={n.y} r={11} fill="none" stroke={ring(n.id)!} strokeWidth={3} />}
          <Circle cx={n.x} cy={n.y} r={5} fill={colors[n.kind]} />
          {/* Short name: "2.316" for rooms, "hall-B" for hallway points */}
          <SvgText x={n.x + 7} y={n.y - 6} fontSize={11} fill={colors[n.kind]}>
            {n.id.replace(`${floorId}-`, '').replace('GDC-', '')}
          </SvgText>
        </G>
      ))}
    </G>
  );
}
