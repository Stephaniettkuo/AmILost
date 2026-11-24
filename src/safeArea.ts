// How far content must stay from the top and bottom of the screen on this phone
// (notch, Dynamic Island, Android status bar, home indicator, navigation bar).
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_WIDTH } from './theme';

export function useEdges() {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  return {
    top: Math.max(insets.top, 24) + 4,
    bottom: Math.max(insets.bottom, 16),
    width: Math.min(frame.width, MAX_WIDTH), // the app column's width
    height: frame.height, // the app's real height (the window's height is wrong on some Android phones)
  };
}
