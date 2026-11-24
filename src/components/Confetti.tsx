// Painted confetti that drifts down the whole screen a few times, then stops.
// With Reduce Motion on, nothing falls. Taps go straight through it.
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { confetti } from '../art';
import { nativeDriver, useReduceMotion } from '../motion';
import { MAX_WIDTH } from '../theme';
import Picture from './Picture';

const PIECES = 28;
const FALLS = 3;            // how many times each piece falls
const SIZE = 26;

export default function Confetti() {
  const reduce = useReduceMotion();
  const window = useWindowDimensions();
  const width = Math.min(window.width, MAX_WIDTH);
  const falls = useRef(Array.from({ length: PIECES }, () => new Animated.Value(0))).current; // 0 = above, 1 = below

  useEffect(() => {
    if (reduce) return;
    // Each piece starts at its own moment and takes its own time, so they never fall in a row.
    const runs = falls.map((f, i) => Animated.sequence([
      Animated.delay((i * 370) % 2600),
      Animated.loop(
        Animated.timing(f, { toValue: 1, duration: 3200 + ((i * 530) % 1900), easing: Easing.linear, useNativeDriver: nativeDriver }),
        { iterations: FALLS },
      ),
    ]));
    runs.forEach((r) => r.start());
    return () => runs.forEach((r) => r.stop());
  }, [falls, reduce]);

  if (reduce) return null;
  return (
    <View style={[styles.layer, { left: (window.width - width) / 2, width, height: window.height }]}>
      {falls.map((f, i) => {
        const sway = 14 + ((i * 7) % 18);
        return (
          <Animated.View
            key={i}
            style={[styles.piece, {
              left: ((i * 0.618) % 1) * (width - SIZE),
              transform: [
                { translateY: f.interpolate({ inputRange: [0, 1], outputRange: [-SIZE * 2, window.height + SIZE] }) },
                { translateX: f.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, sway, 0, -sway, 0] }) },
                { rotate: f.interpolate({ inputRange: [0, 1], outputRange: ['0deg', i % 2 ? '400deg' : '-320deg'] }) },
                { scale: 0.75 + ((i * 3) % 5) / 8 },
              ],
            }]}
          >
            <Picture source={confetti[i % confetti.length]} style={styles.picture} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 10 },
  piece: { position: 'absolute', top: 0 },
  picture: { width: SIZE, height: SIZE },
});
