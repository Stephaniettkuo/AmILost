// One event: when, where, what, and either Directions (we know the room) or a link to the UTCS page.
import { Linking, StyleSheet, View } from 'react-native';
import Chip from '../components/Chip';
import { roomText } from '../components/EventCard';
import FloorMap from '../components/FloorMap';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import { Item, formatWhen } from '../calendar/events';
import { groups } from '../data/groups';
import { colors, fonts, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = {
  item: Item;
  graph: MapGraph;
  followed: string[];
  onBack: () => void;
  onDirections: () => void;
  onOpenGroup: (groupId: string) => void;
  onToggleFollow: (groupId: string) => void;
};

export default function EventDetailScreen({ item, graph, followed, onBack, onDirections, onOpenGroup, onToggleFollow }: Props) {
  const group = groups.find((g) => g.id === item.groupId);
  const node = item.room ? graph.nodes.find((n) => n.id === item.room) : undefined;
  const following = !!group && followed.includes(group.id);

  return (
    <Screen title="Event" onBack={onBack}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.when}>{formatWhen(item)}</Text>
      {group && (
        <View style={styles.row}>
          <Chip label={group.name} onPress={() => onOpenGroup(group.id)} />
          <Chip label={following ? 'Following ✓' : 'Follow group'} selected={following} onPress={() => onToggleFollow(group.id)} />
        </View>
      )}
      {item.local && <Chip label="Posted by you" small />}

      <Text style={styles.room}>{roomText(item, graph)}</Text>
      {node ? (
        <>
          <FloorMap floorId={node.floor} focus={[node]} pin={node} style={styles.map} />
          <StampButton label="Directions" onPress={onDirections} />
        </>
      ) : (
        item.url !== '' && <StampButton label="Open on UTCS calendar" variant="secondary" onPress={() => Linking.openURL(item.url)} />
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
  description: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
});
