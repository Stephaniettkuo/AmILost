// One event in a list: title, time, the org, a "Members only" badge, and the room (or the place text).
import { Pressable, StyleSheet, View } from 'react-native';
import Chip from './Chip';
import Text from './Text';
import { Item, formatTime } from '../calendar/events';
import { floorLabel, placeTitle } from '../names';
import { colors, fonts, radii, spacing } from '../theme';
import { MapGraph } from '../types';

// "GDC 2.216 · Floor 2", "Room not listed", or "PAI 3.02 · not on our map".
export function roomText(item: Item, graph: MapGraph): string {
  const node = item.room ? graph.nodes.find((n) => n.id === item.room) : undefined;
  if (node) return `${placeTitle(node)} · ${floorLabel(node.floor)}`;
  return item.location ? `${item.location} · not on our map` : 'Room not listed';
}

type Props = { item: Item; graph: MapGraph; onPress: () => void };

export default function EventCard({ item, graph, onPress }: Props) {
  const listed = !!item.room;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={styles.card}>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.time}>{formatTime(item)}</Text>
      <View style={styles.row}>
        {!!item.orgName && <Chip label={item.orgName} small />}
        {item.visibility === 'members' && <Chip label="Members only" small />}
        <Text style={[styles.room, !listed && styles.faded]} numberOfLines={1}>{roomText(item, graph)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76, padding: spacing.md, gap: 4, borderRadius: radii.card,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper,
  },
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 26, color: colors.ink },
  time: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.rustDark },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  room: { flexShrink: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  faded: { color: colors.fadedInk },
});
