// Settings: the elevator-only default, About, and the team-only map editor.
import { StyleSheet, Switch, Text, View } from 'react-native';
import Card from '../components/Card';
import PuffyButton from '../components/PuffyButton';
import Screen from '../components/Screen';
import { colors, fonts, spacing } from '../theme';

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
            trackColor={{ false: colors.peach, true: colors.orange }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>About AmILost</Text>
        <Text style={styles.small}>
          Room-level directions inside UT Austin's Gates Dell Complex (GDC). Built by Stephanie and
          Cienna for C S 378, Agentic Software Engineering. The floor plans belong to UT.
        </Text>
      </Card>

      <PuffyButton label="Map editor (team only)" variant="secondary" onPress={onEditor} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  label: { fontFamily: fonts.title, fontSize: 20, color: colors.cocoa },
  small: { fontFamily: fonts.body, fontSize: 15, color: colors.latte, marginTop: spacing.xs },
});
