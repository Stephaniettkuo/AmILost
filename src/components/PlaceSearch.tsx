// A big friendly search box with results underneath. Used for "Where to?" and for changing the start.
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { floorLabel, placeName, searchPlaces } from '../names';
import { colors, fonts, minTouch, radii, shadow, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = {
  graph: MapGraph;
  value: string;
  onChangeText: (text: string) => void;
  onChoose: (id: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function PlaceSearch({ graph, value, onChangeText, onChoose, placeholder, autoFocus }: Props) {
  const matches = useMemo(() => searchPlaces(graph.nodes, value), [graph, value]);
  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Room number or name'}
        placeholderTextColor={colors.fadedInk}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="go"
        onSubmitEditing={() => matches[0] && onChoose(matches[0].id)}
        style={[styles.input, shadow]}
      />
      {matches.map((n) => (
        <Pressable key={n.id} accessibilityRole="button" onPress={() => onChoose(n.id)} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{placeName(n)}</Text>
          <Text style={styles.floor}>{floorLabel(n.floor)}</Text>
        </Pressable>
      ))}
      {value.trim() !== '' && matches.length === 0 && (
        <Text style={styles.none}>Hmm, can't find that room. Try its number, like 2.316.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  input: {
    minHeight: 56, borderRadius: radii.pill, backgroundColor: colors.parchment, paddingHorizontal: spacing.lg,
    fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink, borderWidth: 1, borderColor: colors.line,
  },
  row: {
    minHeight: minTouch + 4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, borderRadius: radii.small, backgroundColor: colors.parchment,
    borderWidth: 1, borderColor: colors.line,
  },
  name: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 21, color: colors.ink },
  floor: { fontFamily: fonts.label, fontSize: 12, color: colors.fadedInk },
  none: { fontFamily: fonts.body, fontSize: 20, color: colors.fadedInk, paddingHorizontal: spacing.sm },
});
