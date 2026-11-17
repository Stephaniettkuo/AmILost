// Place: one room, with its name, floor, other names, and a small map with a pin.
import { StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import Chip from '../components/Chip';
import FloorMap from '../components/FloorMap';
import StampButton from '../components/StampButton';
import Screen from '../components/Screen';
import { floorLabel, placeName } from '../names';
import { colors, fonts, spacing } from '../theme';
import { MapNode } from '../types';

type Props = { place: MapNode; onBack: () => void; onDirections: () => void };

export default function PlaceScreen({ place, onBack, onDirections }: Props) {
  return (
    <Screen onBack={onBack}>
      <Card>
        <Text style={styles.name}>{placeName(place)}</Text>
        <View style={styles.row}>
          <Chip label={floorLabel(place.floor)} />
          <Chip label={place.kind} />
        </View>
        {place.aliases && place.aliases.length > 0 && (
          <Text style={styles.also}>Also called: {place.aliases.join(', ')}</Text>
        )}
      </Card>
      <FloorMap floorId={place.floor} focus={[place]} pin={place} />
      <StampButton label="Directions" onPress={onDirections} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.title, fontSize: 38, color: colors.ink },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  also: { fontFamily: fonts.body, fontSize: 19, color: colors.fadedInk, marginTop: spacing.sm },
});
