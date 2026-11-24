// The app shell: loads fonts, holds the current screen and the chosen From / To / options,
// and switches screens. Each screen is a file in src/screens/.
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { appFonts } from './src/fonts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Item, countByGroup, inRange, makeItems } from './src/calendar/events';
import { loadFollowing, saveFollowing, toggleFollow } from './src/calendar/following';
import { CalEvent } from './src/calendar/ics';
import { Source, loadEvents, sourceLabel } from './src/calendar/source';
import { addDays, austinNow, startOfDay } from './src/calendar/time';
import { gdcGraph } from './src/data/gdc';
import { groups } from './src/data/groups';
import { directions } from './src/directions';
import { placeTitle } from './src/names';
import { findRoute } from './src/routing';
import ArrivedScreen from './src/screens/ArrivedScreen';
import DirectionsScreen from './src/screens/DirectionsScreen';
import EditorScreen from './src/screens/EditorScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import EventsScreen, { EventsView } from './src/screens/EventsScreen';
import GroupScreen from './src/screens/GroupScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlaceScreen from './src/screens/PlaceScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Screen = 'home' | 'place' | 'preview' | 'directions' | 'arrived' | 'settings' | 'editor' | 'events' | 'event' | 'groups' | 'group';

// Where the phone's back button goes from each screen (Home has none: the app closes).
const BACK: Partial<Record<Screen, Screen>> = {
  place: 'home', preview: 'place', directions: 'preview', arrived: 'directions', settings: 'home', editor: 'settings',
  events: 'home', groups: 'events',   // 'event', 'group' and 'preview' depend on how you got there
};

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <Screens />
    </SafeAreaProvider>
  );
}

