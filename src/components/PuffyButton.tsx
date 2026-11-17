// A squishy candy button: darker bottom edge, shrinks when pressed, springs back.
import { ReactNode, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { nativeDriver } from '../motion';
import { buttonEdge, colors, fonts, minTouch, radii, shadow, spacing } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;      // optional icon shown before the label
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function PuffyButton({ label, onPress, variant = 'primary', icon, disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const squish = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: nativeDriver, speed: 40, bounciness: 8 }).start();
  const primary = variant === 'primary';

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && styles.disabled, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => squish(0.95)}
        onPressOut={() => squish(1)}
      >
        {/* The edge is the outer shape; the face sits on it, leaving a darker strip at the bottom. */}
        <View style={[styles.edge, { backgroundColor: primary ? colors.deepOrange : colors.orange }, shadow]}>
          <View style={[styles.face, { backgroundColor: primary ? colors.orange : colors.apricot }]}>
            {icon}
            <Text style={[styles.label, { color: primary ? colors.white : colors.cocoa }]}>{label}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edge: { borderRadius: radii.pill, paddingBottom: buttonEdge },
  face: {
    minHeight: minTouch, borderRadius: radii.pill, paddingHorizontal: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  label: { fontFamily: fonts.button, fontSize: 18 },
  disabled: { opacity: 0.45 },
});
