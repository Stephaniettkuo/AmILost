// Home: "Where to?" over a slideshow of GDC. Tapping a chip or "View map" shows the floor plan
// instead. The white sheet at the bottom lists places and slides up for searching.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Text from '../components/Text';
import Picture from '../components/Picture';
import { art } from '../art';
import FloorMap from '../components/FloorMap';
import FloorPicker from '../components/FloorPicker';
import { Page } from '../components/Screen';
import Slideshow from '../components/Slideshow';
import StampButton from '../components/StampButton';
import Torn from '../components/Torn';
import { gdcFloors } from '../data/floors';
import { useReduceMotion } from '../motion';
import { floorLabel, placeTitle, searchPlaces } from '../names';
import { useEdges } from '../safeArea';
import { colors, fonts, minTouch, spacing } from '../theme';
import { MapGraph, MapNode } from '../types';

type Props = {
  graph: MapGraph;
  fromId: string;
  onChooseTo: (id: string) => void;
  onChangeFrom: (id: string) => void;
  onSettings: () => void;
};

// The four chips, their picture, and which places they mean.
const CATEGORIES = [
  { name: 'Restrooms', picture: art.door, has: (n: MapNode) => /restroom/i.test(n.label ?? '') },
  { name: 'Elevators', picture: art.elevator, has: (n: MapNode) => n.kind === 'elevator' },
  { name: 'Stairs', picture: art.stairs, has: (n: MapNode) => n.kind === 'stairs' },
  { name: 'Entrances', picture: art.entrance, has: (n: MapNode) => n.kind === 'entrance' },
];

// Shown before anything is typed.
const SUGGESTED = ['GDC-1.304', 'GDC-2.216', 'GDC-2.100', 'GDC-2.302', 'GDC-3.304', 'GDC-2.202', 'GDC-2.2E2'];
const FLOORS = gdcFloors.map((f) => f.id);
const SHEET = 274; // height of the sheet at rest

