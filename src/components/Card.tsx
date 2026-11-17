// A vanilla card with a soft shadow. Springs up into place when it appears.
import { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { nativeDriver, useReduceMotion } from '../motion';
import { colors, radii, shadow, spacing } from '../theme';

export default function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const appear = useRef(new Animated.Value(reduce ? 1 : 0)).current; // 0 = hidden, 1 = in place
  useEffect(() => {
    if (reduce) { appear.setValue(1); return; }
    Animated.spring(appear, { toValue: 1, useNativeDriver: nativeDriver, speed: 14, bounciness: 8 }).start();
  }, [appear, reduce]);

  return (
    <Animated.View
      style={[
        styles.card, shadow,
        { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.vanilla, borderRadius: radii.card, padding: spacing.lg },
});
