// Place: the chosen room on its floor plan, with a paper note: its name, floor, and Directions.
import { StyleSheet, Text, View } from 'react-native';
import Picture from '../components/Picture';
import { art } from '../art';
import FloorMap from '../components/FloorMap';
import { Header, Page } from '../components/Screen';
import StampButton from '../components/StampButton';
import Torn from '../components/Torn';
import { floorLabel, placeTitle } from '../names';
import { colors, fonts, spacing } from '../theme';
import { MapNode } from '../types';

type Props = { place: MapNode; from?: MapNode; onBack: () => void; onDirections: () => void };

export default function PlaceScreen({ place, from, onBack, onDirections }: Props) {
  return (
    <Page>
      <Header title={floorLabel(place.floor)} onBack={onBack} />
      <FloorMap floorId={place.floor} focus={[place]} pin={place} style={styles.map} />
      <Torn top style={styles.note}>
        <Text style={styles.script}>your next stop</Text>
        <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>{placeTitle(place)}</Text>
        <Text style={styles.text}>{floorLabel(place.floor)}{from ? ` · from ${placeTitle(from)}` : ''}</Text>
        {place.aliases && place.aliases.length > 0 && (
          <Text style={styles.text}>Also called: {place.aliases.join(', ')}</Text>
        )}
        <View style={styles.row}>
          <StampButton label="Directions" onPress={onDirections} style={styles.flex} />
          <Picture source={art.seal} style={styles.seal} resizeMode="contain" />
        </View>
      </Torn>
    </Page>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  note: { marginTop: -6, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28, gap: spacing.xs },
  script: { fontFamily: fonts.script, fontSize: 27, color: colors.rustDark },
  name: { fontFamily: fonts.title, fontSize: 38, color: colors.ink },
  text: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  flex: { flex: 1 },
  seal: { width: 88, height: 88 },
});
