// The frames every screen uses.
// Page: a phone-width white column that fills the window, with the burnt orange line on top.
// Screen: a Page with a torn header (back arrow + title) over scrolling content.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Picture from './Picture';
import { art } from '../art';
import { MAX_WIDTH, colors, fonts, minTouch, spacing } from '../theme';
import Torn from './Torn';

export function Page({ children }: { children: ReactNode }) {
  return (
    <View style={styles.page}>
      <View style={styles.column}>
        {children}
        <View pointerEvents="none" style={styles.topLine} />
      </View>
    </View>
  );
}

export function IconButton({ icon, label, onPress }: { icon: 'chevron-back' | 'close'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.icon}>
      <Ionicons name={icon} size={30} color={colors.ink} />
    </Pressable>
  );
}

export function Header({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <Torn bottom style={styles.header}>
      {onBack && <IconButton icon="chevron-back" label="Back" onPress={onBack} />}
      <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
      <Picture source={art.horns} style={styles.horns} resizeMode="contain" />
    </Torn>
  );
}

type Props = { children: ReactNode; title?: string; onBack?: () => void };

export default function Screen({ children, title, onBack }: Props) {
  return (
    <Page>
      <Header title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', backgroundColor: colors.paper, overflow: 'hidden' },
  topLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 6, backgroundColor: colors.orange, zIndex: 5 },
  header: {
    height: 108, paddingTop: 40, paddingHorizontal: 20, paddingBottom: spacing.sm, flexDirection: 'row',
    alignItems: 'center', zIndex: 2, marginBottom: -6,
  },
  title: { flex: 1, fontFamily: fonts.title, fontSize: 30, color: colors.ink },
  horns: { width: 100, height: 24 },
  icon: { width: minTouch, height: minTouch, marginLeft: -14, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: spacing.lg, gap: spacing.md },
});
