import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { Screen, AppText, IconButton } from '@/components/common';
import { AlbumCard, ArtistCard, TrackRow } from '@/components/cards';
import {
  useAppDispatch,
  useAppSelector,
  useDebounce,
  usePlayer,
  useVisibleAlbums,
  useVisibleArtists,
  useVisibleTracks,
} from '@/hooks';
import { runSearch, setQuery, addRecentSearch, clearRecentSearches } from '@/redux';
import { usePlaylistMenu } from '@/components/playlists';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const SearchScreen: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { playTracks } = usePlayer();
  const { openTrackOptions } = usePlaylistMenu();

  const { query, results, recent, status } = useAppSelector((s) => s.search);
  const [input, setInput] = useState(query);
  const debounced = useDebounce(input, 350);

  useEffect(() => {
    dispatch(setQuery(debounced));
    if (debounced.trim()) dispatch(runSearch(debounced.trim()));
  }, [debounced, dispatch]);

  // Hide results whose artwork is missing (same rule as everywhere else).
  const albums = useVisibleAlbums(results.albums);
  const artists = useVisibleArtists(results.artists);
  const tracks = useVisibleTracks(results.tracks);

  const hasQuery = input.trim().length > 0;
  const hasResults = albums.length || artists.length || tracks.length;

  return (
    <Screen>
      <View style={styles.headerWrap}>
        <AppText variant="display" style={styles.title}>
          {t('tabs.search')}
        </AppText>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
          <Ionicons name="search" size={20} color={theme.colors.iconMuted} />
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => hasQuery && dispatch(addRecentSearch(input.trim()))}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {hasQuery ? (
            <IconButton name="close-circle" size={20} color={theme.colors.iconMuted} onPress={() => setInput('')} />
          ) : null}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {!hasQuery ? (
          <View style={styles.recent}>
            <View style={styles.recentHeader}>
              <AppText variant="h2">{t('search.recent')}</AppText>
              {recent.length ? (
                <Pressable onPress={() => dispatch(clearRecentSearches())}>
                  <AppText variant="label" color="textMuted">
                    {t('search.clear')}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            {recent.map((term) => (
              <Pressable key={term} style={styles.recentRow} onPress={() => setInput(term)}>
                <Ionicons name="time-outline" size={20} color={theme.colors.iconMuted} />
                <AppText variant="body" style={styles.recentText}>
                  {term}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : status === 'succeeded' && !hasResults ? (
          <AppText variant="body" color="textMuted" style={styles.noResults}>
            {t('search.noResults', { query: input })}
          </AppText>
        ) : (
          <>
            {artists.length ? (
              <Section title={t('search.sectionArtists')}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {artists.map((a) => (
                    <View key={a.id} style={styles.hItem}>
                      <ArtistCard artist={a} onPress={(ar) => navigation.navigate('ArtistDetails', { artistId: ar.id })} />
                    </View>
                  ))}
                </ScrollView>
              </Section>
            ) : null}

            {albums.length ? (
              <Section title={t('search.sectionAlbums')}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {albums.map((al) => (
                    <View key={al.id} style={styles.hItem}>
                      <AlbumCard album={al} onPress={(x) => navigation.navigate('AlbumDetails', { albumId: x.id })} />
                    </View>
                  ))}
                </ScrollView>
              </Section>
            ) : null}

            {tracks.length ? (
              <Section title={t('search.sectionTracks')}>
                <View style={styles.tracks}>
                  {tracks.map((track) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      onPress={() => playTracks([track], 0)}
                      onOptions={openTrackOptions}
                    />
                  ))}
                </View>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <AppText variant="h2" style={styles.sectionTitle}>
      {title}
    </AppText>
    {children}
  </View>
);

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 16, paddingTop: 8 },
  title: { marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 46 },
  input: { flex: 1, marginLeft: 8, fontSize: 15 },
  scroll: { paddingBottom: 24, paddingTop: 8 },
  recent: { paddingHorizontal: 16, paddingTop: 8 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  recentText: { marginLeft: 12 },
  noResults: { paddingHorizontal: 16, paddingTop: 24 },
  section: { marginTop: 20 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 12 },
  row: { paddingHorizontal: 16 },
  hItem: { marginRight: 14 },
  tracks: { paddingHorizontal: 16 },
});

export default SearchScreen;
