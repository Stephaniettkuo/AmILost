// Groups: every group we recognize, how many events it has coming up, and Follow / Following.
import { Pressable, StyleSheet, View } from 'react-native';
import Chip from '../components/Chip';
import Screen from '../components/Screen';
import Text from '../components/Text';
import { groups } from '../data/groups';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  counts: Record<string, number>;     // upcoming events per group id
  followed: string[];
  onBack: () => void;
  onOpenGroup: (groupId: string) => void;
  onToggleFollow: (groupId: string) => void;
};

export default function GroupsScreen({ counts, followed, onBack, onOpenGroup, onToggleFollow }: Props) {
  return (
    <Screen title="Groups" onBack={onBack}>
      {groups.map((g) => {
        const following = followed.includes(g.id);
        const n = counts[g.id] ?? 0;
        return (
          <View key={g.id} style={styles.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={g.name} onPress={() => onOpenGroup(g.id)} style={styles.info}>
              <Text style={styles.name}>{g.name}</Text>
              <Text style={styles.text}>{g.description}</Text>
              <Text style={styles.count}>{n === 0 ? 'No upcoming events' : `${n} upcoming event${n === 1 ? '' : 's'}`}</Text>
            </Pressable>
            <Chip label={following ? 'Following ✓' : 'Follow'} selected={following} onPress={() => onToggleFollow(g.id)} />
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md,
    borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper,
  },
  info: { flex: 1, gap: 2, minHeight: 56, justifyContent: 'center' },
  name: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.fadedInk },
  count: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.rustDark },
});
