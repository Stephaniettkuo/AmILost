// Route preview: the route on the map, a couple of facts, the elevator-only switch, and Start.
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Text from '../components/Text';
import Picture from '../components/Picture';
import { art } from '../art';
import FloorMap from '../components/FloorMap';
import FloorPicker from '../components/FloorPicker';
import { Header, Page } from '../components/Screen';
import StampButton from '../components/StampButton';
import Torn from '../components/Torn';
import { routeFacts } from '../directions';
import { placeTitle } from '../names';
import { useEdges } from '../safeArea';
import { colors, fonts, spacing } from '../theme';
import { MapNode, Route } from '../types';

// On the web the switch's "on" knob color is a separate, web-only prop.
const webThumb = { activeThumbColor: colors.paper } as object;

type Props = {
  route: Route | null;
  place: MapNode;
  from?: MapNode;
  avoidStairs: boolean;
  onAvoidStairs: (value: boolean) => void;
  onBack: () => void;
  onStart: () => void;
};

export default function PreviewScreen({ route, place, from, avoidStairs, onAvoidStairs, onBack, onStart }: Props) {
  const { bottom } = useEdges();
  const floors = route ? [...new Set(route.nodes.map((n) => n.floor))] : [];
  const [floor, setFloor] = useState<string | null>(null);
  const shown = floor && floors.includes(floor) ? floor : floors[0];
  const here = route?.nodes.length === 1;

  return (
    <Page>
      <Header title="Your route" onBack={onBack} />
      {route && !here ? (
        <View style={styles.flex}>
          <FloorMap floorId={shown} route={route} focus={route.nodes.filter((n) => n.floor === shown)} style={styles.flex} />
          {floors.length > 1 && <FloorPicker floors={floors} selected={shown} onSelect={setFloor} style={styles.picker} />}
        </View>
      ) : (
        <View style={[styles.flex, styles.none]}>
          <Picture source={art.calf} style={styles.calf} resizeMode="contain" />
          <Text style={styles.noneText}>
            {here
              ? "You're already here! Pick somewhere else to go."
              : `We can't find a way there yet${avoidStairs ? ' without stairs' : ''}.`}
          </Text>
        </View>
      )}
      <Torn top style={[styles.sheet, { paddingBottom: bottom + 6 }]}>
        <View>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>{placeTitle(place)}</Text>
          {from && <Text style={styles.text}>From {placeTitle(from)}</Text>}
        </View>
        {route && !here && (
          <View style={styles.facts}>
            {routeFacts(route).map((f) => <Text key={f} style={styles.fact}>{f}</Text>)}
          </View>
        )}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Elevator only (no stairs)</Text>
          <Switch
            accessibilityLabel="Elevator only"
            value={avoidStairs}
            onValueChange={onAvoidStairs}
            trackColor={{ false: colors.line, true: colors.rust }}
            thumbColor={colors.paper}
            {...webThumb}
          />
        </View>
        {route && !here && <StampButton label="Start" onPress={onStart} />}
      </Torn>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  picker: { position: 'absolute', right: 16, bottom: 36 },
  none: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  calf: { width: 200, height: 151 },
  noneText: { fontFamily: fonts.title, fontSize: 24, color: colors.ink, textAlign: 'center' },
  sheet: { marginTop: -6, paddingHorizontal: 20, paddingTop: 24, gap: 14 },
  name: { fontFamily: fonts.title, fontSize: 38, color: colors.ink },
  text: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  facts: { flexDirection: 'row', justifyContent: 'space-between' },
  fact: { fontFamily: fonts.label, fontSize: 16, color: colors.ink },
  switchRow: {
    minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
    borderTopWidth: 1, borderColor: colors.line,
  },
  switchLabel: { flex: 1, fontFamily: fonts.body, fontSize: 17, color: colors.ink },
});
