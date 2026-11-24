// The big friendly arrow on the Directions screen. Shows a painted picture for each kind of
// step, bobs gently, and springs/rotates when the direction changes.
import { useEffect, useRef } from 'react';
import { Animated, Easing, ImageStyle } from 'react-native';
import Picture from './Picture';
import { art } from '../art';
import { Arrow } from '../directions';
import { nativeDriver, useReduceMotion } from '../motion';

// Which way each arrow points, in degrees (0 = straight up).
const ANGLE: Partial<Record<Arrow, number>> = {
  straight: 0, left: -90, right: 90, slightLeft: -45, slightRight: 45,
};

const LABEL: Record<Arrow, string> = {
  straight: 'Go straight', left: 'Turn left', right: 'Turn right',
  slightLeft: 'Turn slightly left', slightRight: 'Turn slightly right',
  stairsUp: 'Take the stairs up', stairsDown: 'Take the stairs down',
  elevatorUp: 'Take the elevator up', elevatorDown: 'Take the elevator down', arrive: 'Your destination',
};

// The painted picture for each kind of step, and how it is turned or flipped.
const PICTURE: Record<Arrow, { source: number; transform?: ImageStyle['transform'] }> = {
  straight: { source: art.arrowUp },
  slightLeft: { source: art.arrowUp, transform: [{ rotate: '-45deg' }] },
  slightRight: { source: art.arrowUp, transform: [{ rotate: '45deg' }] },
  left: { source: art.arrowLeft },
  right: { source: art.arrowLeft, transform: [{ scaleX: -1 }] },
  stairsUp: { source: art.stairs },
  stairsDown: { source: art.stairs, transform: [{ scaleY: -1 }] }, // the arrow on the stairs then points down
  elevatorUp: { source: art.elevator },
  elevatorDown: { source: art.elevator },
  arrive: { source: art.pin },
};

export default function DirectionArrow({ arrow, size = 120 }: { arrow: Arrow; size?: number }) {
  const reduce = useReduceMotion();
  const turn = useRef(new Animated.Value(0)).current; // degrees still left to turn (0 = facing the right way)
  const last = useRef(ANGLE[arrow] ?? 0);
  const bob = useRef(new Animated.Value(0)).current;

  // When the step changes, start at the old direction and spring to the new one.
  useEffect(() => {
    if (ANGLE[arrow] === undefined) { turn.setValue(0); last.current = 0; return; } // stairs, elevator, pin: no turning
    const next = ANGLE[arrow];
    const from = last.current - next;
    last.current = next;
    if (reduce || from === 0) { turn.setValue(0); return; }
    turn.setValue(from);
    Animated.spring(turn, { toValue: 0, useNativeDriver: nativeDriver, speed: 10, bounciness: 10 }).start();
  }, [arrow, reduce, turn]);

  // Bob up and down forever (not when Reduce Motion is on).
  useEffect(() => {
    if (reduce) { bob.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, bob]);

  return (
    <Animated.View
      accessible
      accessibilityLabel={LABEL[arrow]}
      style={{
        width: size, height: size,
        transform: [
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] }) },
          { rotate: turn.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) },
        ],
      }}
    >
      <Picture source={PICTURE[arrow].source} resizeMode="contain" style={{ width: size, height: size, transform: PICTURE[arrow].transform }} />
    </Animated.View>
  );
}
