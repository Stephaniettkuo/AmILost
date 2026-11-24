// Sign in / Create account. One form: "Create account" also asks for a name.
// Signing in is optional: nothing about maps or directions needs it.
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import TextField from '../components/TextField';
import { checkSignIn, checkSignUp, friendlyAuthError } from '../accountRules';
import { signIn, signUp } from '../accounts';
import { colors, fonts, spacing } from '../theme';

type Props = { onBack: () => void; onDone: () => void };

export default function AuthScreen({ onBack, onDone }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const bad = creating ? checkSignUp({ name, email, password }) : checkSignIn(email, password);
    setProblem(bad);
    if (bad) return;
    setBusy(true);
    try {
      if (creating) await signUp(name, email, password);
      else await signIn(email, password);
      onDone();
    } catch (error) {
      setProblem(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  function pick(createNew: boolean) {
    setCreating(createNew);
    setProblem(null);
  }

  return (
    <Screen onBack={onBack} title={creating ? 'Create account' : 'Sign in'}>
      <View style={styles.row}>
        <Chip label="Sign in" selected={!creating} onPress={() => pick(false)} />
        <Chip label="Create account" selected={creating} onPress={() => pick(true)} />
      </View>

      <Card style={styles.form}>
        {creating && (
          <TextField label="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" textContentType="name" />
        )}
        <TextField
          label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
          keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
        />
        <TextField
          label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
          autoComplete={creating ? 'new-password' : 'current-password'} textContentType={creating ? 'newPassword' : 'password'}
          onSubmitEditing={submit} returnKeyType="go"
        />
        {/* Fixed-height slot: a message appearing must not push the button out from under a finger. */}
        <View style={styles.messageSlot}>
          {!!problem && <Text style={styles.problem} accessibilityRole="alert">{problem}</Text>}
        </View>
        {busy ? <ActivityIndicator color={colors.rustDark} /> : (
          <StampButton label={creating ? 'Create account' : 'Sign in'} onPress={submit} />
        )}
      </Card>

      <Text style={styles.note}>
        You don't need an account to find your way around. Accounts are for joining student
        organizations and seeing their events.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  form: { gap: spacing.md },
  messageSlot: { minHeight: 46, justifyContent: 'center' },
  problem: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.rustDark },
  note: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.fadedInk },
});
