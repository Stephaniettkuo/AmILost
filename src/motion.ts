// Small helpers shared by the animated components.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// The native driver doesn't exist on web; use it everywhere else.
export const nativeDriver = Platform.OS !== 'web';

// True if the phone has "Reduce Motion" on: skip bobbing and confetti.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
