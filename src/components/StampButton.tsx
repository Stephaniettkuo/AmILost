// A button like a rubber stamp or brass plate: a thin double border, a typewriter label,
// and it presses in (shrinks a little) when tapped.
import { ReactNode, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { nativeDriver } from '../motion';
import { colors, fonts, minTouch, radii, shadow, spacing } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;      // optional icon shown before the label
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function StampButton({ label, onPress, variant = 'primary', icon, disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: nativeDriver, speed: 40, bounciness: 6 }).start();
  const primary = variant === 'primary';

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && styles.disabled, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => press(0.97)}
        onPressOut={() => press(1)}
      >
        {/* Outer border, then a second thin border just inside it (like a stamped plate). */}
        <View style={[styles.outer, primary ? styles.primaryOuter : styles.secondaryOuter, shadow]}>
          <View style={[styles.inner, primary ? styles.primaryInner : styles.secondaryInner]}>
            {icon}
            <Text style={[styles.label, { color: primary ? colors.light : colors.ink }]}>{label}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: radii.pill, borderWidth: 1.5, padding: 3 },
  primaryOuter: { backgroundColor: colors.rust, borderColor: colors.rustDark },
  secondaryOuter: { backgroundColor: colors.parchment, borderColor: colors.ink },
  inner: {
    minHeight: minTouch - 8, borderRadius: radii.small, borderWidth: 1, paddingHorizontal: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  primaryInner: { borderColor: 'rgba(251,245,230,0.55)' },
  secondaryInner: { borderColor: colors.line },
  label: { fontFamily: fonts.label, fontSize: 15, letterSpacing: 1.2, textTransform: 'uppercase' },
  disabled: { opacity: 0.45 },
});
