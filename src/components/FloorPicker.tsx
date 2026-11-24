// A torn strip of floor buttons (highest floor on top, or lowest on the left when `row`). The selected one looks like a wax dot.
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { floorLabel } from '../names';
import { colors, fonts, minTouch } from '../theme';
import Torn from './Torn';

type Props = { floors: string[]; selected: string; onSelect: (id: string) => void; row?: boolean; style?: StyleProp<ViewStyle> };

export default function FloorPicker({ floors, selected, onSelect, row, style }: Props) {
  const sorted = [...floors].sort();
  return (
    <Torn top bottom style={[styles.strip, row && styles.row, style]}>
      {(row ? sorted : sorted.reverse()).map((f) => (
        <Pressable
          key={f} accessibilityRole="button" accessibilityLabel={floorLabel(f)}
          accessibilityState={{ selected: f === selected }} onPress={() => onSelect(f)} style={styles.button}
        >
          <View style={[styles.dot, f === selected && styles.on]}>
            <Text style={[styles.text, f === selected && styles.onText]}>{f.replace('GDC-', '')}</Text>
          </View>
        </Pressable>
      ))}
    </Torn>
  );
}

const styles = StyleSheet.create({
  strip: { paddingVertical: 4, paddingHorizontal: 2 },
  row: { flexDirection: 'row' },
  button: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.seal },
  text: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
  onText: { color: colors.paper },
});
