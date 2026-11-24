// Settings: the elevator-only default, About, and the team-only map editor.
import { StyleSheet, Switch, View } from 'react-native';
import Text from '../components/Text';
import Card from '../components/Card';
import StampButton from '../components/StampButton';
import Screen from '../components/Screen';
import { colors, fonts, spacing } from '../theme';

// On the web the switch's "on" knob color is a separate, web-only prop.
const webThumb = { activeThumbColor: colors.paper } as object;

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
            trackColor={{ false: colors.line, true: colors.rust }}
            thumbColor={colors.paper}
            {...webThumb}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>About AmILost</Text>
        <Text style={styles.small}>
          Room-level directions inside UT Austin's Gates Dell Complex (GDC). Built by Stephanie and
          Cienna for C S 378, Agentic Software Engineering. The floor plans belong to UT.
        </Text>
        <Text style={styles.small}>Building photo by Ajay Suresh (Wikimedia Commons, CC BY 4.0), cropped and faded.</Text>
      </Card>

      <StampButton label="Map editor (team only)" variant="secondary" onPress={onEditor} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  label: { fontFamily: fonts.title, fontSize: 26, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.fadedInk, marginTop: spacing.xs },
});
