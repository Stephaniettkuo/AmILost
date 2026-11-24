// Post (or edit) an event for an org: title, description, day, start time, length, a room on the map or
// free text, and who can see it. Steppers and chips instead of a date-picker package.
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Chip from '../components/Chip';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import TextField from '../components/TextField';
import { Item, dayLabel, dayName } from '../calendar/events';
import { addDays, austinNow, startOfDay, wallMinutes } from '../calendar/time';
import { placeTitle, searchPlaces } from '../names';
import { postEvent, updateEvent } from '../orgs/orgData';
import {
  EventForm, LENGTHS, Org, Visibility, buildEventDoc, clock, friendlyDbError, lengthText, stepStart, validateNewEvent,
} from '../orgs/orgRules';
import { colors, fonts, minTouch, radii, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = { org: Org; uid: string; graph: MapGraph; editing: Item | null; onBack: () => void; onDone: () => void };

export default function PostEventScreen({ org, uid, graph, editing, onBack, onDone }: Props) {
  const now = austinNow();
  const [form, setForm] = useState<EventForm>(() => editing ? {
    title: editing.title, description: editing.description, day: startOfDay(editing.start),
    startMinutes: editing.start.getHours() * 60 + editing.start.getMinutes(),
    lengthMinutes: wallMinutes(editing.start, editing.end), placeId: editing.room, locationText: editing.location,
    visibility: org.isPrivate ? 'members' : editing.visibility ?? 'public',
  } : {
    title: '', description: '', day: startOfDay(addDays(now, 1)), startMinutes: 18 * 60, lengthMinutes: 60,
    placeId: null, locationText: '', visibility: org.isPrivate ? 'members' : 'public',
  });
  const [roomQuery, setRoomQuery] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (change: Partial<EventForm>) => { setForm({ ...form, ...change }); setProblem(null); };

  const rooms = roomQuery.trim() ? searchPlaces(graph.nodes.filter((n) => n.kind !== 'hall'), roomQuery, 5) : [];
  const picked = form.placeId ? graph.nodes.find((n) => n.id === form.placeId) : undefined;

  async function submit() {
    if (busy) return;
    const bad = validateNewEvent(form, org);
    setProblem(bad);
    if (bad) return;
    setBusy(true);
    try {
      const doc = buildEventDoc(form, org);
      if (editing?.docId) await updateEvent(org.id, editing.docId, editing.createdBy ?? uid, doc);
      else await postEvent(org.id, uid, doc);
      onDone();
    } catch (error) { setProblem(friendlyDbError(error)); }
    setBusy(false);
  }

  return (
    <Screen title={editing ? 'Edit event' : 'Post event'} onBack={onBack}>
      <TextField label="Title" value={form.title} onChangeText={(title) => set({ title })} maxLength={80} />
      <View style={styles.field}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          value={form.description} onChangeText={(description) => set({ description })} multiline accessibilityLabel="Description"
          placeholderTextColor={colors.fadedInk} style={[styles.input, styles.multiline]}
        />
      </View>

      <Text style={styles.label}>Day</Text>
      <View style={styles.stepper}>
        <Chip label="‹" onPress={() => set({ day: addDays(form.day, -1) })} />
        <Text style={styles.value}>{dayLabel(form.day, now) === dayName(form.day) ? dayName(form.day) : `${dayLabel(form.day, now)} · ${dayName(form.day)}`}</Text>
        <Chip label="›" onPress={() => set({ day: addDays(form.day, 1) })} />
      </View>

      <Text style={styles.label}>Starts</Text>
      <View style={styles.stepper}>
        <Chip label="−30 min" onPress={() => set({ startMinutes: stepStart(form.startMinutes, -30) })} />
        <Text style={styles.value}>{clock(form.startMinutes)}</Text>
        <Chip label="+30 min" onPress={() => set({ startMinutes: stepStart(form.startMinutes, 30) })} />
      </View>

      <Text style={styles.label}>Lasts</Text>
      <View style={styles.chips}>
        {LENGTHS.map((m) => <Chip key={m} label={lengthText(m)} selected={form.lengthMinutes === m} onPress={() => set({ lengthMinutes: m })} />)}
      </View>

      <Text style={styles.label}>Room</Text>
      {picked ? (
        <View style={styles.stepper}>
          <Text style={styles.value}>{placeTitle(picked)}</Text>
          <Chip label="Change" onPress={() => set({ placeId: null })} />
        </View>
      ) : (
        <>
          <TextInput
            value={roomQuery} onChangeText={setRoomQuery} placeholder="Search for a room (like 2.216)" placeholderTextColor={colors.fadedInk}
            accessibilityLabel="Search for a room" autoCapitalize="none" autoCorrect={false} style={styles.input}
          />
          <View style={styles.chips}>
            {rooms.map((n) => <Chip key={n.id} label={placeTitle(n)} onPress={() => { set({ placeId: n.id, locationText: '' }); setRoomQuery(''); }} />)}
          </View>
          <TextField label="Or a place that isn't on our map" value={form.locationText} onChangeText={(locationText) => set({ locationText })} placeholder="Welch Patio" maxLength={100} />
        </>
      )}

      <Text style={styles.label}>Who can see it</Text>
      <View style={styles.chips}>
        {(['public', 'members'] as Visibility[]).map((v) => (
          <Chip
            key={v} label={v === 'public' ? 'Public' : 'Members only'} selected={form.visibility === v}
            onPress={() => !org.isPrivate && set({ visibility: v })}
          />
        ))}
      </View>
      {org.isPrivate && <Text style={styles.small}>Private organizations post members-only events.</Text>}

      <View style={styles.messageSlot}>{!!problem && <Text style={styles.problem} accessibilityRole="alert">{problem}</Text>}</View>
      <StampButton label={editing ? 'Save changes' : 'Post event'} disabled={busy} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontFamily: fonts.label, fontSize: 15, color: colors.fadedInk },
  value: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink, flex: 1, textAlign: 'center' },
  small: { fontFamily: fonts.body, fontSize: 14, color: colors.fadedInk },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: { minHeight: minTouch, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, fontFamily: fonts.body, fontSize: 17, color: colors.ink, backgroundColor: colors.paper },
  multiline: { minHeight: 90, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  messageSlot: { minHeight: 24, justifyContent: 'center' },
  problem: { fontFamily: fonts.body, fontSize: 16, color: colors.rustDark },
});
