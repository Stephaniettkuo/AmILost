// One group: what it is, Follow / Following, and its upcoming events.
import { StyleSheet, View } from 'react-native';
import Chip from '../components/Chip';
import EventCard from '../components/EventCard';
import Screen from '../components/Screen';
import Text from '../components/Text';
import { Item } from '../calendar/events';
import { Group } from '../data/groups';
import { colors, fonts, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = {
  group: Group;
  items: Item[];                      // this group's upcoming events, earliest first
  graph: MapGraph;
  following: boolean;
  onBack: () => void;
  onOpen: (item: Item) => void;
  onToggleFollow: () => void;
};

export default function GroupScreen({ group, items, graph, following, onBack, onOpen, onToggleFollow }: Props) {
  return (
    <Screen title={group.name} onBack={onBack}>
      <Text style={styles.text}>{group.description}</Text>
      <View style={styles.row}>
        <Chip label={following ? 'Following ✓' : 'Follow group'} selected={following} onPress={onToggleFollow} />
      </View>
      <Text style={styles.heading}>Coming up</Text>
      {items.map((item) => <EventCard key={item.id} item={item} graph={graph} onPress={() => onOpen(item)} />)}
      {items.length === 0 && <Text style={styles.empty}>No upcoming events</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  row: { flexDirection: 'row' },
  heading: { fontFamily: fonts.script, fontSize: 26, color: colors.rustDark, marginTop: spacing.sm },
  empty: { fontFamily: fonts.title, fontSize: 22, color: colors.fadedInk, textAlign: 'center', paddingVertical: spacing.lg },
});
