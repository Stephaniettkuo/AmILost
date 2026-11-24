// The app shell: loads fonts, holds the current screen and the chosen From / To / options,
// and switches screens. Each screen is a file in src/screens/.
import { useFonts } from 'expo-font';
import { appFonts } from './src/fonts';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { gdcGraph } from './src/data/gdc';
import { directions } from './src/directions';
import { placeTitle } from './src/names';
import { findRoute } from './src/routing';
import ArrivedScreen from './src/screens/ArrivedScreen';
import DirectionsScreen from './src/screens/DirectionsScreen';
import EditorScreen from './src/screens/EditorScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlaceScreen from './src/screens/PlaceScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Screen = 'home' | 'place' | 'preview' | 'directions' | 'arrived' | 'settings' | 'editor';

// Where the phone's back button goes from each screen (Home has none: the app closes).
const BACK: Partial<Record<Screen, Screen>> = {
  place: 'home', preview: 'place', directions: 'preview', arrived: 'directions', settings: 'home', editor: 'settings',
};

export default function App() {
  const [loaded] = useFonts(appFonts);
  const [screen, setScreen] = useState<Screen>('home');
  const [fromId, setFromId] = useState('GDC-2-entrance-main');
  const [toId, setToId] = useState<string | null>(null);
  const [avoidStairs, setAvoidStairs] = useState(false); // "Elevator only"
  const [stepIndex, setStepIndex] = useState(0);

  const route = useMemo(
    () => (toId ? findRoute(gdcGraph, fromId, toId, { avoidStairs }) : null),
    [fromId, toId, avoidStairs],
  );
  const steps = useMemo(() => (route ? directions(route) : []), [route]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const back = BACK[screen];
      if (!back) return false; // let the phone close the app
      setScreen(back);
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.paper }} />; // plain white until fonts are ready

  const from = gdcGraph.nodes.find((n) => n.id === fromId);
  const place = toId ? gdcGraph.nodes.find((n) => n.id === toId) : undefined;

  switch (screen) {
    case 'place':
      if (!place) break;
      return <PlaceScreen place={place} from={from} onBack={() => setScreen('home')} onDirections={() => setScreen('preview')} />;
    case 'preview':
      if (!place) break;
      return (
        <PreviewScreen
          route={route} place={place} from={from} avoidStairs={avoidStairs} onAvoidStairs={setAvoidStairs}
          onBack={() => setScreen('place')} onStart={() => { setStepIndex(0); setScreen('directions'); }}
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
  }
  return (
    <HomeScreen
      graph={gdcGraph} fromId={fromId}
      onChooseTo={(id) => { setToId(id); setScreen('place'); }}
      onChangeFrom={setFromId}
      onSettings={() => setScreen('settings')}
    />
  );
}
