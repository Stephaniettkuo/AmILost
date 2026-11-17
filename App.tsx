// The app shell: loads fonts, holds the current screen and the chosen From / To / options,
// and switches screens. Each screen is a file in src/screens/.
import { Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import { gdcGraph } from './src/data/gdc';
import { directions } from './src/directions';
import { findRoute } from './src/routing';
import ArrivedScreen from './src/screens/ArrivedScreen';
import DirectionsScreen from './src/screens/DirectionsScreen';
import EditorScreen from './src/screens/EditorScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlaceScreen from './src/screens/PlaceScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StyleCheck from './src/StyleCheck';
import { colors } from './src/theme';

type Screen = 'home' | 'place' | 'preview' | 'directions' | 'arrived' | 'settings' | 'editor';

// Where the phone's back button goes from each screen (Home has none: the app closes).
const BACK: Partial<Record<Screen, Screen>> = {
  place: 'home', preview: 'place', directions: 'preview', arrived: 'directions', settings: 'home', editor: 'settings',
};

export default function App() {
  const [loaded] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Nunito_400Regular, Nunito_700Bold });
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

  // Dev only: open the app at /#style on web to see the building blocks. Remove before we ship.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash === '#style') return <StyleCheck />;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.cream }} />; // cream until fonts are ready

  const place = toId ? gdcGraph.nodes.find((n) => n.id === toId) : undefined;

  switch (screen) {
    case 'place':
      if (!place) break;
      return <PlaceScreen place={place} onBack={() => setScreen('home')} onDirections={() => setScreen('preview')} />;
    case 'preview':
      return (
        <PreviewScreen
          route={route} steps={steps} avoidStairs={avoidStairs} onAvoidStairs={setAvoidStairs}
          onBack={() => setScreen('place')} onStart={() => { setStepIndex(0); setScreen('directions'); }}
        />
      );
    case 'directions':
      if (!route || steps.length === 0) break;
      return (
        <DirectionsScreen
          route={route} steps={steps} index={Math.min(stepIndex, steps.length - 1)} onIndex={setStepIndex}
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
