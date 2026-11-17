// Arrived: a happy bounce, confetti, and what to do next.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Confetti from '../components/Confetti';
import PuffyButton from '../components/PuffyButton';
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
        <Confetti />
        <Animated.View style={{ transform: [{ scale: pop }], alignItems: 'center', gap: spacing.sm }}>
          <Text style={styles.big}>You made it! 🎉</Text>
          <Text style={styles.place}>{placeName(place)}</Text>
        </Animated.View>
      </View>
      <PuffyButton label="Done" onPress={onDone} />
      <PuffyButton label="Directions back" variant="secondary" onPress={onDirectionsBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: fonts.title, fontSize: 38, color: colors.cocoa, textAlign: 'center' },
  place: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.deepOrange, textAlign: 'center' },
});
