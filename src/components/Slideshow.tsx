// Faded photos of GDC that crossfade every few seconds, with pause and "jump to photo" buttons.
// Starts paused if the phone has Reduce Motion on.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Picture from './Picture';
import { photos } from '../art';
import { nativeDriver, useReduceMotion } from '../motion';
import { colors, minTouch } from '../theme';
import Torn from './Torn';

const SECONDS = 5;
const FADED = 0.68; // how strong the photos are over white

export default function Slideshow({ bottom, narrow }: { bottom: number; narrow: boolean }) {
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const fades = useRef(photos.map((_, i) => new Animated.Value(i === 0 ? FADED : 0))).current;

  useEffect(() => { if (reduce) setPlaying(false); }, [reduce]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), SECONDS * 1000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    fades.forEach((f, i) => Animated.timing(f, {
      toValue: i === index ? FADED : 0, duration: reduce ? 0 : 1000, useNativeDriver: nativeDriver,
    }).start());
  }, [index, fades, reduce]);

  return (
    <>
      {photos.map((p, i) => (
        <Animated.View key={p.label} style={[StyleSheet.absoluteFill, { opacity: fades[i] }]} pointerEvents="none">
          <Picture source={p.source} accessibilityLabel={i === index ? p.label : undefined} style={styles.photo} resizeMode="cover" />
        </Animated.View>
      ))}
      <Torn top bottom style={[styles.controls, { bottom }]}>
        <Pressable
          accessibilityRole="button" accessibilityLabel={playing ? 'Pause photos' : 'Play photos'}
          onPress={() => setPlaying(!playing)} style={[styles.button, narrow && styles.narrow]}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={20} color={colors.ink} />
        </Pressable>
        {photos.map((p, i) => (
          <Pressable
            key={p.label} accessibilityRole="button" accessibilityLabel={`Photo ${i + 1}`}
            accessibilityState={{ selected: i === index }}
            onPress={() => { setIndex(i); setPlaying(false); }} style={[styles.button, narrow && styles.narrow]}
          >
            <View style={[styles.bar, i === index && styles.barOn]} />
          </Pressable>
        ))}
      </Torn>
    </>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: '100%' },
  controls: { position: 'absolute', left: 16, flexDirection: 'row' },
  button: { width: minTouch - 4, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  narrow: { width: 34 }, // very small phones
  bar: { width: 26, height: 4, backgroundColor: colors.fadedInk },
  barOn: { backgroundColor: colors.orange },
});
