// A floor plan in a rounded card: faded plan + the orange route on top.
// `focus` zooms and centers on a set of points (image pixels); without it the whole
// plan is shown. `highlight` makes one stretch of the route bright and fades the rest.
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { floorImages, gdcFloors } from '../data/floors';
import { Point } from '../editGraph';
import { colors, radii, shadow, spacing } from '../theme';
import { Route } from '../types';

type Props = {
  floorId: string;
  route?: Route | null;
  focus?: Point[];                              // zoom to these points
  highlight?: { from: number; to: number };     // route indexes (inclusive) to draw bright
  width?: number;
  height?: number;
};

const MIN_VIEW_PX = 600;  // never zoom in closer than this many plan pixels across
const FOCUS_PAD_PX = 150; // breathing room around the focus points

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

export default function FloorMap({ floorId, route, focus, highlight, width, height }: Props) {
  const window = useWindowDimensions();
  const floor = gdcFloors.find((f) => f.id === floorId)!;
  const w = Math.max(width ?? window.width - 2 * spacing.md, 100); // window can report 0 for a moment on web
  const h = height ?? Math.round(w * 0.7);
  const view = viewRect(floor, w / h, focus);
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
  // Where the route leaves or arrives on this floor (stairs/elevator): a small ring.
  const lifts = nodes.filter((n, i) => n.floor === floorId &&
    ((nodes[i + 1] && nodes[i + 1].floor !== floorId) || (i > 0 && nodes[i - 1].floor !== floorId)));

  return (
    <View style={[styles.shadowBox, shadow, { width: w, height: h }]}>
      <View style={styles.clip}>
        <Image
          source={floorImages[floorId]}
          style={{ position: 'absolute', left: -view.x * s, top: -view.y * s, width: floor.width * s, height: floor.height * s, opacity: 0.55 }}
        />
        <Svg width={w} height={h} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} style={StyleSheet.absoluteFill}>
          {/* With a highlight, the whole route is drawn thin and faded under the bright stretch. */}
          {highlight && runs.map((run, i) => (
            <Polyline key={`f${i}`} points={pts(run)} fill="none" stroke={colors.apricot} opacity={0.45}
              strokeWidth={px(5)} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {bright.map((run, i) => (
            <RouteLine key={`b${i}`} points={pts(run)} casing={px(12)} line={px(7)} />
          ))}
          {lifts.map((n) => (
            <Circle key={n.id + n.floor} cx={n.x} cy={n.y} r={px(8)} fill={colors.white} stroke={colors.orange} strokeWidth={px(4)} />
          ))}
          {start?.floor === floorId && (
            <Circle cx={start.x} cy={start.y} r={px(10)} fill={colors.mint} stroke={colors.white} strokeWidth={px(4)} />
          )}
          {end?.floor === floorId && (
            <>
              <Circle cx={end.x} cy={end.y} r={px(12)} fill={colors.deepOrange} stroke={colors.white} strokeWidth={px(4)} />
              <Circle cx={end.x} cy={end.y} r={px(4)} fill={colors.white} />
            </>
          )}
        </Svg>
      </View>
    </View>
  );
}

// A bright route stretch: apricot casing under an orange line.
function RouteLine({ points, casing, line }: { points: string; casing: number; line: number }) {
  return (
    <>
      <Polyline points={points} fill="none" stroke={colors.apricot} strokeWidth={casing} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points={points} fill="none" stroke={colors.orange} strokeWidth={line} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

const styles = StyleSheet.create({
  shadowBox: { borderRadius: radii.card, backgroundColor: colors.vanilla },
  clip: { flex: 1, borderRadius: radii.card, overflow: 'hidden' },
});
