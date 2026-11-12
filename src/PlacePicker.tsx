// A search box for choosing a place (room, entrance, stairs, ...).
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { placeName, searchText } from './names';
import { MapGraph } from './types';

type Props = {
  label: string;           // "From" / "To"
  graph: MapGraph;
  value: string | null;    // chosen node id
  onChange: (id: string) => void;
};

export default function PlacePicker({ label, graph, value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const chosen = graph.nodes.find((n) => n.id === value);
  const q = query.trim().toLowerCase();
  const matches = q
    ? graph.nodes.filter((n) => n.kind !== 'hall' && searchText(n).includes(q)).slice(0, 6)
    : [];

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={open ? query : chosen ? placeName(chosen) : ''}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChangeText={setQuery}
        placeholder="Search, e.g. 2.702 or Front office"
        autoCapitalize="none"
        style={styles.input}
      />
      {open && (
        <View style={styles.list}>
          {matches.map((n) => (
            <Pressable key={n.id} onPress={() => { onChange(n.id); setOpen(false); }} style={styles.item}>
              <Text>{placeName(n)}</Text>
            </Pressable>
          ))}
          {q !== '' && matches.length === 0 && <Text style={styles.none}>No matches</Text>}
          <Pressable onPress={() => setOpen(false)} style={styles.item}>
            <Text style={styles.none}>Close</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexGrow: 1, minWidth: 240, maxWidth: 420 },
  label: { fontWeight: 'bold', marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  list: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginTop: 2 },
  item: { paddingVertical: 6, paddingHorizontal: 10 },
  none: { color: '#888' },
});
