// The app shell: loads fonts, holds the current screen and the chosen From / To / options,
// and switches screens. Each screen is a file in src/screens/.
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { appFonts } from './src/fonts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { BackHandler, View } from 'react-native';
import { signOutUser, watchUser } from './src/accounts';
import { Item, inRange } from './src/calendar/events';
import { austinNow } from './src/calendar/time';
import { gdcGraph } from './src/data/gdc';
import { groups } from './src/data/groups';
import { directions } from './src/directions';
import { reroute } from './src/lost';
import { placeTitle } from './src/names';
import { findRoute } from './src/routing';
import ArrivedScreen from './src/screens/ArrivedScreen';
import DirectionsScreen from './src/screens/DirectionsScreen';
import EditorScreen from './src/screens/EditorScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import AccountScreen from './src/screens/AccountScreen';
import AuthScreen from './src/screens/AuthScreen';
import ImportScreen from './src/screens/ImportScreen';
import OrgAdminScreen from './src/screens/OrgAdminScreen';
import OrgScreen from './src/screens/OrgScreen';
import OrgsScreen from './src/screens/OrgsScreen';
import PostEventScreen from './src/screens/PostEventScreen';
import { itemsFromOrgEvents } from './src/orgs/eventItems';
import { FindData, loadFindEvents } from './src/orgs/findEvents';
import { getOrg } from './src/orgs/orgData';
import { Org, friendlyDbError } from './src/orgs/orgRules';
import EventsScreen, { EventsView } from './src/screens/EventsScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlaceScreen from './src/screens/PlaceScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Screen = 'home' | 'place' | 'preview' | 'directions' | 'arrived' | 'settings' | 'editor' | 'events' | 'event' | 'auth' | 'account' | 'orgs' | 'org' | 'orgAdmin' | 'postEvent' | 'import';

