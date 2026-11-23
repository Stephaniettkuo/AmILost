// The frame every screen uses: tea-stained paper behind everything, a phone-width column,
// and an optional header with a back arrow and a title.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { wc } from '../watercolor';
import { MAX_WIDTH, colors, fonts, minTouch, radii, shadow, spacing } from '../theme';

type Props = { children: ReactNode; title?: string; onBack?: () => void; left?: ReactNode; right?: ReactNode };

export default function Screen({ children, title, onBack, left, right }: Props) {
  return (
    <View style={styles.page}>
      {/* The watercolor paper (from the asset kit) stays put while the content scrolls. */}
      <Image source={wc.paper} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.column}>
          {(onBack || title || left || right) && (
            <View style={styles.header}>
              {onBack && (
                <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={[styles.round, shadow]}>
                  <Ionicons name="chevron-back" size={24} color={colors.ink} />
                </Pressable>
              )}
              {!onBack && left}
              <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
              {right}
            </View>
          )}
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingTop: 50, paddingBottom: spacing.xl },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouch },
  title: { flex: 1, fontFamily: fonts.title, fontSize: 30, color: colors.ink },
  round: {
    width: minTouch, height: minTouch, borderRadius: radii.pill, backgroundColor: colors.parchment,
    borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center',
  },
});
