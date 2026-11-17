// Route preview: the whole route on the map, a one-line summary, the elevator-only switch, and Start.
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Card from '../components/Card';
import Chip from '../components/Chip';
import FloorMap from '../components/FloorMap';
import PuffyButton from '../components/PuffyButton';
import Screen from '../components/Screen';
import { Step, routeSummary } from '../directions';
import { floorLabel } from '../names';
import { colors, fonts, spacing } from '../theme';
import { Route } from '../types';

type Props = {
  route: Route | null;
  steps: Step[];
  avoidStairs: boolean;
  onAvoidStairs: (value: boolean) => void;
  onBack: () => void;
  onStart: () => void;
};

export default function PreviewScreen({ route, steps, avoidStairs, onAvoidStairs, onBack, onStart }: Props) {
  const floors = route ? [...new Set(route.nodes.map((n) => n.floor))] : [];
  const [floor, setFloor] = useState<string | null>(null);
  const shown = floor && floors.includes(floor) ? floor : floors[0];

  const toggle = (
    <Card>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Elevator only (no stairs)</Text>
        <Switch
          value={avoidStairs}
          onValueChange={onAvoidStairs}
          trackColor={{ false: colors.peach, true: colors.orange }}
          thumbColor={colors.white}
        />
      </View>
    </Card>
  );

  if (!route) {
    return (
      <Screen onBack={onBack} title="No way there yet">
        <Card>
          <Text style={styles.body}>
            We can't find a path between these two places{avoidStairs ? ' without stairs' : ''}.
          </Text>
        </Card>
        {toggle}
      </Screen>
    );
  }

  if (route.nodes.length === 1) {
    return (
      <Screen onBack={onBack} title="You're already here">
        <Card>
          <Text style={styles.body}>Your starting point and your destination are the same place. Pick somewhere else to go!</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen onBack={onBack} title="Your route">
      <Text style={styles.summary}>{routeSummary(route, steps)}</Text>
      {floors.length > 1 && (
        <View style={styles.row}>
          {floors.map((f) => <Chip key={f} label={floorLabel(f)} selected={f === shown} onPress={() => setFloor(f)} />)}
        </View>
      )}
      <FloorMap floorId={shown} route={route} focus={route.nodes.filter((n) => n.floor === shown)} />
      {toggle}
      <PuffyButton label="Start" onPress={onStart} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.cocoa },
  row: { flexDirection: 'row', gap: spacing.sm },
  body: { fontFamily: fonts.body, fontSize: 17, color: colors.cocoa },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.cocoa },
});
