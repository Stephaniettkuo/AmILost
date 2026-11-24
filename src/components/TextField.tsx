// A labelled text box for forms (sign in, and later posting events).
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import Text from './Text';
import { colors, fonts, minTouch, radii, spacing } from '../theme';

type Props = TextInputProps & { label: string };

export default function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.fadedInk}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontFamily: fonts.label, fontSize: 15, color: colors.fadedInk },
  input: {
    minHeight: minTouch, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line,
    borderRadius: radii.card, fontFamily: fonts.body, fontSize: 17, color: colors.ink, backgroundColor: colors.paper,
  },
});
