// Arrived: a happy bounce, confetti, and what to do next.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import ArrivalStamp from '../components/ArrivalStamp';
import StampButton from '../components/StampButton';
import Screen from '../components/Screen';
import { nativeDriver, useReduceMotion } from '../motion';
import { placeName } from '../names';
import { colors, fonts, spacing } from '../theme';
import { MapNode } from '../types';

type Props = { place: MapNode; onDone: () => void; onDirectionsBack: () => void };

export default function ArrivedScreen({ place, onDone, onDirectionsBack }: Props) {
  const reduce = useReduceMotion();
  const pop = useRef(new Animated.Value(reduce ? 1 : 0.3)).current;
  useEffect(() => {
    if (reduce) { pop.setValue(1); return; }
    Animated.spring(pop, { toValue: 1, useNativeDriver: nativeDriver, speed: 6, bounciness: 18 }).start();
  }, [pop, reduce]);

  return (
    <Screen>
      <View style={styles.hero}>
        <ArrivalStamp />
        <Animated.View style={{ transform: [{ scale: pop }], alignItems: 'center', gap: spacing.sm }}>
          <Text style={styles.big}>You made it!</Text>
          <Text style={styles.place}>{placeName(place)}</Text>
        </Animated.View>
      </View>
      <StampButton label="Done" onPress={onDone} />
      <StampButton label="Directions back" variant="secondary" onPress={onDirectionsBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  big: { fontFamily: fonts.script, fontSize: 60, lineHeight: 76, color: colors.ink, textAlign: 'center' },
  place: { fontFamily: fonts.label, fontSize: 18, letterSpacing: 1, color: colors.rustDark, textAlign: 'center' },
});
