// Account: who you are, the orgs you belong to, and Sign out.
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import { MyOrg, loadMyOrgs } from '../accounts';
import { colors, fonts, spacing } from '../theme';

type Props = { name: string; email: string; uid: string; onBack: () => void; onSignOut: () => void };

export default function AccountScreen({ name, email, uid, onBack, onSignOut }: Props) {
  const [orgs, setOrgs] = useState<MyOrg[] | null>(null); // null = still loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    loadMyOrgs(uid)
      .then((list) => { if (current) setOrgs(list); })
      .catch(() => { if (current) { setFailed(true); setOrgs([]); } });
    return () => { current = false; };
  }, [uid]);

  return (
    <Screen onBack={onBack} title="Account">
      <Card>
        <Text style={styles.name}>{name || 'Signed in'}</Text>
        <Text style={styles.small}>{email}</Text>
      </Card>

      <Card style={styles.orgs}>
        <Text style={styles.heading}>My organizations</Text>
        {orgs === null && <ActivityIndicator color={colors.rustDark} />}
        {orgs?.map((org) => (
          <View key={org.id} style={styles.orgRow}>
            <Text style={styles.orgName}>{org.name}</Text>
            {org.role === 'admin' && <Chip label="Officer" small />}
          </View>
        ))}
        {orgs?.length === 0 && (
          <Text style={styles.small}>
            {failed ? "Couldn't load your organizations. Check your internet and come back." : "You haven't joined any organizations yet."}
          </Text>
        )}
      </Card>

      <StampButton label="Sign out" variant="secondary" onPress={onSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.title, fontSize: 28, color: colors.ink },
  heading: { fontFamily: fonts.title, fontSize: 24, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.fadedInk, marginTop: spacing.xs },
  orgs: { gap: spacing.sm },
  orgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  orgName: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, flex: 1 },
});
