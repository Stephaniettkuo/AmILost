// Text that follows the phone's text-size setting, but only up to 1.2x, so fixed-height panels still fit.
import { Text as RNText, TextProps } from 'react-native';

export default function Text(props: TextProps) {
  return <RNText maxFontSizeMultiplier={1.2} {...props} />;
}
