import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText } from '@/components/common';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import { getAllStations, getSections } from '@/services/radio';
import { tune } from '@/services/radio';
import type { RadioStation } from '@/services/radio';
import type { RootStackParamList } from '@/navigation/types';
import { StationRow, ROW_HEIGHT } from './components/StationRow';
import { foldForSearch } from '@/utils';

/**
 * Browse — every station on the band, in frequency order.
 *
 * This was a grid of albums from the music app. It is now the mobile version of
 * the website's `stations.html`, which exists alongside the dial for a reason:
 * Home answers "what's good", the Dial answers "what else is out there", and
 * this answers "where is the specific one I want". A shelf of four visible tiles
 * is bad at "every Spanish-language station" or "what sits on 332.16".
 *
 * Frequency order, not alphabetical — that is how a band is read, and it is what
 * the website's list does.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Sentinels for the two filters that are not sections. */
const ALL = '__all__';
const ON_AIR = '__onair__';

export const BrowseScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const radio = useRadio();

  const [term, setTerm] = useState('');
  const [chip, setChip] = useState<string>(ALL);

  const stations = useMemo(() => getAllStations(), []);
  const sections = useMemo(() => getSections(), []);

  /** section id -> the slugs it holds, so a chip can filter without a lookup. */
  const bySection = useMemo(() => {
    const map = new Map<string, Set<string>>();
    sections.forEach((s) =>
      map.set(s.id, new Set(s.shelves.flatMap((shelf) => shelf.stations))),
    );
    return map;
  }, [sections]);

  const chips = useMemo(
    () => [
      { key: ALL, label: 'All' },
      { key: ON_AIR, label: 'On Air' },
      ...sections.map((s) => ({ key: s.id, label: s.label })),
    ],
    [sections],
  );

  const filtered = useMemo(() => {
    const q = foldForSearch(term.trim());
    return stations.filter((s) => {
      if (chip === ON_AIR && !s.live) return false;
      if (chip !== ALL && chip !== ON_AIR && !bySection.get(chip)?.has(s.slug)) return false;
      if (!q) return true;
      // Frequency is part of the search on purpose: on a dial, the number is a
      // name. Typing "332" should find Jubilee Praise (Română).
      // Both sides are folded, so "Romana" reaches "Jubilee Praise (Română)"
      // and "Espanol" reaches "Español" — the accented spelling is the one on
      // screen, and a plain keyboard cannot type it.
      return (
        foldForSearch(s.name).includes(q) ||
        foldForSearch(s.format).includes(q) ||
        s.hm.includes(q) ||
        foldForSearch(s.lang).includes(q) ||
        (s.host ? foldForSearch(s.host.name).includes(q) : false)
      );
    });
  }, [stations, term, chip, bySection]);

  const onPress = useCallback(
    (station: RadioStation) => {
      if (!station.live) return;
      void tune(station.slug);
      navigation.navigate('StationDetail', { slug: station.slug });
    },
    [navigation],
  );

  const c = theme.colors;
  const playingSlug = radio.playing ? radio.slug : null;
  const liveCount = filtered.filter((s) => s.live).length;

  return (
    <Screen>
      {/* Pinned outside the list so the title, search and chips stay put while
          a hundred rows scroll under them. */}
      <View style={styles.header}>
        <AppText variant="display" style={styles.title}>
          All Stations
        </AppText>

        <View style={[styles.searchBox, { backgroundColor: c.surface, borderRadius: theme.radius.md }]}>
          <Ionicons name="search" size={19} color={c.iconMuted} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="Search name, format, host, frequency…"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text }]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {term ? (
            <Pressable onPress={() => setTerm('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={c.iconMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map((ch) => {
            const on = ch.key === chip;
            return (
              <Pressable
                key={ch.key}
                onPress={() => setChip(ch.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  styles.chip,
                  { backgroundColor: on ? c.text : c.surface, borderColor: c.border },
                ]}
              >
                <AppText style={[styles.chipText, { color: on ? c.background : c.textSecondary }]}>
                  {ch.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <AppText style={[styles.count, { color: c.textMuted }]}>
          {`${filtered.length} station${filtered.length === 1 ? '' : 's'} · ${liveCount} on air`}
        </AppText>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.slug}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews
        // Every row is a fixed height, so the list can skip measurement.
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: c.border }]} />
        )}
        ListEmptyComponent={
          <AppText style={[styles.empty, { color: c.textMuted }]}>
            No station matches that search.
          </AppText>
        }
        renderItem={({ item }) => (
          <StationRow
            station={item}
            playing={item.slug === playingSlug}
            onPress={onPress}
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { marginTop: 8, marginBottom: 14 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  chipRow: { gap: 8, paddingVertical: 14, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 13 },
  count: { fontSize: 12 },
  listContent: { paddingTop: 6, paddingBottom: 24 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 96 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
});

export default BrowseScreen;
