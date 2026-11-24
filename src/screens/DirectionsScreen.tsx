// Directions: one arrow and one instruction on top, the map zoomed to this step in the middle,
// Back / Next at the bottom. The top and bottom never change height, so the map never jumps.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Text from '../components/Text';
import DirectionArrow from '../components/DirectionArrow';
import FloorMap from '../components/FloorMap';
import { IconButton, Page } from '../components/Screen';
import StampButton from '../components/StampButton';
import Torn from '../components/Torn';
import { Step, distanceText, stepDistancePx } from '../directions';
import { floorLabel } from '../names';
import { nativeDriver, useReduceMotion } from '../motion';
import { useEdges } from '../safeArea';
import { colors, fonts } from '../theme';
import { Route } from '../types';

type Props = {
  route: Route;
  steps: Step[];
  toName: string;
  index: number;
  onIndex: (index: number) => void;
  onBack: () => void;     // leave directions (back to the preview)
  onArrive: () => void;   // pressed "I'm here" on the last step
};

export default function DirectionsScreen({ route, steps, toName, index, onIndex, onBack, onArrive }: Props) {
  const { top, bottom } = useEdges();
  const reduce = useReduceMotion();
  const step = steps[index];
  const nodes = route.nodes;
  const lift = step.arrow.startsWith('stairs') || step.arrow.startsWith('elevator');
  const last = index === steps.length - 1;

  // A step between floors shows the floor you arrive on, with the stairs/elevator marked.
  const mapFloor = lift ? nodes[step.to].floor : step.floor;
  const focus = lift ? [nodes[step.to]] : nodes.slice(step.from, step.to + 1);
  const you = nodes[lift ? step.to : step.from]; // the "you are here" mark

  // On a floor change the picture slides in from below (going up) or above (going down).
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!lift || reduce) { slide.setValue(0); return; }
    slide.setValue(step.arrow.endsWith('Up') ? 50 : -50);
    Animated.spring(slide, { toValue: 0, useNativeDriver: nativeDriver, speed: 8, bounciness: 10 }).start();
  }, [index, lift, reduce, slide, step.arrow]);

  const feet = !lift && step.arrow !== 'arrive' ? stepDistancePx(route, step) : 0;

  return (
    <Page>
      <Torn bottom style={[styles.top, { paddingTop: top, height: top + 214 }]}>
        <View style={styles.bar}>
          <IconButton icon="close" label="Leave directions" onPress={onBack} />
          <Text style={styles.to} numberOfLines={1}>To <Text style={styles.bold}>{toName}</Text></Text>
          <Text style={styles.floor}>{floorLabel(mapFloor)}</Text>
        </View>
        <View style={styles.step}>
          <Animated.View style={{ transform: [{ translateY: slide }] }}>
            <DirectionArrow arrow={step.arrow} size={118} />
          </Animated.View>
          <View style={styles.words} accessibilityLiveRegion="polite">
            <Text style={styles.text} numberOfLines={3} adjustsFontSizeToFit>{step.text}</Text>
            {feet > 0 && <Text style={styles.distance}>{distanceText(feet)}</Text>}
          </View>
        </View>
      </Torn>

      <FloorMap
        floorId={mapFloor} route={route} focus={focus} you={you}
        highlight={{ from: step.from, to: step.to }} style={styles.map}
      />

      <Torn top style={[styles.bottom, { height: 96 + bottom }]}>
        <StampButton
          label="Back" variant="secondary" style={styles.back}
          onPress={() => (index === 0 ? onBack() : onIndex(index - 1))}
        />
        <StampButton
          label={last ? "I'm here" : 'Next'} style={styles.next}
          onPress={() => (last ? onArrive() : onIndex(index + 1))}
        />
      </Torn>
    </Page>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, zIndex: 2, marginBottom: -6 },
  bar: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  to: { flex: 1, textAlign: 'center', fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  bold: { fontFamily: fonts.bodyBold },
  floor: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.rustDark },
  step: { height: 148, flexDirection: 'row', alignItems: 'center', gap: 18 },
  words: { flex: 1, gap: 6 },
  text: { fontFamily: fonts.title, fontSize: 32, lineHeight: 35, color: colors.ink },
  distance: { fontFamily: fonts.label, fontSize: 17, color: colors.ink },
  map: { flex: 1 },
  bottom: { marginTop: -6, paddingTop: 22, paddingHorizontal: 20, flexDirection: 'row', gap: 12, zIndex: 2 },
  back: { width: 104 },
  next: { flex: 1 },
});
