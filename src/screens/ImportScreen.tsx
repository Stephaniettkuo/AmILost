// Import an org's calendar: paste a Google Calendar / iCal link, fetch it on this phone, preview, import.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Card from '../components/Card';
import Screen from '../components/Screen';
import StampButton from '../components/StampButton';
import Text from '../components/Text';
import TextField from '../components/TextField';
import { austinWallFromUtc } from '../calendar/time';
import { formatWhen } from '../calendar/events';
import { ImportedEvent, icsToImports, normalizeCalendarUrl } from '../orgs/importIcs';
import { importEvents, updateOrgCalendarUrl } from '../orgs/orgData';
import { Org, friendlyDbError } from '../orgs/orgRules';
import { colors, fonts, spacing } from '../theme';
import { MapGraph } from '../types';

type Props = { org: Org; uid: string; graph: MapGraph; onBack: () => void; onDone: () => void };

const TIMEOUT_MS = 15000;

export default function ImportScreen({ org, uid, graph, onBack, onDone }: Props) {
  const [url, setUrl] = useState(org.calendarUrl ?? '');
  const [preview, setPreview] = useState<ImportedEvent[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchCalendar() {
    const clean = normalizeCalendarUrl(url);
    if (!clean) { setMessage('Paste the calendar link (it starts with https://).'); return; }
    setBusy(true); setMessage(null); setPreview(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(clean, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const found = icsToImports(await response.text(), graph);
      setPreview(found);
      if (found.length === 0) setMessage('That calendar has no events from the last 30 days or later.');
    } catch {
      setMessage("Couldn't load that calendar. Check the link and your internet. In Google Calendar: Settings → your calendar → \"Public address in iCal format\".");
    } finally { clearTimeout(timer); setBusy(false); }
  }

  async function save() {
    if (!preview || busy) return;
    setBusy(true); setMessage(null);
    try {
      const { added, updated } = await importEvents(org.id, uid, preview, org.isPrivate ? 'members' : 'public');
      const clean = normalizeCalendarUrl(url);
      if (clean && clean !== org.calendarUrl) await updateOrgCalendarUrl(org.id, clean).catch(() => {});
      setMessage(`Done: ${added} added, ${updated} updated.`);
      setPreview(null);
      onDone();
    } catch (error) { setMessage(friendlyDbError(error)); }
    setBusy(false);
  }

  return (
    <Screen title="Import calendar" onBack={onBack}>
      <Text style={styles.small}>
        Imports events from the last 30 days and the next year. Importing again updates events instead of adding copies.
      </Text>
      <TextField label="Calendar link" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://calendar.google.com/…/basic.ics" />
      <StampButton label="Fetch calendar" variant="secondary" disabled={busy} onPress={fetchCalendar} />
      <View style={styles.messageSlot}>{!!message && <Text style={styles.message} accessibilityRole="alert">{message}</Text>}</View>

      {preview && preview.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.heading}>{preview.length} events found</Text>
          {preview.slice(0, 8).map((e) => (
            <Text key={e.importUid} style={styles.small} numberOfLines={2}>
              {e.title} · {formatWhen({ start: austinWallFromUtc(e.startMs), end: austinWallFromUtc(e.endMs) } as never)}
            </Text>
          ))}
          {preview.length > 8 && <Text style={styles.small}>…and {preview.length - 8} more</Text>}
          <StampButton label={`Import ${preview.length} events`} disabled={busy} onPress={save} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  small: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.fadedInk },
  card: { gap: spacing.sm },
  heading: { fontFamily: fonts.title, fontSize: 24, color: colors.ink },
  messageSlot: { minHeight: 24, justifyContent: 'center' },
  message: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.rustDark },
});
