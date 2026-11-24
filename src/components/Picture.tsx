// A picture that fills the box given by `style`. `tint` recolors it (floor plans).
// Phones use React Native's Image. The web uses Picture.web.tsx.
import { Image, ImageStyle, StyleProp } from 'react-native';

export type PictureProps = {
  source: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  tint?: string;
  accessibilityLabel?: string;
};

export default function Picture({ source, style, resizeMode = 'contain', tint, accessibilityLabel }: PictureProps) {
  return <Image source={source} style={style} resizeMode={resizeMode} tintColor={tint} accessibilityLabel={accessibilityLabel} />;
}
