// A few colored dots that pop out and drift down once. Skipped when Reduce Motion is on.
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { nativeDriver, useReduceMotion } from '../motion';
import { colors } from '../theme';

// Fixed spots (percent across, delay in ms) so it looks scattered but is always the same.
const DOTS = [
  [8, 0], [20, 120], [32, 40], [44, 200], [56, 80], [68, 160], [80, 20], [92, 100],
  [14, 240], [38, 280], [62, 260], [86, 220],
];
const DOT_COLORS = [colors.orange, colors.apricot, colors.mint, colors.peach, colors.deepOrange];

function Dot({ left, delay, color }: { left: number; delay: number; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1400, delay, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }).start();
  }, [t, delay]);
  return (
    <Animated.View
      style={[styles.dot, {
        left: `${left}%`, backgroundColor: color,
        opacity: t.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-10, 220] }) }],
      }]}
    />
  );
}

export default function Confetti() {
  const reduce = useReduceMotion();
  if (reduce) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {DOTS.map(([left, delay], i) => <Dot key={i} left={left} delay={delay} color={DOT_COLORS[i % DOT_COLORS.length]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  dot: { position: 'absolute', top: 0, width: 12, height: 12, borderRadius: 6 },
});
