// Find events: search (event or org name), a Day / Week / Month switch with a date strip, a "My orgs"
// filter, and the events grouped by day.
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Chip from '../components/Chip';
import EventCard from '../components/EventCard';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import { Item, Range, forOrgs, groupByDay, inRange, rangeLabel, search, shiftDate } from '../calendar/events';
import { austinNow } from '../calendar/time';
import { colors, fonts, minTouch, spacing } from '../theme';
import { MapGraph } from '../types';

// What the screen is showing. App keeps it, so coming back from an event keeps your place.
export type EventsView = { query: string; range: Range; date: Date; onlyMine: boolean };

type Props = {
  items: Item[];
  graph: MapGraph;
  myOrgIds: string[];               // orgs I belong to
  signedIn: boolean;
  view: EventsView;
  onView: (view: EventsView) => void;
  problem: string | null;           // why the events could not load (shown instead of "No events")
  loaded: boolean;                  // the first load has finished
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (item: Item) => void;
  onOrgs: () => void;
  onBack: () => void;
};

const RANGES: { range: Range; label: string }[] = [{ range: 'day', label: 'Day' }, { range: 'week', label: 'Week' }, { range: 'month', label: 'Month' }];

export default function EventsScreen({ items, graph, myOrgIds, signedIn, view, onView, problem, loaded, refreshing, onRefresh, onOpen, onOrgs, onBack }: Props) {
  const now = austinNow();
  const typed = view.query.trim() !== '';

  const pool = view.onlyMine ? forOrgs(items, myOrgIds) : items;
  // Searching looks at everything still to come (so "lecture" finds next week's lecture even in Week view).
  const shown = typed
    ? search(pool.filter((i) => i.end.getTime() > now.getTime()), view.query)
    : inRange(pool, view.range, view.date);
  const days = groupByDay(shown, now);

  const word = view.range;
  const empty = typed ? 'No matches'
    : view.onlyMine && !signedIn ? 'Sign in and join an organization to see its events here'
    : view.onlyMine && myOrgIds.length === 0 ? 'Join an organization to see its events here'
    : view.onlyMine ? `None from your organizations this ${word}`
    : `No events this ${word}`;

  return (
    <Screen title="Find events" onBack={onBack} refresh={{ refreshing, onRefresh }}>
      <TextInput
        value={view.query}
        onChangeText={(query) => onView({ ...view, query })}
        placeholder="Search events or organizations"
        placeholderTextColor={colors.fadedInk}
        accessibilityLabel="Search events or organizations"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />

      <View style={styles.chipRow}>
        {RANGES.map((r) => (
          <Chip key={r.range} label={r.label} selected={r.range === view.range} onPress={() => onView({ ...view, range: r.range })} style={styles.grow} />
        ))}
        <Chip label="My orgs" selected={view.onlyMine} onPress={() => onView({ ...view, onlyMine: !view.onlyMine })} />
      </View>

      {typed ? (
        <Text style={styles.strip}>Results from all upcoming events</Text>
      ) : (
        <View style={styles.stripRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Earlier ${word}`} onPress={() => onView({ ...view, date: shiftDate(view.date, view.range, -1) })} style={styles.arrow}>
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Go to today" onPress={() => onView({ ...view, date: now })} style={styles.stripLabel}>
            <Text style={styles.strip} numberOfLines={1}>{rangeLabel(view.range, view.date, now)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Later ${word}`} onPress={() => onView({ ...view, date: shiftDate(view.date, view.range, 1) })} style={styles.arrow}>
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
      )}

      {days.map((day) => (
        <View key={day.label + day.day.getTime()} style={styles.day}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          {day.items.map((item) => <EventCard key={item.id} item={item} graph={graph} onPress={() => onOpen(item)} />)}
        </View>
      ))}
      {days.length === 0 && !problem && <Text style={styles.empty}>{loaded ? empty : 'Loading…'}</Text>}

      {!!problem && <Text style={styles.source} accessibilityRole="alert">{problem}</Text>}
      <StampButton label="Organizations" variant="secondary" onPress={onOrgs} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: minTouch, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: 10,
    fontFamily: fonts.body, fontSize: 17, color: colors.ink, backgroundColor: colors.paper,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }, // wraps on 320 px phones
  grow: { flexGrow: 1, minWidth: 64, alignItems: 'center', paddingHorizontal: 6 },
  stripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stripLabel: { flex: 1, minHeight: minTouch, justifyContent: 'center' },
  strip: { fontFamily: fonts.title, fontSize: 24, color: colors.ink, textAlign: 'center' },
  arrow: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: fonts.bodyBold, fontSize: 32, lineHeight: 36, color: colors.rustDark },
  day: { gap: spacing.sm },
  dayLabel: { fontFamily: fonts.script, fontSize: 26, color: colors.rustDark },
  empty: { fontFamily: fonts.title, fontSize: 22, color: colors.fadedInk, textAlign: 'center', paddingVertical: spacing.lg },
  source: { fontFamily: fonts.body, fontSize: 13, color: colors.fadedInk, textAlign: 'center' },
});
