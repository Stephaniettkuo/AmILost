// The big friendly arrow on the Directions screen. Draws a glyph for each kind of
// step, bobs gently, and springs/rotates when the direction changes.
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';
import { Arrow } from '../directions';
import { nativeDriver, useReduceMotion } from '../motion';
import { colors } from '../theme';

// The plain arrow points up; turning arrows are that arrow rotated.
const ANGLE: Partial<Record<Arrow, number>> = {
  straight: 0, left: -90, right: 90, slightLeft: -45, slightRight: 45,
};

const LABEL: Record<Arrow, string> = {
  straight: 'Go straight', left: 'Turn left', right: 'Turn right',
  slightLeft: 'Turn slightly left', slightRight: 'Turn slightly right',
  stairsUp: 'Take the stairs up', stairsDown: 'Take the stairs down',
  elevatorUp: 'Take the elevator up', elevatorDown: 'Take the elevator down', arrive: 'You are here',
};

const stroke = { stroke: colors.rust, strokeWidth: 10, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

// The drawing for one kind of step, in a 100 x 100 box.
function Glyph({ arrow }: { arrow: Arrow }) {
  if (arrow === 'stairsUp' || arrow === 'stairsDown') {
    return (
      <>
        <Polyline points="8,92 8,76 28,76 28,60 48,60 48,44 64,44" {...stroke} />
        <Polyline points={arrow === 'stairsUp' ? '70,26 83,13 96,26' : '70,13 83,26 96,13'} {...stroke} />
      </>
    );
  }
  if (arrow === 'elevatorUp' || arrow === 'elevatorDown') {
    return (
      <>
        <Rect x={22} y={12} width={56} height={76} rx={14} {...stroke} />
        <Polyline points={arrow === 'elevatorUp' ? '36,56 50,40 64,56' : '36,44 50,60 64,44'} {...stroke} />
      </>
    );
  }
  if (arrow === 'arrive') {
    return (
      <>
        <Circle cx={50} cy={50} r={38} {...stroke} />
        <Polyline points="32,52 45,65 69,38" {...stroke} />
      </>
    );
  }
  return (
    <>
      <Polyline points="50,86 50,20" {...stroke} />
      <Polyline points="26,44 50,20 74,44" {...stroke} />
    </>
  );
}

export default function DirectionArrow({ arrow, size = 140 }: { arrow: Arrow; size?: number }) {
  const reduce = useReduceMotion();
  const angle = useRef(new Animated.Value(ANGLE[arrow] ?? 0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // Spring to the new direction whenever the step changes.
  useEffect(() => {
    Animated.spring(angle, { toValue: ANGLE[arrow] ?? 0, useNativeDriver: nativeDriver, speed: 10, bounciness: 12 }).start();
  }, [arrow, angle]);

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
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] }) },
          { rotate: angle.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Glyph arrow={arrow} />
      </Svg>
    </Animated.View>
  );
}
