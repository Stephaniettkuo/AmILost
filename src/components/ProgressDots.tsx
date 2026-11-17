// "Step 2 of 6" as a row of ink dots: done ones are filled, the current one is a longer bar.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

export default function ProgressDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.wrap} accessibilityLabel={`Step ${index + 1} of ${count}`}>
      <View style={styles.dots}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.dot, i < index && styles.done, i === index && styles.current]} />
        ))}
      </View>
      <Text style={styles.text}>STEP {index + 1} OF {count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs },
  dots: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.ink },
  done: { backgroundColor: colors.ink },
  current: { width: 26, backgroundColor: colors.rust, borderColor: colors.rustDark },
  text: { fontFamily: fonts.label, fontSize: 12, letterSpacing: 1.5, color: colors.fadedInk },
});