// Where the phone's back button goes from each screen (Home has none: the app closes).
const BACK: Partial<Record<Screen, Screen>> = {
  place: 'home', preview: 'place', directions: 'preview', arrived: 'directions', settings: 'home', editor: 'settings', auth: 'settings', account: 'settings', orgs: 'account', orgAdmin: 'org', postEvent: 'orgAdmin', import: 'orgAdmin',
  events: 'home',   // 'event', 'org' and 'preview' depend on how you got there
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
  const [refreshing, setRefreshing] = useState(false);
  const [eventsProblem, setEventsProblem] = useState<string | null>(null); // why the org events could not load
  const [eventsView, setEventsView] = useState<EventsView>(() => ({ query: '', range: 'week', date: austinNow(), onlyMine: false }));
  const [eventItem, setEventItem] = useState<Item | null>(null);   // the event being looked at
  const [eventBack, setEventBack] = useState<Screen>('events');    // where Back goes from an event
  const [previewBack, setPreviewBack] = useState<'place' | 'event'>('place'); // where Back goes from Route preview

  // Orgs: which one is open, the org being administered, the event being edited, and where Back goes from an org page.
  const [orgId, setOrgId] = useState<string | null>(null);
  const [adminOrg, setAdminOrg] = useState<Org | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [orgBack, setOrgBack] = useState<Screen>('orgs');
  const [orgsBack, setOrgsBack] = useState<Screen>('account'); // where Back goes from the Organizations list
  // Who is signed in (null = nobody). Signing in is optional; nothing else waits for this.
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    try { return watchUser(setUser); } catch { return undefined; }
  }, []);

  // Events from organizations (Firebase). An extra: if it fails or nobody is signed in, the list just has
  // public events (or none) and everything else in the app keeps working.
  const [findData, setFindData] = useState<FindData | null>(null);
  const uid = user?.uid ?? null;
  const reloadOrgEvents = useCallback(async () => {
    setRefreshing(true);
    try { setFindData(await loadFindEvents(uid)); setEventsProblem(null); }
    catch (error) { setEventsProblem(friendlyDbError(error)); } // offline or Firebase down: no org events
    setRefreshing(false);
  }, [uid]);
  // Reload when the person changes, and each time Find events opens (they may have just joined an org).
  useEffect(() => { reloadOrgEvents(); }, [reloadOrgEvents]);
  useEffect(() => { if (screen === 'events') reloadOrgEvents(); }, [screen, reloadOrgEvents]);

  // Events from organizations only (the UTCS feed is gone).
  const allItems = useMemo(() => (findData ? itemsFromOrgEvents(findData.events, findData.orgs) : []), [findData]);
  const upcoming = useMemo(() => { const now = austinNow(); return allItems.filter((i) => i.end.getTime() > now.getTime()); }, [allItems]);
  const eventsToday = useMemo(() => {
    const now = austinNow();
    return inRange(upcoming, 'day', now).length;
  }, [upcoming]);

  const route = useMemo(
    () => (toId ? findRoute(gdcGraph, fromId, toId, { avoidStairs }) : null),
    [fromId, toId, avoidStairs],
  );
  const steps = useMemo(() => (route ? directions(route) : []), [route]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const back = screen === 'org' ? orgBack : screen === 'event' ? eventBack : screen === 'preview' ? previewBack : BACK[screen];
      if (!back) return false; // let the phone close the app
      setScreen(back);
      return true;
    });
    return () => sub.remove();
  }, [screen, orgBack, eventBack, previewBack]);

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
          graph={gdcGraph}
          onLost={(pickedId) => {
            // "I'm lost": the picked place becomes the new start, same destination, same Elevator-only setting.
            const result = reroute(gdcGraph, route, pickedId, avoidStairs);
            if (result.kind === 'route') { setFromId(pickedId); setStepIndex(0); return 'route'; }
            if (result.kind === 'arrived') { setScreen('arrived'); return 'arrived'; }
            return 'none';
          }}
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
          signedInAs={user ? user.displayName || user.email || 'Signed in' : null}
          onAccount={() => setScreen(user ? 'account' : 'auth')}
        />
      );
    case 'auth':
      return <AuthScreen onBack={() => setScreen('settings')} onDone={() => setScreen('account')} />;
    case 'account':
      if (!user) break;
      return (
        <AccountScreen
          name={user.displayName ?? ''} email={user.email ?? ''} uid={user.uid} onBack={() => setScreen('settings')}
          onOrgs={() => { setOrgsBack('account'); setScreen('orgs'); }}
          onOpenOrg={(id) => { setOrgId(id); setOrgBack('account'); setScreen('org'); }}
          onSignOut={async () => { try { await signOutUser(); } catch { /* still signed in; stay here */ return; } setScreen('settings'); }}
        />
      );
    case 'orgs':
      return <OrgsScreen onBack={() => setScreen(orgsBack)} onOpen={(o) => { setOrgId(o.id); setOrgBack('orgs'); setScreen('org'); }} />;
    case 'org':
      if (!orgId) break;
      return (
        <OrgScreen
          key={orgId} orgId={orgId} uid={user?.uid ?? null} graph={gdcGraph} onBack={() => setScreen(orgBack)}
          onSignIn={() => setScreen('auth')}
          onAdmin={(o) => { setAdminOrg(o); setScreen('orgAdmin'); }}
          onOpenEvent={(item) => { setEventItem(item); setEventBack('org'); setScreen('event'); }}
        />
      );
    case 'orgAdmin':
      if (!adminOrg) break;
      return (
        <OrgAdminScreen
          org={adminOrg} graph={gdcGraph} onBack={() => setScreen('org')}
          onChanged={() => { getOrg(adminOrg.id).then((o) => o && setAdminOrg(o)).catch(() => {}); }}
          onPostEvent={(item) => { setEditing(item); setScreen('postEvent'); }}
          onImport={() => setScreen('import')}
        />
      );
    case 'postEvent':
      if (!adminOrg || !user) break;
      return <PostEventScreen org={adminOrg} uid={user.uid} graph={gdcGraph} editing={editing} onBack={() => setScreen('orgAdmin')} onDone={() => setScreen('orgAdmin')} />;
    case 'import':
      if (!adminOrg || !user) break;
      return <ImportScreen org={adminOrg} uid={user.uid} graph={gdcGraph} onBack={() => setScreen('orgAdmin')} onDone={() => {}} />;
    case 'editor':
      return <EditorScreen onBack={() => setScreen('settings')} />;
    case 'events':
      return (
        <EventsScreen
          items={allItems} graph={gdcGraph} myOrgIds={findData?.myOrgIds ?? []} signedIn={!!user} view={eventsView} onView={setEventsView}
          problem={eventsProblem} loaded={findData !== null} refreshing={refreshing} onRefresh={reloadOrgEvents}
          onOpen={(item) => { setEventItem(item); setEventBack('events'); setScreen('event'); }}
          onOrgs={() => { setOrgsBack('events'); setScreen('orgs'); }} onBack={() => setScreen('home')}
        />
      );
    case 'event':
      if (!eventItem) break;
      return (
        <EventDetailScreen
          item={eventItem} graph={gdcGraph} onBack={() => setScreen(eventBack)}
          onDirections={() => { setToId(eventItem.room); setPreviewBack('event'); setScreen('preview'); }}
          onOpenOrg={(id) => { setOrgId(id); setOrgBack('event'); setScreen('org'); }}
        />
      );
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
