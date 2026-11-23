// Home: where you are ("From"), then "Where to?" with a search box and quick searches.
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Chip from '../components/Chip';
import PlaceSearch from '../components/PlaceSearch';
import Screen from '../components/Screen';
import WcIcon from '../components/WcIcon';
import { placeName } from '../names';
import { colors, fonts, minTouch, spacing } from '../theme';
import { MapGraph } from '../types';
import { wc } from '../watercolor';

type Props = {
  graph: MapGraph;
  fromId: string;
  onChooseTo: (id: string) => void;
  onChangeFrom: (id: string) => void;
  onSettings: () => void;
};

// Quick searches: what the chip says, and what it types into the search box.
// (Entrances and exits are the same kind of point in our map data, so they share one chip.)
const QUICK: [string, string][] = [
  ['Restrooms', 'restroom'], ['Elevators', 'elevator'], ['Stairs', 'stairs'], ['Entrances & exits', 'entrance'],
];

export default function HomeScreen({ graph, fromId, onChooseTo, onChangeFrom, onSettings }: Props) {
  const [query, setQuery] = useState('');
  const [fromQuery, setFromQuery] = useState('');
  const [changingFrom, setChangingFrom] = useState(false);
  const from = graph.nodes.find((n) => n.id === fromId);

  return (
    <Screen
      left={<Image source={wc.logo} accessible={false} style={styles.logo} resizeMode="contain" />}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings} style={styles.gear}>
          <WcIcon name="compass" size={44} />
        </Pressable>
      }
    >
      {/* Where you are: first, above where you're going. Tap to change it. */}
      <View style={styles.row}>
        <Chip
          label={`From: ${from ? placeName(from) : 'choose'}`}
          selected={changingFrom}
          onPress={() => { setChangingFrom(!changingFrom); setFromQuery(''); }}
          icon={<WcIcon name="pin" size={26} />}
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

      <Text style={styles.title}>Where to?</Text>
      <PlaceSearch graph={graph} value={query} onChangeText={setQuery} onChoose={onChooseTo} />

      <View style={styles.row}>
        {QUICK.map(([label, text]) => <Chip key={label} label={label} onPress={() => setQuery(text)} />)}
      </View>

      {!changingFrom && !query.trim() && (
        <Image source={wc.mascot} accessible={false} style={styles.mascot} resizeMode="contain" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.script, fontSize: 68, lineHeight: 84, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  small: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.fadedInk },
  gear: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 52, height: 52, flex: 0 },
  mascot: { width: 250, height: 207, alignSelf: 'center', marginTop: spacing.sm }, // same shape as the picture (640 x 530)
});
