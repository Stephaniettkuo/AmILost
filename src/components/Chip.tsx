// A small round label. Tappable if you give it onPress; peach when selected.
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
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill,
    backgroundColor: colors.vanilla, borderWidth: 2, borderColor: colors.peach,
  },
  tappable: { minHeight: minTouch, justifyContent: 'center' },
  selected: { backgroundColor: colors.peach, borderColor: colors.apricot },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.cocoa },
});
