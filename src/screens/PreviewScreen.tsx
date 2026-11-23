// Route preview: the whole route on the map, a one-line summary, the elevator-only switch, and Start.
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Card from '../components/Card';
import Chip from '../components/Chip';
import FloorMap from '../components/FloorMap';
import StampButton from '../components/StampButton';
import Screen from '../components/Screen';
import WcIcon from '../components/WcIcon';
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
          trackColor={{ false: colors.wash, true: colors.rust }}
          thumbColor={colors.light}
        />
      </View>
    </Card>
  );

  if (!route) {
    return (
      <Screen onBack={onBack} title="No way there yet">
        <Card>
          <View style={styles.row}>
            <WcIcon name="compass" size={56} />
            <Text style={[styles.body, styles.flex]}>
              We can't find a path between these two places{avoidStairs ? ' without stairs' : ''}.
            </Text>
          </View>
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
      <View style={styles.row}>
        <WcIcon name="hourglass" size={44} />
        <Text style={[styles.summary, styles.flex]}>{routeSummary(route, steps)}</Text>
      </View>
      {floors.length > 1 && (
        <View style={styles.row}>
          {floors.map((f) => <Chip key={f} label={floorLabel(f)} selected={f === shown} onPress={() => setFloor(f)} />)}
        </View>
      )}
      <FloorMap floorId={shown} route={route} focus={route.nodes.filter((n) => n.floor === shown)} />
      {toggle}
      <StampButton label="Start" onPress={onStart} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  body: { fontFamily: fonts.body, fontSize: 20, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink },
});
