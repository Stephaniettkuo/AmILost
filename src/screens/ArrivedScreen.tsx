// Arrived: falling confetti, the celebrating longhorn, the ARRIVED stamp, and what to do next.
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import Picture from '../components/Picture';
import { art } from '../art';
import ArrivalStamp from '../components/ArrivalStamp';
import Confetti from '../components/Confetti';
import StampButton from '../components/StampButton';
import { Page } from '../components/Screen';
import { nativeDriver, useReduceMotion } from '../motion';
import { placeTitle } from '../names';
import { useEdges } from '../safeArea';
import { colors, fonts, spacing } from '../theme';
import { MapNode } from '../types';

type Props = { place: MapNode; onDone: () => void; onDirectionsBack: () => void };

export default function ArrivedScreen({ place, onDone, onDirectionsBack }: Props) {
  const { top, bottom, height } = useEdges();
  const reduce = useReduceMotion();
  const cheer = Math.min(320, height * 0.33); // smaller on short phones
  const pop = useRef(new Animated.Value(reduce ? 1 : 0.3)).current;
  useEffect(() => {
    if (reduce) { pop.setValue(1); return; }
    Animated.spring(pop, { toValue: 1, useNativeDriver: nativeDriver, speed: 6, bounciness: 18 }).start();
  }, [pop, reduce]);

  return (
    <View style={styles.flex}>
      <Page>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: top, paddingBottom: bottom + 8 }]}>
          <View style={styles.hero}>
            <Picture source={art.cheer} style={{ width: cheer, height: cheer * 0.94 }} resizeMode="contain" />
            <ArrivalStamp size={130} />
            <Animated.View style={{ transform: [{ scale: pop }], alignItems: 'center', gap: spacing.sm }}>
              <Text style={styles.big}>You made it!</Text>
              <Text style={styles.place}>{placeTitle(place)}</Text>
            </Animated.View>
          </View>
          <StampButton label="Done" onPress={onDone} />
          <StampButton label="Directions back" variant="secondary" onPress={onDirectionsBack} />
        </ScrollView>
      </Page>
      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.md },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: spacing.md },
  big: { fontFamily: fonts.title, fontSize: 44, color: colors.ink, textAlign: 'center' },
  place: { fontFamily: fonts.label, fontSize: 18, color: colors.rustDark, textAlign: 'center' },
});
