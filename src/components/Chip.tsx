// A small round label. Tappable when it has onPress; peach-washed when selected.
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Text from './Text';
import { colors, fonts, minTouch } from '../theme';

type Props = { label: string; selected?: boolean; onPress?: () => void; small?: boolean; style?: StyleProp<ViewStyle> };

export default function Chip({ label, selected, onPress, small, style }: Props) {
  const body = (
    <Text numberOfLines={1} style={[styles.label, small && styles.small, selected && styles.selectedLabel]}>{label}</Text>
  );
  const box = [styles.chip, small && styles.chipSmall, selected && styles.selected, !small && !!onPress && styles.tappable, style];
  return onPress ? (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }}
      onPress={onPress} hitSlop={small ? 8 : 0} style={box}
    >
      {body}
    </Pressable>
  ) : (
    <Text style={box as never} accessibilityRole="text">{label}</Text>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, alignSelf: 'flex-start', justifyContent: 'center' },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 2 },
  tappable: { minHeight: minTouch - 8 },
  selected: { backgroundColor: colors.wash, borderColor: colors.orange },
  label: { fontFamily: fonts.label, fontSize: 15, color: colors.ink },
  small: { fontSize: 13 },
  selectedLabel: { color: colors.rustDark },
});