export default function HomeScreen({ graph, fromId, onChooseTo, onChangeFrom, onSettings }: Props) {
  const { top, width, height: appHeight } = useEdges();
  const narrow = width < 376; // small phones: smaller lettering
  const headerHeight = top + 66;
  const sheetHeight = Math.min(SHEET, Math.round(appHeight * 0.36)); // a bit shorter on short phones
  const reduce = useReduceMotion();
  const from = graph.nodes.find((n) => n.id === fromId);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);           // the sheet is pulled up
  const [picking, setPicking] = useState(false);     // choosing the starting point instead of the destination
  const [showMap, setShowMap] = useState(false);
  const [floor, setFloor] = useState(from?.floor ?? 'GDC-2');
  const [category, setCategory] = useState<string | null>(null);

  const chip = CATEGORIES.find((c) => c.name === category);
  const onFloor = useMemo(
    () => (chip ? graph.nodes.filter((n) => n.floor === floor && chip.has(n)) : []),
    [chip, floor, graph],
  );
  // With no chip picked, show the building itself (not the blank edges of the plan image).
  const wholeFloor = useMemo(() => graph.nodes.filter((n) => n.floor === floor), [floor, graph]);
  const typed = query.trim() !== '';
  const list = typed ? searchPlaces(graph.nodes, query, 12)
    : chip ? onFloor
    : SUGGESTED.flatMap((id) => graph.nodes.find((n) => n.id === id) ?? []);
  const heading = picking ? 'Where are you now?' : typed ? 'Results' : chip ? `${chip.name} on ${floorLabel(floor).toLowerCase()}` : 'Places in GDC';

  // The sheet slides between its two heights.
  const height = useRef(new Animated.Value(sheetHeight)).current;
  const target = open ? Math.max(sheetHeight, appHeight - headerHeight - 84) : sheetHeight;
  useEffect(() => {
    Animated.timing(height, { toValue: target, duration: reduce ? 0 : 250, useNativeDriver: false }).start();
  }, [height, reduce, target]);

  const choose = (id: string) => {
    if (!picking) { onChooseTo(id); return; }
    const picked = graph.nodes.find((n) => n.id === id);
    onChangeFrom(id);
    if (picked) setFloor(picked.floor);
    setPicking(false); setQuery(''); setOpen(false);
  };
  const tapChip = (name: string) => {
    const on = category !== name;
    setCategory(on ? name : null); setShowMap(on); setQuery(''); setOpen(false);
  };
  const closeMap = () => { setShowMap(false); setCategory(null); };

  return (
    <Page>
      <View style={[styles.back, { top: headerHeight - 10, bottom: sheetHeight - 8 }, showMap && styles.tan]}>
        {showMap ? (
          <FloorMap floorId={floor} focus={onFloor.length > 0 ? onFloor : wholeFloor} marks={onFloor}
            you={from?.floor === floor ? from : undefined} style={styles.map} />
        ) : (
          <Slideshow bottom={26} narrow={narrow} />
        )}
        {!showMap && <StampButton label="View map" small onPress={() => setShowMap(true)} style={styles.viewMap} />}
      </View>

      <Torn bottom style={[styles.header, { height: headerHeight, paddingTop: top - 4 }]}>
        <View style={styles.flex}>
          <Text style={styles.script}>find your way in</Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]} numberOfLines={1} adjustsFontSizeToFit>Gates Dell Complex</Text>
        </View>
        <Picture source={art.horns} style={[styles.horns, narrow && styles.hornsNarrow]} resizeMode="contain" />
      </Torn>

      <Torn top bottom style={styles.search}>
        <Picture source={art.search} style={styles.searchIcon} resizeMode="contain" />
        <View style={styles.flex}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => { setOpen(true); closeMap(); }}
            placeholder={picking ? 'Where are you?' : 'Where to?'}
            placeholderTextColor={colors.fadedInk}
            accessibilityLabel="Search for a room or place"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => typed && list[0] && choose(list[0].id)}
            style={styles.input}
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings} style={styles.gear}>
          <Picture source={art.settings} style={styles.gearIcon} resizeMode="contain" />
        </Pressable>
      </Torn>

      {!open && (
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.name} accessibilityRole="button" accessibilityLabel={c.name}
              accessibilityState={{ selected: c.name === category }} onPress={() => tapChip(c.name)} style={styles.flex}
            >
              <Torn top bottom fill={c.name === category ? colors.wash : colors.paper} style={styles.chip}>
                <Picture source={c.picture} style={styles.chipIcon} resizeMode="contain" />
                <Text style={[styles.chipText, narrow && styles.chipNarrow]} numberOfLines={1} adjustsFontSizeToFit>{c.name}</Text>
              </Torn>
            </Pressable>
          ))}
        </View>
      )}

      {showMap && !open && (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Close map" onPress={closeMap} style={[styles.closeMap, { top: headerHeight + 166 }]}>
            <Torn top bottom style={styles.closeBox}><Text style={styles.link}>Close map</Text></Torn>
          </Pressable>
          <FloorPicker floors={FLOORS} selected={floor} onSelect={setFloor} row style={[styles.picker, { bottom: sheetHeight + 4, width: Math.min(344, width - 16) }]} />
        </>
      )}

      <Animated.View style={[styles.sheet, { height }]}>
        <Torn top style={styles.sheetPaper}>
          <Pressable
            accessibilityRole="button" accessibilityLabel={open ? 'Show fewer places' : 'Show more places'}
            onPress={() => setOpen(!open)} style={styles.handle}
          >
            <View style={styles.handleBar} />
          </Pressable>
          <View style={styles.fromRow}>
            <Text style={styles.from} numberOfLines={1}>From <Text style={styles.bold}>{from ? placeTitle(from) : 'choose a start'}</Text></Text>
            <Pressable
              accessibilityRole="button" accessibilityLabel={picking ? 'Cancel changing the start' : 'Change the start'}
              onPress={() => { setPicking(!picking); setQuery(''); setOpen(!picking); closeMap(); }} style={styles.change}
            >
              <Text style={styles.link}>{picking ? 'Cancel' : 'Change'}</Text>
            </Pressable>
          </View>
          <View style={styles.headingRow}>
            <View style={styles.flex}>
              <Text style={[styles.heading, narrow && styles.headingNarrow]} numberOfLines={1} adjustsFontSizeToFit>{heading}</Text>
              <View style={styles.rule} />
            </View>
            <Picture source={art.guide} style={styles.guide} resizeMode="contain" />
          </View>
          <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {list.map((n) => (
              <Pressable key={n.id} accessibilityRole="button" onPress={() => choose(n.id)} style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{placeTitle(n)}</Text>
                <Text style={styles.small}>{floorLabel(n.floor)}</Text>
              </Pressable>
            ))}
            {list.length === 0 && (
              <View style={styles.none}>
                <Picture source={art.calf} style={styles.calf} resizeMode="contain" />
                <Text style={styles.noneText}>{typed ? "Hmm, I can't find that one." : 'None marked on this floor yet.'}</Text>
                {typed && <Text style={styles.small}>Try a room number, like 2.316.</Text>}
              </View>
            )}
          </ScrollView>
        </Torn>
      </Animated.View>
    </Page>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.paper },
  tan: { backgroundColor: colors.map },
  map: { flex: 1, marginTop: 168, marginBottom: 62 }, // between the chips and the floor buttons
  viewMap: { position: 'absolute', right: 16, bottom: 22, width: 138 },
  header: {
    paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8,
  },
  script: { fontFamily: fonts.script, fontSize: 24, lineHeight: 28, color: colors.rustDark, paddingLeft: 4 },
  title: { fontFamily: fonts.title, fontSize: 27, lineHeight: 32, color: colors.ink },
  horns: { width: 100, height: 24, marginBottom: 6 },
  search: { marginTop: 10, marginHorizontal: 16, height: 58, flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  searchIcon: { width: 42, height: 40 },
  input: { width: '100%', height: 54, paddingHorizontal: 10, fontFamily: fonts.title, fontSize: 23, color: colors.ink },
  gear: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  gearIcon: { width: 38, height: 36 },
  chips: { marginTop: 10, marginHorizontal: 16, flexDirection: 'row', gap: 6 },
  chip: { height: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, gap: 2 },
  chipIcon: { width: 50, height: 48 },
  titleNarrow: { fontSize: 23 },
  hornsNarrow: { width: 70 },
  chipNarrow: { fontSize: 13.5 },
  headingNarrow: { fontSize: 21 },
  chipText: { fontFamily: fonts.title, fontSize: 16, color: colors.ink },
  closeMap: { position: 'absolute', left: 16 },
  closeBox: { height: minTouch, paddingHorizontal: 14, justifyContent: 'center' },
  picker: { position: 'absolute', alignSelf: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3 },
  sheetPaper: { flex: 1, paddingHorizontal: 20 },
  handle: { height: 32, alignItems: 'center', justifyContent: 'center' },
  handleBar: { width: 44, height: 3, backgroundColor: colors.fadedInk },
  fromRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.line },
  from: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  bold: { fontFamily: fonts.bodyBold },
  change: { minHeight: minTouch, minWidth: minTouch, justifyContent: 'center', alignItems: 'flex-end' },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.rustDark },
  headingRow: { height: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { fontFamily: fonts.title, fontSize: 27, color: colors.ink },
  rule: { width: 150, height: 2, backgroundColor: colors.orange, marginTop: 4 },
  guide: { width: 88, height: 70 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderColor: colors.line },
  name: { flex: 1, fontFamily: fonts.label, fontSize: 17, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 14, color: colors.fadedInk },
  none: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  calf: { width: 170, height: 128 },
  noneText: { fontFamily: fonts.title, fontSize: 24, color: colors.ink },
});
