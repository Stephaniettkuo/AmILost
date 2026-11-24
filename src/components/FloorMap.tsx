// A floor plan on tan, dark plan lines, with the burnt orange route on top. Fills the space it is given.
// `focus` zooms and centers on a set of points (image pixels); without it the whole
// plan is shown. `highlight` draws one stretch of the route as a solid line and the rest as dots.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Picture from './Picture';
import Svg, { Polyline } from 'react-native-svg';
import { art } from '../art';
import { floorImagesClear, gdcFloors } from '../data/floors';
import { Point } from '../editGraph';
import { useReduceMotion } from '../motion';
import { colors } from '../theme';
import { Route } from '../types';

type Props = {
  floorId: string;
  route?: Route | null;
  focus?: Point[];                              // zoom to these points
  highlight?: { from: number; to: number };     // route indexes (inclusive) to draw bright
  pin?: Point;                                  // a destination pin (when there is no route)
  you?: Point;                                  // the "you are here" dot
  marks?: Point[];                              // places to mark with a pin (e.g. every restroom on this floor)
  style?: StyleProp<ViewStyle>;                 // how big the map is, e.g. { flex: 1 }
};

const MIN_VIEW_PX = 360;  // never zoom in closer than this many plan pixels across
const FOCUS_PAD_PX = 90;  // breathing room around the focus points

type Rect = { x: number; y: number; w: number; h: number };

// Which part of the plan (image pixels) to show in a box with this width/height ratio.
function viewRect(floor: { width: number; height: number }, aspect: number, focus?: Point[]) {
  if (!focus || focus.length === 0) {
    const w = Math.max(floor.width, floor.height * aspect); // the whole plan fits
    return { x: (floor.width - w) / 2, y: (floor.height - w / aspect) / 2, w, h: w / aspect };
  }
  const xs = focus.map((p) => p.x), ys = focus.map((p) => p.y);
  const bw = Math.max(...xs) - Math.min(...xs) + 2 * FOCUS_PAD_PX;
  const bh = Math.max(...ys) - Math.min(...ys) + 2 * FOCUS_PAD_PX;
  const w = Math.min(Math.max(bw, bh * aspect, MIN_VIEW_PX), Math.max(floor.width, floor.height * aspect));
  const h = w / aspect;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const clamp = (v: number, a: number, b: number) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), v));
  return { x: clamp(cx - w / 2, 0, floor.width - w), y: clamp(cy - h / 2, 0, floor.height - h), w, h };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect =>
  ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const lerpPoint = (a: Point | undefined, b: Point | undefined, t: number): Point | undefined =>
  a && b ? { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) } : b;

// Measures the space it has, then draws the map at exactly that size.
export default function FloorMap({ style, ...map }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
  };
  return (
    <View style={[styles.box, style]} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 && <SizedMap {...map} w={size.w} h={size.h} />}
    </View>
  );
}

function SizedMap({ floorId, route, focus, highlight, pin, you, marks, w, h }: Omit<Props, 'style'> & { w: number; h: number }) {
  const floor = gdcFloors.find((f) => f.id === floorId)!;
  // When the focus changes on the same floor, the view glides over (and the "you are here" dot
  // slides with it) instead of jumping. On another floor, or with Reduce Motion, it just switches.
  const reduce = useReduceMotion();
  const target = { floorId, view: viewRect(floor, w / h, focus), you };
  const [shown, setShown] = useState(target);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const key = JSON.stringify([floorId, target.view, you]);
  useEffect(() => {
    const from = shownRef.current;
    if (reduce || from.floorId !== floorId) { setShown(target); return; }
    if (key === JSON.stringify([floorId, from.view, from.you])) return; // already there
    const t = new Animated.Value(0);
    const id = t.addListener(({ value }) => setShown({
      floorId, view: lerpRect(from.view, target.view, value), you: lerpPoint(from.you, target.you, value),
    }));
    Animated.timing(t, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
    return () => { t.removeListener(id); t.stopAnimation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduce]);
  const cur = shown.floorId === floorId ? shown : target; // never draw the old floor's view on a new floor
  const view = cur.view;
  const s = w / view.w;             // screen pixels per plan pixel
  const px = (screenPx: number) => screenPx / s; // line widths/pin sizes stay the same on screen when zoomed

  // Runs of consecutive route points on this floor, remembering each point's route index.
  const nodes = route?.nodes ?? [];
  const runs: { x: number; y: number; i: number }[][] = [];
  nodes.forEach((n, i) => {
    if (n.floor !== floorId) return;
    if (i === 0 || nodes[i - 1].floor !== floorId) runs.push([]);
    runs[runs.length - 1].push({ x: n.x, y: n.y, i });
  });
  const pts = (run: { x: number; y: number }[]) => run.map((p) => `${p.x},${p.y}`).join(' ');
  const bright = highlight
    ? runs.map((run) => run.filter((p) => p.i >= highlight.from && p.i <= highlight.to)).filter((r) => r.length > 1)
    : runs;
  const start = nodes[0], end = nodes[nodes.length - 1];
  const youAt = cur.you ?? (start?.floor === floorId ? start : undefined);
  const pinAt = pin ?? (end?.floor === floorId ? end : undefined);
  const screen = (p: Point) => ({ x: (p.x - view.x) * s, y: (p.y - view.y) * s }); // plan point -> screen point

  return (
    <>
      <Picture
        source={floorImagesClear[floorId]}
        tint={colors.mapInk}
        style={{ position: 'absolute', left: -view.x * s, top: -view.y * s, width: floor.width * s, height: floor.height * s }}
      />
      <Svg width={w} height={h} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} style={StyleSheet.absoluteFill}>
        {/* With a highlight, the whole route is dots under the solid stretch. */}
        {highlight && runs.map((run, i) => (
          <Polyline key={`f${i}`} points={pts(run)} fill="none" stroke={colors.rust} strokeWidth={px(11)}
            strokeDasharray={[0.1, px(20)]} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {bright.map((run, i) => (
          <RouteLine key={`b${i}`} points={pts(run)} line={px(highlight ? 13 : 10)} casing={highlight ? 0 : px(17)} />
        ))}
      </Svg>
      {marks?.map((p, i) => {
        const at = screen(p);
        return <Picture key={i} source={art.pin} style={[styles.mark, { left: at.x - 18, top: at.y - 47 }]} />;
      })}
      {youAt && <Picture source={art.you} style={[styles.you, { left: screen(youAt).x - 30, top: screen(youAt).y - 29 }]} />}
      {pinAt && <Picture source={art.pin} style={[styles.pin, { left: screen(pinAt).x - 23, top: screen(pinAt).y - 61 }]} />}
    </>
  );
}

// A solid route stretch; on the route overview it also gets a thin white edge (casing).
function RouteLine({ points, casing, line }: { points: string; casing: number; line: number }) {
  return (
    <>
      {casing > 0 && (
        <Polyline points={points} fill="none" stroke={colors.paper} strokeWidth={casing} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <Polyline points={points} fill="none" stroke={colors.rust} strokeWidth={line} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.map, overflow: 'hidden' },
  you: { position: 'absolute', width: 60, height: 59 },
  pin: { position: 'absolute', width: 46, height: 63 },
  mark: { position: 'absolute', width: 36, height: 49 },
});
