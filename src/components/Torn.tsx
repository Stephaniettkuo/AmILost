// A white sheet of paper with a torn top and/or bottom edge. Content goes on top of it.
// The edge is drawn with SVG so it looks the same on phones and on the web.
import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

type Props = { children?: ReactNode; top?: boolean; bottom?: boolean; fill?: string; style?: StyleProp<ViewStyle> };

const STEP = 14; // px between two points of the torn edge
// How far in each point of the edge sits (0 to 5 px). Fixed, so the edge never flickers.
const BITE = [1, 4, 0, 3, 2, 5, 1, 0, 4, 2, 3, 0, 5, 1, 3, 2, 0, 4, 1, 5, 2];

// The outline of the sheet: along the top, down the right side, back along the bottom.
export function tornPath(w: number, h: number, top: boolean, bottom: boolean): string {
  const n = Math.max(1, Math.ceil(w / STEP));
  const x = (i: number) => Math.round((w * i) / n);
  const up = Array.from({ length: n + 1 }, (_, i) => `${x(i)},${top ? BITE[i % BITE.length] : 0}`);
  const down = Array.from({ length: n + 1 }, (_, i) => `${x(n - i)},${h - (bottom ? BITE[(i * 4 + 2) % BITE.length] : 0)}`);
  return `M${[...up, ...down].join(' L')} Z`;
}

export default function Torn({ children, top = false, bottom = false, fill = colors.paper, style }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
  };
  const d = tornPath(size.w, size.h, top, bottom);
  return (
    <View style={style} onLayout={onLayout}>
      {size.w > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Two faint copies just outside the paper make the soft shadow. */}
          <Svg width={size.w} height={size.h} style={styles.svg}>
            {(bottom ? [3, 1.5] : top ? [-3, -1.5] : []).map((dy) => (
              <Path key={dy} d={d} fill={colors.shade} opacity={0.12} transform={`translate(0 ${dy})`} />
            ))}
            <Path d={d} fill={fill} />
          </Svg>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ svg: { overflow: 'visible' } });
