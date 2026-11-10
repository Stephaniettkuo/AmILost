import { useRef, useState } from 'react';
import {
  GestureResponderEvent, Image, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import Svg from 'react-native-svg';
import { floorImages, gdcFloors } from './src/data/floors';
import { gdcGraph, needsCheck } from './src/data/gdc';
import { graphToFile } from './src/data/exportGraph';
import MapDataOverlay from './src/MapDataOverlay';
import { MapGraph, MapNode, NodeKind } from './src/types';
import {
  Point, addNode, attachToEdge, connectToNode, detach, moveNode, nearestEdge, nearestNode,
  nextHallId, removeEdge, removeNode, snapToNetwork,
} from './src/editGraph';

// add: tap to place a new point · move: drag a dot · reconnect: move a dot to
// another line · delete: tap a dot or line to remove it
type Mode = 'add' | 'move' | 'reconnect' | 'delete';
type Snapshot = { graph: MapGraph; edited: Set<string> }; // what Undo restores

const kinds: NodeKind[] = ['room', 'hall', 'stairs', 'elevator', 'entrance'];

export default function App() {
  const [floor, setFloor] = useState(gdcFloors[0]);
  const [showData, setShowData] = useState(true);
  const [mode, setMode] = useState<Mode>('move');
  // Editable copy of the map data. Edits live here until pasted into gdc.ts.
  const [graph, setGraph] = useState(gdcGraph);
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Snapshot[]>([]); // for Undo, newest last
  const [selected, setSelected] = useState<string | null>(null); // reconnect: picked dot
  const [addKind, setAddKind] = useState<NodeKind>('room');      // add: what to place
  const [addName, setAddName] = useState('');                    // add: e.g. "2.808A"
  const [message, setMessage] = useState('');                    // feedback under the buttons
  const dragging = useRef<string | null>(null);                  // move: dot being dragged
  const dragged = useRef(false);                                 // move: did it actually move?
  const { width } = useWindowDimensions();

  // The image is shown at screen width. `scale` converts between
  // screen pixels and image pixels.
  const scale = width / floor.width;
  const shownHeight = floor.height * scale;
  const reach = 15 / scale;   // how close (image px) a tap must be to a dot or line
  const onLine = 6 / scale;   // dropped this close to a line = put it on the line
  const near = 80;            // connect to a line at most this far away (image px)

  function toImage(e: GestureResponderEvent): Point {
    return {
      x: Math.round(e.nativeEvent.locationX / scale),
      y: Math.round(e.nativeEvent.locationY / scale),
    };
  }

  // Every change goes through here, so Undo can go back one step.
  function change(next: MapGraph, editedId?: string) {
    setHistory([...history, { graph, edited }]);
    setGraph(next);
    if (editedId) setEdited(new Set(edited).add(editedId));
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setGraph(last.graph);
    setEdited(last.edited);
    setHistory(history.slice(0, -1));
    setSelected(null);
    setMessage('Undid the last change.');
  }

  // ---- Move: hallway dots drag their lines along; other dots leave their
  // hallway while dragged and connect to the nearest hallway when dropped.
  function onGrab(e: GestureResponderEvent) {
    if (mode !== 'move') return;
    const node = nearestNode(graph, floor.id, toImage(e), reach);
    dragging.current = node?.id ?? null;
    dragged.current = false;
  }

  function onDrag(e: GestureResponderEvent) {
    const id = dragging.current;
    if (mode !== 'move' || !id) return;
    const p = toImage(e);
    if (!dragged.current) {
      dragged.current = true;
      const isHall = graph.nodes.find((n) => n.id === id)?.kind === 'hall';
      change(moveNode(isHall ? graph : detach(graph, id), id, p), id); // one Undo step per drag
    } else {
      setGraph(moveNode(graph, id, p));
    }
  }

  function onRelease(e: GestureResponderEvent) {
    const p = toImage(e);
    if (mode === 'move') {
      const id = dragging.current;
      dragging.current = null;
      if (!id || !dragged.current) return;
      const node = graph.nodes.find((n) => n.id === id)!;
      if (node.kind !== 'hall') {
        setGraph(snapToNetwork(graph, id, p, onLine, near));
        setMessage(`Moved ${short(id)} and connected it to the nearest hallway.`);
      }
    } else if (mode === 'add') {
      onAddTap(p);
    } else if (mode === 'reconnect') {
      onReconnectTap(p);
    } else {
      onDeleteTap(p);
    }
  }

  // ---- Add: build the id from the kind + name, place it, connect it.
  function onAddTap(p: Point) {
    const name = addName.trim().replace(/^GDC-(\d+-)?/, '');
    let node: MapNode;
    if (addKind === 'hall') {
      node = { id: nextHallId(graph, floor.id), kind: 'hall', floor: floor.id, ...p };
    } else if (!name) {
      setMessage('Type a name first (e.g. 2.808A, 2.1S1, or "Main entrance").');
      return;
    } else if (addKind === 'entrance') {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      node = { id: `${floor.id}-entrance-${slug}`, kind: 'entrance', floor: floor.id, ...p, label: name };
    } else {
      // rooms, stairs, elevators use the number on the plan: "2.808A" -> GDC-2.808A
      if (!name.startsWith(`${floor.id.replace('GDC-', '')}.`)) {
        setMessage(`On ${floor.name}, numbers start with "${floor.id.replace('GDC-', '')}." (e.g. ${floor.id.replace('GDC-', '')}.808A).`);
        return;
      }
      const label = addKind === 'stairs' ? `Stairs ${name}` : addKind === 'elevator' ? `Elevator ${name}` : undefined;
      node = { id: `GDC-${name}`, kind: addKind, floor: floor.id, ...p, ...(label ? { label } : {}) };
    }
    if (graph.nodes.some((n) => n.id === node.id)) {
      setMessage(`${node.id} already exists. Use Move to fix its position.`);
      return;
    }
    change(snapToNetwork(addNode(graph, node), node.id, p, onLine, near), node.id);
    setMessage(`Added ${node.id}.`);
    if (addKind !== 'hall') setAddName('');
  }

  // ---- Reconnect: first tap picks a dot, second tap picks where it goes.
  function onReconnectTap(p: Point) {
    const node = nearestNode(graph, floor.id, p, reach);
    if (!selected) {
      setSelected(node?.id ?? null);
      return;
    }
    const edge = node ? null : nearestEdge(graph, floor.id, p, reach, selected);
    if (node && node.id !== selected) change(connectToNode(graph, selected, node.id), selected);
    else if (edge) change(attachToEdge(graph, selected, edge, p), selected);
    setSelected(null);
  }

  // ---- Delete: a dot (its hallway closes back up) or a single line.
  function onDeleteTap(p: Point) {
    const node = nearestNode(graph, floor.id, p, reach);
    if (node) {
      change(removeNode(graph, node.id));
      setMessage(`Deleted ${node.id}.`);
      return;
    }
    const edge = nearestEdge(graph, floor.id, p, reach);
    if (edge) {
      change(removeEdge(graph, edge));
      setMessage(`Deleted the line ${short(edge.from)} – ${short(edge.to)}.`);
    }
  }

  function switchFloor(id: string) {
    setFloor(gdcFloors.find((f) => f.id === id)!);
    setSelected(null);
  }

  function pickMode(m: Mode) {
    setMode(m);
    setSelected(null);
    setMessage('');
    setShowData(true);
  }

  const hint = {
    add: addKind === 'hall'
      ? 'Tap to place a hallway point. On a line = joins it; beside a line = connects to it.'
      : 'Type the name, then tap where the door is. It connects to the nearest hallway.',
    move: 'Drag a dot. Rooms leave their hallway and reconnect where you drop them; hallway dots bring their lines.',
    reconnect: selected
      ? `Now tap the line (or dot) where ${short(selected)} should connect. Tap it again to cancel.`
      : 'Tap the dot you want to connect to a different line.',
    delete: 'Tap a dot to delete it, or tap a line to delete just the line.',
  }[mode];

  const changed = graph !== gdcGraph;

  return (
    <ScrollView style={styles.page}>
      <View style={styles.row}>
        {gdcFloors.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => switchFloor(f.id)}
            style={[styles.button, f.id === floor.id && styles.selected]}
          >
            <Text>{f.name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setShowData(!showData)} style={[styles.button, showData && styles.selected]}>
          <Text>Show map data</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {(['add', 'move', 'reconnect', 'delete'] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => pickMode(m)} style={[styles.button, mode === m && styles.selected]}>
            <Text>{m[0].toUpperCase() + m.slice(1)}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={undo}
          disabled={history.length === 0}
          style={[styles.button, history.length === 0 && styles.disabled]}
        >
          <Text>Undo{history.length ? ` (${history.length})` : ''}</Text>
        </Pressable>
      </View>

      {mode === 'add' && (
        <View style={styles.row}>
          {kinds.map((k) => (
            <Pressable key={k} onPress={() => setAddKind(k)} style={[styles.button, addKind === k && styles.selected]}>
              <Text>{k}</Text>
            </Pressable>
          ))}
          {addKind !== 'hall' && (
            <TextInput
              value={addName}
              onChangeText={setAddName}
              placeholder={addKind === 'entrance' ? 'e.g. Main entrance' : `e.g. ${floor.id.replace('GDC-', '')}.808A`}
              autoCapitalize="none"
              style={styles.input}
            />
          )}
        </View>
      )}

      <Text style={styles.hint}>{hint}</Text>
      {/* Always rendered (even empty) so the map doesn't jump when a message appears. */}
      <Text style={styles.message} numberOfLines={1}>{message || ' '}</Text>

      {/* Touch handler (works on phone and web; Pressable has no tap position on web). */}
      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onGrab}
        onResponderMove={onDrag}
        onResponderRelease={onRelease}
        style={{ width, height: shownHeight }}
      >
        <Image source={floorImages[floor.id]} style={{ width, height: shownHeight }} />
        {/* Drawn in image pixels; viewBox scales them to the screen. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={shownHeight} viewBox={`0 0 ${floor.width} ${floor.height}`}>
            {showData && (
              <MapDataOverlay
                graph={graph} floorId={floor.id} needsCheck={needsCheck} edited={edited} selected={selected}
              />
            )}
          </Svg>
        </View>
      </View>

      {changed && (
        <>
          <Text style={styles.heading}>
            Unsaved edits. To save: click in the box, select all (Cmd+A), copy, and paste over
            everything in src/data/gdc.ts. Edits are lost on refresh.
          </Text>
          <TextInput
            multiline
            editable={false}
            value={graphToFile(graph, needsCheck)}
            style={[styles.code, styles.box]}
          />
          <Pressable
            onPress={() => { change(gdcGraph); setEdited(new Set()); }}
            style={[styles.button, styles.inline]}
          >
            <Text>Undo all edits</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

// "GDC-2.316" -> "2.316", "GDC-2-hall-B" -> "hall-B"
function short(id: string) {
  return id.replace(/^GDC-(\d+-)?/, '');
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white', paddingTop: 50 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 4 },
  button: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 6 },
  selected: { backgroundColor: '#ffd8a8' },
  disabled: { opacity: 0.4 },
  input: { borderWidth: 1, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, minWidth: 180 },
  hint: { color: '#555', paddingHorizontal: 8, paddingTop: 4 },
  message: { color: '#2b8a3e', paddingHorizontal: 8, paddingTop: 2, minHeight: 22 },
  heading: { padding: 8, fontWeight: 'bold' },
  code: { paddingHorizontal: 8, fontFamily: 'Courier', fontSize: 12 },
  box: { height: 240, margin: 8, borderWidth: 1, borderColor: '#ccc' },
  inline: { alignSelf: 'flex-start', margin: 8 },
});
