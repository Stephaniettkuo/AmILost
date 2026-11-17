// "Step 2 of 6" as a row of dots: the current one is a longer orange pill.
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

export default function ProgressDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.wrap} accessibilityLabel={`Step ${index + 1} of ${count}`}>
      <View style={styles.dots}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.current, i < index && styles.done]} />
        ))}
      </View>
      <Text style={styles.text}>Step {index + 1} of {count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs },
  dots: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.peach },
  done: { backgroundColor: colors.apricot },
  current: { width: 26, backgroundColor: colors.orange },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.latte },
});
