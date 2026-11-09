import { useState } from 'react';
import {
  GestureResponderEvent, Image, Pressable, ScrollView,
  StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { floorImages, gdcFloors } from './src/data/floors';

type Point = { x: number; y: number };

export default function App() {
  const [floor, setFloor] = useState(gdcFloors[0]);
  const [taps, setTaps] = useState<Point[]>([]);
  const { width } = useWindowDimensions();

  // The image is shown at screen width. `scale` converts between
  // screen pixels and image pixels.
  const scale = width / floor.width;
  const shownHeight = floor.height * scale;

  // Tracing mode: a tap becomes a point in image pixels.
  function onTap(e: GestureResponderEvent) {
    const x = Math.round(e.nativeEvent.locationX / scale);
    const y = Math.round(e.nativeEvent.locationY / scale);
    setTaps([...taps, { x, y }]);
    console.log(nodeLine(floor.id, x, y));
  }

  function switchFloor(id: string) {
    setFloor(gdcFloors.find((f) => f.id === id)!);
    setTaps([]);
  }

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
        <Pressable onPress={() => setTaps(taps.slice(0, -1))} style={styles.button}>
          <Text>Undo</Text>
        </Pressable>
        <Pressable onPress={() => setTaps([])} style={styles.button}>
          <Text>Clear</Text>
        </Pressable>
      </View>

      {/* Touch handler (works on phone and web; Pressable has no tap position on web). */}
      <View
        onStartShouldSetResponder={() => true}
        onResponderRelease={onTap}
        style={{ width, height: shownHeight }}
      >
        <Image source={floorImages[floor.id]} style={{ width, height: shownHeight }} />
        {/* Dots are drawn in image pixels; viewBox scales them to the screen. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={shownHeight} viewBox={`0 0 ${floor.width} ${floor.height}`}>
            {taps.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={10} fill="red" />
            ))}
          </Svg>
        </View>
      </View>

      <Text style={styles.heading}>Tapped points ({taps.length}) — copy into the data file, then fill in id/kind:</Text>
      <Text selectable style={styles.code}>
        {taps.map((p) => nodeLine(floor.id, p.x, p.y)).join('\n')}
      </Text>
    </ScrollView>
  );
}

function nodeLine(floorId: string, x: number, y: number) {
  return `{ id: '', kind: 'hall', floor: '${floorId}', x: ${x}, y: ${y} },`;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white', paddingTop: 50 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8 },
  button: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 6 },
  selected: { backgroundColor: '#ffd8a8' },
  heading: { padding: 8, fontWeight: 'bold' },
  code: { paddingHorizontal: 8, fontFamily: 'Courier' },
});
