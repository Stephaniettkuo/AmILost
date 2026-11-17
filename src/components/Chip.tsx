// A small paper label, like a ticket. Tappable if you give it onPress; washed in tan when selected.
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, minTouch, radii, spacing } from '../theme';

type Props = { label: string; selected?: boolean; onPress?: () => void; icon?: ReactNode };

export default function Chip({ label, selected, onPress, icon }: Props) {
  const body = (
    <View style={[styles.chip, selected && styles.selected, onPress ? styles.tappable : null]}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>{body}</Pressable>
  ) : body;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.small,
    backgroundColor: colors.parchment, borderWidth: 1, borderColor: colors.line,
  },
  tappable: { minHeight: minTouch, justifyContent: 'center' },
  selected: { backgroundColor: colors.wash, borderColor: colors.ink },
  label: { fontFamily: fonts.label, fontSize: 13, color: colors.ink },
});
