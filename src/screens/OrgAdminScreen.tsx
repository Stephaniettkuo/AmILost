// Admin tools for one org (officers only): description, private switch, invite codes, events.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, TextInput, View } from 'react-native';
import Card from '../components/Card';
import Chip from '../components/Chip';
import EventCard from '../components/EventCard';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import { Item, formatWhen } from '../calendar/events';
import { copyText } from '../orgs/copyText';
import { itemsFromOrgEvents } from '../orgs/eventItems';
import {
  createInviteCode, deleteEvent, deleteInviteCode, listInviteCodes, loadOrgEvents, setOrgPrivate, updateOrgDescription,
} from '../orgs/orgData';
import { Org, friendlyDbError } from '../orgs/orgRules';
import { colors, fonts, radii, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = {
  org: Org;
  graph: MapGraph;
  onBack: () => void;
  onChanged: () => void;               // tell App the org changed (so lists reload)
  onPostEvent: (editing: Item | null) => void;
  onImport: () => void;
};

export default function OrgAdminScreen({ org, graph, onBack, onChanged, onPostEvent, onImport }: Props) {
  const [description, setDescription] = useState(org.description);
  const [isPrivate, setIsPrivate] = useState(org.isPrivate);
  const [codes, setCodes] = useState<string[]>([]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null); // event id waiting for a second tap
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCodes(await listInviteCodes(org.id));
      setItems(itemsFromOrgEvents(await loadOrgEvents(org.id, true), [{ ...org, name: org.name }]));
    } catch (error) { setMessage(friendlyDbError(error)); setItems((old) => old ?? []); }
  }, [org]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setIsPrivate(org.isPrivate); }, [org.isPrivate]); // snaps back if saving failed

  async function run(action: () => Promise<void>, ok?: string) {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await action(); if (ok) setMessage(ok); onChanged(); } catch (error) { setMessage(friendlyDbError(error)); }
    setBusy(false);
    await load();
  }

  return (
    <Screen title="Admin tools" onBack={onBack}>
      <Text style={styles.name}>{org.name}</Text>
      <View style={styles.messageSlot}>{!!message && <Text style={styles.message} accessibilityRole="alert">{message}</Text>}</View>

      <Card style={styles.card}>
        <Text style={styles.heading}>About</Text>
        <TextInput
          value={description} onChangeText={setDescription} multiline placeholder="What is your organization about?"
          placeholderTextColor={colors.fadedInk} accessibilityLabel="Description" style={[styles.input, styles.multiline]}
        />
        <StampButton label="Save description" variant="secondary" disabled={busy || description.trim() === org.description} onPress={() => run(() => updateOrgDescription(org.id, description), 'Saved.')} />
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.label}>Private</Text>
            <Text style={styles.small}>People need an invite code to join, and all events are members-only.</Text>
          </View>
          <Switch
            value={isPrivate} disabled={busy}
            onValueChange={(v) => { setIsPrivate(v); run(() => setOrgPrivate(org.id, v)); }}
            trackColor={{ false: colors.line, true: colors.rust }} thumbColor={colors.paper}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.heading}>Invite codes</Text>
        <Text style={styles.small}>Give a code to someone you want to let into a private org.</Text>
        {codes.length === 0 && <Text style={styles.small}>No codes yet.</Text>}
        {codes.map((code) => (
          <View key={code} style={styles.codeRow}>
            <Text style={styles.code}>{code}</Text>
            <Chip label="Copy" onPress={async () => setMessage((await copyText(code)) === 'failed' ? "Couldn't copy." : 'Copied.')} />
            <Chip label="Delete" onPress={() => run(() => deleteInviteCode(org.id, code))} />
          </View>
        ))}
        <StampButton label="Create a code" variant="secondary" disabled={busy} onPress={() => run(async () => { await createInviteCode(org.id); })} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.heading}>Events</Text>
        <StampButton label="Post event" onPress={() => onPostEvent(null)} />
        <StampButton label="Import calendar" variant="secondary" onPress={onImport} />
      </Card>

      {items === null && <ActivityIndicator color={colors.rustDark} />}
      {items?.length === 0 && <Text style={styles.small}>No events yet.</Text>}
      {items?.map((item) => (
        <View key={item.id} style={styles.eventBox}>
          <EventCard item={item} graph={graph} onPress={() => onPostEvent(item)} />
          <View style={styles.codeRow}>
            <Text style={styles.small}>{formatWhen(item)}</Text>
          </View>
          <View style={styles.codeRow}>
            <Chip label="Edit" onPress={() => onPostEvent(item)} />
            <Chip
              label={confirming === item.id ? 'Tap again to delete' : 'Delete'} selected={confirming === item.id}
              onPress={() => (confirming === item.id ? (setConfirming(null), run(() => deleteEvent(org.id, item.docId!))) : setConfirming(item.id))}
            />
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.title, fontSize: 28, color: colors.ink },
  card: { gap: spacing.md },
  heading: { fontFamily: fonts.title, fontSize: 24, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.fadedInk },
  flex: { flex: 1 },
  messageSlot: { minHeight: 24, justifyContent: 'center' },
  message: { fontFamily: fonts.body, fontSize: 16, color: colors.rustDark },
  input: { padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, fontFamily: fonts.body, fontSize: 17, color: colors.ink, backgroundColor: colors.paper },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  code: { fontFamily: fonts.title, fontSize: 26, letterSpacing: 3, color: colors.ink, flex: 1 },
  eventBox: { gap: spacing.xs },
});
