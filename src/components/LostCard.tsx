// "No worries! What room are you near?" Places near the current step first, then a search box.
// Replaces the map while it is open (so nothing else on the screen moves).
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Text from './Text';
import StampButton from './StampButton';
import { floorLabel, placeTitle, searchPlaces } from '../names';
import { colors, fonts, minTouch, radii, spacing } from '../theme';
import { MapGraph, MapNode } from '../types';

type Props = {
  places: MapNode[];              // suggestions: near the current step, closest first
  graph: MapGraph;
  message: string | null;         // e.g. "We couldn't find a way from there."
  onPick: (id: string) => void;
  onCancel: () => void;
};

export default function LostCard({ places, graph, message, onPick, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const found = searchPlaces(graph.nodes, query, 6);

  const row = (n: MapNode) => (
    <Pressable key={n.id} accessibilityRole="button" accessibilityLabel={placeTitle(n)} onPress={() => onPick(n.id)} style={styles.row}>
      <Text style={styles.place} numberOfLines={1}>{placeTitle(n)}</Text>
      <Text style={styles.floor}>{floorLabel(n.floor)}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.card} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>No worries! What room are you near?</Text>
      {places.length > 0 && <View>{places.map(row)}</View>}
      <TextInput
        value={query} onChangeText={setQuery} placeholder="Search for a room" placeholderTextColor={colors.fadedInk}
        accessibilityLabel="Search for a room you are near" autoCapitalize="none" autoCorrect={false} style={styles.input}
      />
      {query.trim() !== '' && (found.length > 0 ? <View>{found.map(row)}</View> : <Text style={styles.note}>No match.</Text>)}
      <View style={styles.messageSlot}>{!!message && <Text style={styles.message} accessibilityRole="alert">{message}</Text>}</View>
      <StampButton label="Never mind" variant="secondary" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 30, color: colors.ink },
  row: { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  place: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  floor: { fontFamily: fonts.body, fontSize: 14, color: colors.fadedInk },
  input: { minHeight: minTouch, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, fontFamily: fonts.body, fontSize: 17, color: colors.ink, backgroundColor: colors.paper },
  note: { fontFamily: fonts.body, fontSize: 15, color: colors.fadedInk },
  messageSlot: { minHeight: 24, justifyContent: 'center' },
  message: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.rustDark },
});
