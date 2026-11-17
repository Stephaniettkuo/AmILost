// The frame every screen uses: cream background, a phone-width column, and an optional
// header with a round back arrow and a title.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MAX_WIDTH, colors, fonts, minTouch, radii, shadow, spacing } from '../theme';

type Props = { children: ReactNode; title?: string; onBack?: () => void; right?: ReactNode };

export default function Screen({ children, title, onBack, right }: Props) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.column}>
        {(onBack || title || right) && (
          <View style={styles.header}>
            {onBack && (
              <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={[styles.round, shadow]}>
                <Ionicons name="chevron-back" size={24} color={colors.cocoa} />
              </Pressable>
            )}
            <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
            {right}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { paddingTop: 50, paddingBottom: spacing.xl },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouch },
  title: { flex: 1, fontFamily: fonts.title, fontSize: 24, color: colors.cocoa },
  round: {
    width: minTouch, height: minTouch, borderRadius: radii.pill, backgroundColor: colors.vanilla,
    alignItems: 'center', justifyContent: 'center',
  },
});
