// Home: "Where to?" with a search box, the starting point, and a few quick searches.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Chip from '../components/Chip';
import PlaceSearch from '../components/PlaceSearch';
import Screen from '../components/Screen';
import { placeName } from '../names';
import { colors, fonts, minTouch, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = {
  graph: MapGraph;
  fromId: string;
  onChooseTo: (id: string) => void;
  onChangeFrom: (id: string) => void;
  onSettings: () => void;
};

// Quick searches: what the chip says, and what it types into the search box.
const QUICK: [string, string][] = [
  ['Restrooms', 'restroom'], ['Elevators', 'elevator'], ['Lecture hall 1.304', '1.304'], ['Front office', 'front office'],
];

export default function HomeScreen({ graph, fromId, onChooseTo, onChangeFrom, onSettings }: Props) {
  const [query, setQuery] = useState('');
  const [fromQuery, setFromQuery] = useState('');
  const [changingFrom, setChangingFrom] = useState(false);
  const from = graph.nodes.find((n) => n.id === fromId);

  return (
    <Screen
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings} style={styles.gear}>
          <Ionicons name="settings-outline" size={26} color={colors.cocoa} />
        </Pressable>
      }
    >
      <Text style={styles.title}>Where to?</Text>
      <PlaceSearch graph={graph} value={query} onChangeText={setQuery} onChoose={onChooseTo} />

      <View style={styles.row}>
        {QUICK.map(([label, text]) => <Chip key={label} label={label} onPress={() => setQuery(text)} />)}
      </View>

      <View style={styles.row}>
        <Chip
          label={`From: ${from ? placeName(from) : 'choose'}`}
          selected={changingFrom}
          onPress={() => { setChangingFrom(!changingFrom); setFromQuery(''); }}
          icon={<Ionicons name="location" size={16} color={colors.deepOrange} />}
        />
      </View>
      {changingFrom && (
        <>
          <Text style={styles.small}>Where are you now?</Text>
          <PlaceSearch
            graph={graph} value={fromQuery} onChangeText={setFromQuery} placeholder="Where are you?"
            onChoose={(id) => { onChangeFrom(id); setChangingFrom(false); }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.title, fontSize: 40, color: colors.cocoa, marginTop: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  small: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.latte },
  gear: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
});
