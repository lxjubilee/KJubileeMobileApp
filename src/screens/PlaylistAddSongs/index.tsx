import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen, AppText, Artwork, IconButton } from '@/components/common';
import { useTheme } from '@/context';
import { useAppDispatch, useAppSelector, useDebounce, useVisibleTracks } from '@/hooks';
import { addTrackToPlaylist, fetchPlaylistDetail, removeItemFromPlaylist } from '@/redux';
import { trackSongUuid } from '@/services/playlists';
import { SearchRepository } from '@/repositories';
import { Track } from '@/types';
import type { RootStackScreenProps } from '@/navigation/types';

/**
 * Search-driven picker for adding songs to a playlist. Tapping a result toggles
 * its membership (add / remove), so multiple songs can be added in one session.
 * Uses a local SearchRepository query so it doesn't disturb the Search tab's
 * shared Redux state.
 */
export const PlaylistAddSongsScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'PlaylistAddSongs'>['route']>();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const detail = useAppSelector((s) => s.playlists.byId[params.playlistId]);
  // song uuid -> playlist item, so we can show membership and remove by item id.
  const itemBySong = useMemo(() => {
    const m = new Map<string, { id: string }>();
    (detail?.items ?? []).forEach((it) => m.set(it.songId, { id: it.id }));
    return m;
  }, [detail]);

  const [input, setInput] = useState('');
  const debounced = useDebounce(input, 350);
  const [results, setResults] = useState<Track[]>([]);

  // Ensure the playlist's items are loaded so the add/remove state is accurate.
  useEffect(() => {
    void dispatch(fetchPlaylistDetail(params.playlistId));
  }, [dispatch, params.playlistId]);

  useEffect(() => {
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let active = true;
    SearchRepository.search(q)
      .then((r) => active && setResults(r.tracks))
      .catch(() => active && setResults([]));
    return () => {
      active = false;
    };
  }, [debounced]);

  const tracks = useVisibleTracks(results);

  const toggle = (track: Track) => {
    const songId = trackSongUuid(track);
    if (!songId) return;
    const existing = itemBySong.get(songId);
    if (existing) {
      void dispatch(
        removeItemFromPlaylist({ playlistId: params.playlistId, itemId: existing.id, songId }),
      );
    } else {
      void dispatch(addTrackToPlaylist({ playlistId: params.playlistId, track }));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton name="chevron-down" size={28} onPress={() => navigation.goBack()} />
        <AppText variant="h2">{t('playlist.addSongs')}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
          <Ionicons name="search" size={20} color={theme.colors.iconMuted} />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.text }]}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
          />
          {input ? (
            <IconButton name="close-circle" size={20} color={theme.colors.iconMuted} onPress={() => setInput('')} />
          ) : null}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {input.trim() && !tracks.length ? (
          <AppText variant="body" color="textMuted" style={styles.empty}>
            {t('search.noResults', { query: input })}
          </AppText>
        ) : (
          tracks.map((track) => {
            const sid = trackSongUuid(track);
            const added = sid != null && itemBySong.has(sid);
            return (
              <Pressable
                key={track.id}
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => toggle(track)}
              >
                <Artwork uri={track.artwork} style={[styles.art, { borderRadius: theme.radius.sm }]} iconSize={20} />
                <View style={styles.meta}>
                  <AppText variant="h3" numberOfLines={1}>
                    {track.title}
                  </AppText>
                  <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
                    {track.artistName}
                  </AppText>
                </View>
                <Ionicons
                  name={added ? 'checkmark-circle' : 'add-circle-outline'}
                  size={26}
                  color={added ? theme.colors.accent : theme.colors.iconMuted}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  headerSpacer: { width: 44 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 46 },
  input: { flex: 1, marginLeft: 8, fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  art: { width: 48, height: 48, backgroundColor: '#222' },
  meta: { flex: 1, marginLeft: 12, marginRight: 8 },
  empty: { paddingTop: 24 },
});

export default PlaylistAddSongsScreen;
