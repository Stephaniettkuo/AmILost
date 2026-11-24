// One org: its description, its upcoming events I may see, and join / leave / "I'm an officer".
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Card from '../components/Card';
import Chip from '../components/Chip';
import EventCard from '../components/EventCard';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import TextField from '../components/TextField';
import { Item } from '../calendar/events';
import { austinNow } from '../calendar/time';
import { claimOrg, getMyRole, getOrg, joinPublicOrg, joinWithInviteCode, leaveOrg, loadOrgEvents } from '../orgs/orgData';
import { itemsFromOrgEvents } from '../orgs/eventItems';
import { Org, Role, friendlyDbError } from '../orgs/orgRules';
import { colors, fonts, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = {
  orgId: string;
  uid: string | null;              // null = signed out
  graph: MapGraph;
  onBack: () => void;
  onSignIn: () => void;
  onAdmin: (org: Org) => void;
  onOpenEvent: (item: Item) => void;
};

export default function OrgScreen({ orgId, uid, graph, onBack, onSignIn, onAdmin, onOpenEvent }: Props) {
  const [org, setOrg] = useState<Org | null | undefined>(undefined); // undefined = loading, null = not found
  const [role, setRole] = useState<Role | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [officer, setOfficer] = useState(false);

  const load = useCallback(async () => {
    try {
      const found = await getOrg(orgId);
      setOrg(found);
      if (!found) return;
      const mine = uid ? await getMyRole(orgId, uid).catch(() => null) : null;
      setRole(mine);
      const events = await loadOrgEvents(orgId, mine !== null);
      const now = austinNow();
      setItems(itemsFromOrgEvents(events, [found]).filter((i) => i.end.getTime() >= now.getTime()));
    } catch (error) {
      setMessage(friendlyDbError(error));
      setOrg((old) => (old === undefined ? null : old));
    }
  }, [orgId, uid]);
  useEffect(() => { load(); }, [load]);

  // Run one action, show a problem if it fails, then reload.
  async function run(action: () => Promise<void>, done?: () => void) {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await action(); done?.(); } catch (error) { setMessage(friendlyDbError(error)); }
    setBusy(false);
    await load();
  }

  if (org === undefined) return <Screen title="Organization" onBack={onBack}><ActivityIndicator color={colors.rustDark} /></Screen>;
  if (org === null) return <Screen title="Organization" onBack={onBack}><Text style={styles.small}>{message ?? "We couldn't find that organization."}</Text></Screen>;

  return (
    <Screen title="Organization" onBack={onBack}>
      <Text style={styles.name}>{org.name}</Text>
      <View style={styles.row}>
        {org.isPrivate && <Chip label="Private" small />}
        {role === 'admin' && <Chip label="You're an officer" small />}
        {role === 'member' && <Chip label="You're a member" small />}
        {!org.claimed && <Text style={styles.faded}>Not yet claimed by this org</Text>}
      </View>
      {!!org.description && <Text style={styles.body}>{org.description}</Text>}

      {!uid && (
        <Card style={styles.card}>
          <Text style={styles.small}>Sign in to join this organization.</Text>
          <StampButton label="Sign in or create account" onPress={onSignIn} />
        </Card>
      )}

      {uid && role === null && (
        <Card style={styles.card}>
          {org.isPrivate ? (
            <>
              <Text style={styles.small}>This is a private organization. Ask an officer for an invite code.</Text>
              <TextField label="Invite code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} />
              <StampButton label="Join with invite code" disabled={busy || !code.trim()} onPress={() => run(() => joinWithInviteCode(org.id, uid, code), () => setCode(''))} />
            </>
          ) : (
            <StampButton label="Join" disabled={busy} onPress={() => run(() => joinPublicOrg(org.id, uid))} />
          )}
          <Chip label="I'm an officer" selected={officer} onPress={() => setOfficer(!officer)} />
          {officer && (
            <>
              <Text style={styles.small}>Officers get a claim code from the AmILost team. Enter it to manage this organization.</Text>
              <TextField label="Claim code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} />
              <StampButton label="Claim this organization" disabled={busy || !code.trim()} onPress={() => run(() => claimOrg(org.id, uid, code), () => { setCode(''); setOfficer(false); })} />
            </>
          )}
        </Card>
      )}

      {uid && role !== null && (
        <View style={styles.actions}>
          {role === 'admin' && <StampButton label="Admin tools" onPress={() => onAdmin(org)} />}
          <StampButton label="Leave" variant="secondary" disabled={busy} onPress={() => run(() => leaveOrg(org.id, uid))} />
        </View>
      )}

      {/* A fixed-height slot, so a message appearing doesn't push things around. */}
      <View style={styles.messageSlot}>{!!message && <Text style={styles.problem} accessibilityRole="alert">{message}</Text>}</View>

      <Text style={styles.heading}>Upcoming events</Text>
      {items.length === 0 && <Text style={styles.small}>Nothing coming up that you can see.</Text>}
      {items.map((item) => <EventCard key={item.id} item={item} graph={graph} onPress={() => onOpenEvent(item)} />)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.title, fontSize: 30, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.fadedInk },
  faded: { fontFamily: fonts.body, fontSize: 14, color: colors.fadedInk },
  card: { gap: spacing.md },
  actions: { gap: spacing.sm },
  messageSlot: { minHeight: 24, justifyContent: 'center' },
  problem: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.rustDark },
  heading: { fontFamily: fonts.title, fontSize: 24, color: colors.ink, marginTop: spacing.sm },
});
