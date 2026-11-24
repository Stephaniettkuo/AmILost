// One event: when, where, what, and either Directions (we know the room) or a link to the UTCS page.
import { Linking, StyleSheet, View } from 'react-native';
import Chip from '../components/Chip';
import { roomText } from '../components/EventCard';
import FloorMap from '../components/FloorMap';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import { Item, formatWhen } from '../calendar/events';
import { colors, fonts, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = {
  item: Item;
  graph: MapGraph;
  onBack: () => void;
  onDirections: () => void;
  onOpenOrg: (orgId: string) => void;
};

export default function EventDetailScreen({ item, graph, onBack, onDirections, onOpenOrg }: Props) {
  const node = item.room ? graph.nodes.find((n) => n.id === item.room) : undefined;
  const orgId = item.orgId;

  return (
    <Screen title="Event" onBack={onBack}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.when}>{formatWhen(item)}</Text>
      <View style={styles.row}>
        {!!item.orgName && <Chip label={item.orgName} onPress={orgId ? () => onOpenOrg(orgId) : undefined} />}
        {item.visibility === 'members' && <Chip label="Members only" small />}
      </View>

      <Text style={styles.room}>{roomText(item, graph)}</Text>
      {node ? (
        <>
          <FloorMap floorId={node.floor} focus={[node]} pin={node} style={styles.map} />
          <StampButton label="Directions" onPress={onDirections} />
        </>
      ) : (
        <>
          <Text style={styles.note}>Not on our map yet</Text>
          {item.url !== '' && <StampButton label="Open on UTCS calendar" variant="secondary" onPress={() => Linking.openURL(item.url)} />}
        </>
      )}
      {item.description.trim() !== '' && <Text style={styles.description}>{item.description.trim()}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.title, fontSize: 30, lineHeight: 34, color: colors.ink },
  when: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.rustDark },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  room: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
  map: { height: 220, borderWidth: 1, borderColor: colors.line },
  note: { fontFamily: fonts.body, fontSize: 15, color: colors.fadedInk },
  description: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
});