function Screens() {
  const [loaded] = useFonts(appFonts);
  const [screen, setScreen] = useState<Screen>('home');
  const [fromId, setFromId] = useState('GDC-2-entrance-main');
  const [toId, setToId] = useState<string | null>(null);
  const [avoidStairs, setAvoidStairs] = useState(false); // "Elevator only"
  const [stepIndex, setStepIndex] = useState(0);

  // ---- Events ----
  const [calendar, setCalendar] = useState<{ events: CalEvent[]; source: Source } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [followed, setFollowed] = useState<string[]>([]);
  const changedFollowing = useRef(false); // true once the user follows/unfollows, so a slow load can't undo it
  const [eventsView, setEventsView] = useState<EventsView>(() => ({ query: '', range: 'week', date: austinNow(), onlyFollowing: false }));
  const [eventItem, setEventItem] = useState<Item | null>(null);   // the event being looked at
  const [groupId, setGroupId] = useState<string | null>(null);     // the group being looked at
  const [eventBack, setEventBack] = useState<Screen>('events');    // where Back goes from an event
  const [groupBack, setGroupBack] = useState<Screen>('groups');    // where Back goes from a group page
  const [previewBack, setPreviewBack] = useState<'place' | 'event'>('place'); // where Back goes from Route preview

  const reloadCalendar = useCallback(async () => {
    setRefreshing(true);
    setCalendar(await loadEvents());
    setRefreshing(false);
  }, []);
  useEffect(() => {
    reloadCalendar();
    loadFollowing().then((saved) => { if (!changedFollowing.current) setFollowed(saved); });
  }, [reloadCalendar]);

  const follow = (id: string) => {
    changedFollowing.current = true;
    const next = toggleFollow(followed, id);
    setFollowed(next);
    saveFollowing(next);
  };

  // Every event from 30 days ago to a year ahead, repeats expanded (rebuilt when the calendar reloads).
  const items = useMemo(() => {
    if (!calendar) return [];
    const today = startOfDay(austinNow());
    return makeItems(calendar.events, addDays(today, -30), addDays(today, 365), gdcGraph);
  }, [calendar]);
  const upcoming = useMemo(() => { const now = austinNow(); return items.filter((i) => i.end.getTime() > now.getTime()); }, [items]);
  const eventsToday = useMemo(() => {
    const now = austinNow();
    return inRange(upcoming, 'day', now).length;
  }, [upcoming]);
  const groupCounts = useMemo(() => {
    const limit = addDays(austinNow(), 90).getTime();
    return countByGroup(upcoming.filter((i) => i.start.getTime() < limit));
  }, [upcoming]);

  const route = useMemo(
    () => (toId ? findRoute(gdcGraph, fromId, toId, { avoidStairs }) : null),
    [fromId, toId, avoidStairs],
  );
  const steps = useMemo(() => (route ? directions(route) : []), [route]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const back = screen === 'event' ? eventBack : screen === 'group' ? groupBack : screen === 'preview' ? previewBack : BACK[screen];
      if (!back) return false; // let the phone close the app
      setScreen(back);
      return true;
    });
    return () => sub.remove();
  }, [screen, eventBack, groupBack, previewBack]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.paper }} />; // plain white until fonts are ready

  const from = gdcGraph.nodes.find((n) => n.id === fromId);
  const place = toId ? gdcGraph.nodes.find((n) => n.id === toId) : undefined;

  switch (screen) {
    case 'place':
      if (!place) break;
      return <PlaceScreen place={place} from={from} onBack={() => setScreen('home')} onDirections={() => { setPreviewBack('place'); setScreen('preview'); }} />;
    case 'preview':
      if (!place) break;
      return (
        <PreviewScreen
          route={route} place={place} from={from} avoidStairs={avoidStairs} onAvoidStairs={setAvoidStairs}
          onBack={() => setScreen(previewBack)} onStart={() => { setStepIndex(0); setScreen('directions'); }}
        />
      );
    case 'directions':
      if (!route || steps.length === 0) break;
      return (
        <DirectionsScreen
          route={route} steps={steps} toName={placeTitle(route.nodes[route.nodes.length - 1])} index={Math.min(stepIndex, steps.length - 1)} onIndex={setStepIndex}
          onBack={() => setScreen('preview')} onArrive={() => setScreen('arrived')}
        />
      );
    case 'arrived':
      if (!place) break;
      return (
        <ArrivedScreen
          place={place}
          onDone={() => { setToId(null); setScreen('home'); }}
          onDirectionsBack={() => { setFromId(place.id); setToId(fromId); setScreen('preview'); }}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          avoidStairs={avoidStairs} onAvoidStairs={setAvoidStairs}
          onBack={() => setScreen('home')} onEditor={() => setScreen('editor')}
        />
      );
    case 'editor':
      return <EditorScreen onBack={() => setScreen('settings')} />;
    case 'events':
      return (
        <EventsScreen
          items={items} graph={gdcGraph} followed={followed} view={eventsView} onView={setEventsView}
          sourceText={calendar ? sourceLabel(calendar.source) : 'Loading…'} refreshing={refreshing} onRefresh={reloadCalendar}
          onOpen={(item) => { setEventItem(item); setEventBack('events'); setScreen('event'); }}
          onGroups={() => setScreen('groups')} onBack={() => setScreen('home')}
        />
      );
    case 'event':
      if (!eventItem) break;
      return (
        <EventDetailScreen
          item={eventItem} graph={gdcGraph} followed={followed} onBack={() => setScreen(eventBack)}
          onDirections={() => { setToId(eventItem.room); setPreviewBack('event'); setScreen('preview'); }}
          onOpenGroup={(id) => { setGroupId(id); setGroupBack('event'); setScreen('group'); }} onToggleFollow={follow}
        />
      );
    case 'groups':
      return (
        <GroupsScreen
          counts={groupCounts} followed={followed} onBack={() => setScreen('events')}
          onOpenGroup={(id) => { setGroupId(id); setGroupBack('groups'); setScreen('group'); }} onToggleFollow={follow}
        />
      );
    case 'group': {
      const group = groups.find((g) => g.id === groupId);
      if (!group) break;
      return (
        <GroupScreen
          group={group} items={upcoming.filter((i) => i.groupId === group.id)} graph={gdcGraph}
          following={followed.includes(group.id)} onBack={() => setScreen(groupBack)}
          onOpen={(item) => { setEventItem(item); setEventBack('group'); setScreen('event'); }}
          onToggleFollow={() => follow(group.id)}
        />
      );
    }
  }
  return (
    <HomeScreen
      graph={gdcGraph} fromId={fromId}
      onChooseTo={(id) => { setToId(id); setScreen('place'); }}
      onChangeFrom={setFromId}
      onSettings={() => setScreen('settings')}
      eventsToday={eventsToday} onEvents={() => setScreen('events')}
    />
  );
}
