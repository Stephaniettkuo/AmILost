// One of the little watercolor icons. They are decorative: screen readers skip them.
import { Image, StyleProp, ImageStyle } from 'react-native';
import { WcIconName, wc } from '../watercolor';

export default function WcIcon({ name, size = 40, style }: { name: WcIconName; size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={wc.icons[name]} accessible={false} resizeMode="contain" style={[{ width: size, height: size }, style]} />;
}
