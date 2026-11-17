// The arrival moment: a round "ARRIVED" postmark and a red wax seal that stamp down onto the page.
// (With Reduce Motion on they simply appear.)
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Path, Polyline, Text as SvgText, TextPath } from 'react-native-svg';
import { nativeDriver, useReduceMotion } from '../motion';
import { colors, fonts } from '../theme';

export default function ArrivalStamp({ size = 220 }: { size?: number }) {
  const reduce = useReduceMotion();
  const press = useRef(new Animated.Value(reduce ? 1 : 0)).current; // 0 = held above the page, 1 = pressed
  useEffect(() => {
    if (reduce) { press.setValue(1); return; }
    Animated.spring(press, { toValue: 1, useNativeDriver: nativeDriver, speed: 9, bounciness: 14 }).start();
  }, [press, reduce]);

  return (
    <Animated.View
      accessible
      accessibilityLabel="Arrived"
      style={{
        width: size, height: size,
        opacity: press.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1.7, 1] }) },
          { rotate: '-10deg' },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {/* Postmark: two rings, text curved along the top, a check in the middle */}
        <Circle cx={100} cy={100} r={92} fill="none" stroke={colors.seal} strokeWidth={4} opacity={0.85} />
        <Circle cx={100} cy={100} r={80} fill="none" stroke={colors.seal} strokeWidth={1.5} opacity={0.85} />
        <Path id="arc" d="M 28 100 A 72 72 0 0 1 172 100" fill="none" />
        <SvgText fill={colors.seal} fontFamily={fonts.label} fontSize={26} letterSpacing={6} textAnchor="middle" opacity={0.9}>
          <TextPath href="#arc" startOffset="50%">ARRIVED</TextPath>
        </SvgText>
        <Circle cx={100} cy={118} r={38} fill={colors.seal} opacity={0.9} />
        <Circle cx={100} cy={118} r={31} fill="none" stroke={colors.light} strokeWidth={1.5} opacity={0.7} />
        <Polyline points="84,119 96,131 118,106" fill="none" stroke={colors.light} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}
