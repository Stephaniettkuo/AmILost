// Organizations: every org (anyone can see these), with a search box.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Chip from '../components/Chip';
import Screen from '../components/Screen';
import Text from '../components/Text';
import { listOrgs } from '../orgs/orgData';
import { Org, friendlyDbError, searchOrgs } from '../orgs/orgRules';
import { colors, fonts, minTouch, radii, spacing } from '../theme';

type Props = { onBack: () => void; onOpen: (org: Org) => void };

export default function OrgsScreen({ onBack, onOpen }: Props) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setOrgs(await listOrgs()); setProblem(null); }
    catch (error) { setProblem(friendlyDbError(error)); setOrgs((old) => old ?? []); }
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = orgs ? searchOrgs(orgs, query) : [];
  return (
    <Screen title="Organizations" onBack={onBack} refresh={{ refreshing, onRefresh: load }}>
      <TextInput
        value={query} onChangeText={setQuery} placeholder="Search organizations" placeholderTextColor={colors.fadedInk}
        accessibilityLabel="Search organizations" autoCapitalize="none" autoCorrect={false} style={styles.input}
      />
      {orgs === null && <ActivityIndicator color={colors.rustDark} />}
      {!!problem && <Text style={styles.note}>{problem}</Text>}
      {orgs !== null && !problem && shown.length === 0 && (
        <Text style={styles.note}>{orgs.length === 0 ? 'No organizations yet.' : 'No organizations match.'}</Text>
      )}
      {shown.map((org) => (
        <Pressable key={org.id} accessibilityRole="button" accessibilityLabel={org.name} onPress={() => onOpen(org)} style={styles.card}>
          <Text style={styles.name}>{org.name}</Text>
          {!!org.short && <Text style={styles.short} numberOfLines={2}>{org.short}</Text>}
          <View style={styles.row}>
            {org.isPrivate && <Chip label="Private" small />}
            {!org.claimed && <Text style={styles.faded}>Not yet claimed by this org</Text>}
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: minTouch, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card,
    fontFamily: fonts.body, fontSize: 17, color: colors.ink, backgroundColor: colors.paper,
  },
  note: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.fadedInk },
  card: { minHeight: 76, padding: spacing.md, gap: 4, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  name: { fontFamily: fonts.title, fontSize: 24, color: colors.ink },
  short: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  faded: { fontFamily: fonts.body, fontSize: 14, color: colors.fadedInk },
});
