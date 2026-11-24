// The app's buttons. Primary: a painted brown-orange swash. Secondary: plain text.
// Both press in (shrink a little) when tapped.
import { useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Picture from './Picture';
import { art } from '../art';
import { nativeDriver } from '../motion';
import { colors, fonts, spacing } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function StampButton({ label, onPress, variant = 'primary', disabled, small, style }: Props) {
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
        style={[styles.button, small && styles.small]}
      >
        {primary && <Picture source={art.button} style={styles.paint} resizeMode="stretch" />}
        <Text numberOfLines={1} style={[primary ? styles.primary : styles.secondary, primary && small && styles.smallText]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 66, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  small: { minHeight: 56, paddingHorizontal: spacing.sm },
  paint: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  primary: { fontFamily: fonts.title, fontSize: 28, color: colors.light },
  smallText: { fontSize: 23 },
  secondary: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.rustDark, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
