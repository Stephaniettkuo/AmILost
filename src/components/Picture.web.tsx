// The web version of Picture: a real <img>. React Native's Image draws a CSS background on the web,
// and dark-mode browser extensions rewrite backgrounds, which broke every picture's size.
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../theme';
import type { PictureProps } from './Picture';

export default function Picture({ source, style, resizeMode = 'contain', tint, accessibilityLabel }: PictureProps) {
  const uri = (source as unknown as { uri: string }).uri; // on the web, require() gives { uri, width, height }
  return (
    <View style={style as StyleProp<ViewStyle>}>
      <img
        src={uri}
        alt={accessibilityLabel ?? ''}
        draggable={false}
        style={{
          width: '100%', height: '100%', display: 'block', pointerEvents: 'none',
          objectFit: resizeMode === 'stretch' ? 'fill' : resizeMode,
          // Only floor plans are tinted: darken their sepia lines to the plan ink.
          filter: tint === colors.mapInk ? 'brightness(0.35)' : undefined,
        }}
      />
    </View>
  );
}
