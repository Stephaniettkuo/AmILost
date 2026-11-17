// Development only: a page that shows every building block, so we can look at them in the
// browser (open the app at  http://localhost:8081/#style ). Remove before we ship.
import { Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from './components/Card';
import Chip from './components/Chip';
import DirectionArrow from './components/DirectionArrow';
import FloorMap from './components/FloorMap';
import ProgressDots from './components/ProgressDots';
import PuffyButton from './components/PuffyButton';
import { gdcGraph } from './data/gdc';
import { Arrow, directions } from './directions';
import { findRoute } from './routing';
import { colors, fonts, spacing } from './theme';

const arrows: Arrow[] = ['straight', 'left', 'right', 'slightLeft', 'slightRight',
  'stairsUp', 'stairsDown', 'elevatorUp', 'elevatorDown', 'arrive'];

export default function StyleCheck() {
  const [loaded] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Nunito_400Regular, Nunito_700Bold });
  const [arrow, setArrow] = useState<Arrow>('straight');
  const [step, setStep] = useState(0);
  const [pressed, setPressed] = useState(0);
  const [chip, setChip] = useState('Restrooms');

  if (!loaded) return <View style={styles.page} />; // plain cream while fonts load

  // A real route, so the map shows something: floor 2 main entrance -> 2.316, split into steps.
  const route = findRoute(gdcGraph, 'GDC-2-entrance-main', 'GDC-2.316')!;
  const steps = directions(route);
  const cur = steps[Math.min(step, steps.length - 1)];
  const focus = route.nodes.slice(cur.from, cur.to + 1);
  // Floor-changing route for the floor 3 map.
  const up = findRoute(gdcGraph, 'GDC-2.316', 'GDC-3.304')!;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Style check</Text>
      <Text style={styles.body}>Dev page: every building block. Not part of the app.</Text>

      <Text style={styles.heading}>Buttons (tap them: they squish)</Text>
      <View style={styles.row}>
        <PuffyButton label="Directions" onPress={() => setPressed(pressed + 1)} icon={<Ionicons name="navigate" size={20} color={colors.white} />} />
        <PuffyButton label="Back" variant="secondary" onPress={() => setPressed(pressed + 1)} />
        <PuffyButton label="Disabled" disabled />
      </View>
      <Text style={styles.body}>Pressed {pressed} times</Text>

      <Text style={styles.heading}>Chips</Text>
      <View style={styles.row}>
        {['Restrooms', 'Elevators', 'Front office'].map((c) => (
          <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
        ))}
        <Chip label="From: Main entrance" icon={<Ionicons name="location" size={16} color={colors.deepOrange} />} />
      </View>

      <Text style={styles.heading}>Card (springs up when it appears)</Text>
      <Card>
        <Text style={styles.cardTitle}>2.316</Text>
        <Text style={styles.body}>Floor 2 · NW wing</Text>
      </Card>

      <Text style={styles.heading}>Direction arrow (tap a name: it springs and rotates)</Text>
      <View style={styles.row}>
        {arrows.map((a) => <Chip key={a} label={a} selected={arrow === a} onPress={() => setArrow(a)} />)}
      </View>
      <View style={styles.center}><DirectionArrow arrow={arrow} /></View>

      <Text style={styles.heading}>Progress dots + map zoomed to a step</Text>
      <ProgressDots count={steps.length} index={Math.min(step, steps.length - 1)} />
      <View style={styles.row}>
        <PuffyButton label="Back" variant="secondary" onPress={() => setStep(Math.max(0, step - 1))} />
        <PuffyButton label="Next" onPress={() => setStep(Math.min(steps.length - 1, step + 1))} />
      </View>
      <Text style={styles.body}>{cur.text}</Text>
      <FloorMap floorId={cur.floor} route={route} focus={focus} highlight={{ from: cur.from, to: cur.to }} />

      <Text style={styles.heading}>Whole floor, route on floor 2 (2.316 → 3.304)</Text>
      <FloorMap floorId="GDC-2" route={up} />
      <Text style={styles.heading}>…and the same route on floor 3</Text>
      <FloorMap floorId="GDC-3" route={up} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.md, gap: spacing.md, paddingTop: 50, paddingBottom: 80 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  center: { alignItems: 'center', paddingVertical: spacing.md },
  title: { fontFamily: fonts.title, fontSize: 34, color: colors.cocoa },
  heading: { fontFamily: fonts.title, fontSize: 20, color: colors.cocoa, marginTop: spacing.md },
  cardTitle: { fontFamily: fonts.title, fontSize: 28, color: colors.cocoa },
  body: { fontFamily: fonts.body, fontSize: 16, color: colors.latte },
});
