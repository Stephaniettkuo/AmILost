// Directions: the big arrow and step text on top, the map zoomed to this step in the middle,
// Back / Next and progress dots at the bottom. Nothing here changes height between steps,
// so the map never jumps.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import DirectionArrow from '../components/DirectionArrow';
import FloorMap from '../components/FloorMap';
import ProgressDots from '../components/ProgressDots';
import StampButton from '../components/StampButton';
import Screen from '../components/Screen';
import { Step, distanceText, stepDistancePx } from '../directions';
import { floorLabel } from '../names';
import { nativeDriver, useReduceMotion } from '../motion';
import { colors, fonts, spacing } from '../theme';
import { Route } from '../types';

type Props = {
  route: Route;
  steps: Step[];
  index: number;
  onIndex: (index: number) => void;
  onBack: () => void;     // leave directions (back to the preview)
  onArrive: () => void;   // pressed "I'm here" on the last step
};

export default function DirectionsScreen({ route, steps, index, onIndex, onBack, onArrive }: Props) {
  const reduce = useReduceMotion();
  const step = steps[index];
  const nodes = route.nodes;
  const lift = step.arrow.startsWith('stairs') || step.arrow.startsWith('elevator');
  const last = index === steps.length - 1;

  // A step between floors shows the floor you arrive on, with the stairs/elevator marked.
  const mapFloor = lift ? nodes[step.to].floor : step.floor;
  const focus = lift ? [nodes[step.to]] : nodes.slice(step.from, step.to + 1);
  const you = nodes[lift ? step.to : step.from]; // the "you are here" dot

  // On a floor change the icon slides in from below (going up) or above (going down).
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!lift || reduce) { slide.setValue(0); return; }
    slide.setValue(step.arrow.endsWith('Up') ? 50 : -50);
    Animated.spring(slide, { toValue: 0, useNativeDriver: nativeDriver, speed: 8, bounciness: 10 }).start();
  }, [index, lift, reduce, slide, step.arrow]);

  const feet = !lift && step.arrow !== 'arrive' ? stepDistancePx(route, step) : 0;

  return (
    <Screen onBack={onBack} title={floorLabel(mapFloor)}>
      {/* Fixed height: the same size for every kind of step. */}
      <Card style={[styles.top, lift && styles.lift]}>
        <Animated.View style={{ transform: [{ translateY: slide }] }}>
          <DirectionArrow arrow={step.arrow} size={110} />
        </Animated.View>
        <Text style={styles.text} numberOfLines={3}>{step.text}</Text>
        <Text style={styles.distance}>{feet > 0 ? distanceText(feet) : ' '}</Text>
      </Card>

      <FloorMap
        floorId={mapFloor} route={route} focus={focus} you={you}
        highlight={{ from: step.from, to: step.to }}
      />

      <View style={styles.buttons}>
        <StampButton label="Back" variant="secondary" onPress={() => (index === 0 ? onBack() : onIndex(index - 1))} style={styles.flex} />
        <StampButton label={last ? "I'm here" : 'Next'} onPress={() => (last ? onArrive() : onIndex(index + 1))} style={styles.flex} />
      </View>
      <ProgressDots count={steps.length} index={index} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 270, alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  lift: { backgroundColor: colors.wash },
  text: { fontFamily: fonts.title, fontSize: 28, lineHeight: 30, color: colors.ink, textAlign: 'center', height: 90 },
  distance: { fontFamily: fonts.label, fontSize: 13, letterSpacing: 1, color: colors.fadedInk, height: 22 },
  buttons: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
