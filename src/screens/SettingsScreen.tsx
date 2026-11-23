// Settings: the elevator-only default, About, and the team-only map editor.
import { Image, StyleSheet, Switch, Text, View } from 'react-native';
import Card from '../components/Card';
import StampButton from '../components/StampButton';
import Screen from '../components/Screen';
import WcIcon from '../components/WcIcon';
import { colors, fonts, spacing } from '../theme';
import { wc } from '../watercolor';

type Props = {
  avoidStairs: boolean;
  onAvoidStairs: (value: boolean) => void;
  onBack: () => void;
  onEditor: () => void;
};

export default function SettingsScreen({ avoidStairs, onAvoidStairs, onBack, onEditor }: Props) {
  return (
    <Screen onBack={onBack} title="Settings">
      <Card>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.label}>Elevator only</Text>
            <Text style={styles.small}>Never route through stairs.</Text>
          </View>
          <Switch
            value={avoidStairs}
            onValueChange={onAvoidStairs}
            trackColor={{ false: colors.wash, true: colors.rust }}
            thumbColor={colors.light}
          />
        </View>
      </Card>

      <Image source={wc.divider} accessible={false} style={styles.divider} resizeMode="contain" />

      <Card>
        <Image source={wc.compassRose} accessible={false} style={styles.rose} />
        <Text style={styles.label}>About AmILost</Text>
        <Text style={styles.small}>
          Room-level directions inside UT Austin's Gates Dell Complex (GDC). Built by Stephanie and
          Cienna for C S 378, Agentic Software Engineering. The floor plans belong to UT.
        </Text>
      </Card>

      <StampButton
        label="Map editor (team only)" variant="secondary" onPress={onEditor}
        icon={<WcIcon name="floorPlan" size={30} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { width: '100%', height: 24, opacity: 0.9 },
  rose: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 64, height: 64, opacity: 0.85 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  label: { fontFamily: fonts.title, fontSize: 26, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 19, color: colors.fadedInk, marginTop: spacing.xs },
});
