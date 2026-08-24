import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { Screen, AppText, Artwork, IconButton, ProfileButton, ConfirmDialog } from '@/components/common';
import { PlaylistNameDialog } from '@/components/playlists';
import { useAppDispatch, useAppSelector, usePlayer } from '@/hooks';
import { createPlaylist, deletePlaylist, fetchPlaylistDetail, fetchPlaylists } from '@/redux';
import type { PlaylistSummary } from '@/services/playlists';
import type { PlaylistsStackParamList, RootStackParamList } from '@/navigation/types';

// Playlists can push within its own stack (Profile) and to root details.
type Nav = NativeStackNavigationProp<PlaylistsStackParamList & RootStackParamList>;

const GAP = 16;
const { width } = Dimensions.get('window');
const CARD_W = (width - GAP * 3) / 2;

export const PlaylistsScreen: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { playTracks } = usePlayer();

  const summaries = useAppSelector((s) => s.playlists.summaries);
  const playlistDetails = useAppSelector((s) => s.playlists.byId);
  // Hide the default "My Favorites" playlist (matches web; mobile has Liked Songs).
  const playlists = useMemo(() => summaries.filter((p) => !p.isDefault), [summaries]);

  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PlaylistSummary | null>(null);

  // Refresh the server playlists each time the tab gains focus.
  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchPlaylists());
    }, [dispatch]),
  );

  // Prefer the first track's CDN artwork (same source album covers use, so it's
  // reliable) over the server's web cover path. That needs the playlist's items,
  // so warm the detail for any non-empty playlist we haven't cached yet (once each).
  const requestedDetails = useRef<Set<string>>(new Set());
  useEffect(() => {
    playlists.forEach((pl) => {
      const haveItems = !!playlistDetails[pl.id]?.items.length;
      if (pl.itemCount > 0 && !haveItems && !requestedDetails.current.has(pl.id)) {
        requestedDetails.current.add(pl.id);
        void dispatch(fetchPlaylistDetail(pl.id));
      }
    });
  }, [playlists, playlistDetails, dispatch]);

  // Cover for a playlist card: the first item's artwork from the (warmed) detail,
  // falling back to the server cover (already absolutized) until it loads. byId
  // persists across list refetches, so the cover stays stable once resolved.
  const coverFor = useCallback(
    (pl: PlaylistSummary) => playlistDetails[pl.id]?.items?.[0]?.track.artwork || pl.cover || '',
    [playlistDetails],
  );

  const onCreate = (name: string) => {
    setCreating(false);
    void dispatch(createPlaylist({ name }))
      .unwrap()
      .then((summary) => {
        // Wait for the dialog's modal to finish dismissing before navigating —
        // otherwise its window lingers over the new screen and blocks all touches
        // (the screen looks frozen). 350ms covers the fade-out animation.
        setTimeout(() => navigation.navigate('PlaylistDetails', { playlistId: summary.id }), 350);
      })
      .catch(() => undefined);
  };

  const openPlaylist = useCallback(
    (pl: PlaylistSummary) => navigation.navigate('PlaylistDetails', { playlistId: pl.id }),
    [navigation],
  );

  // Play opens the playlist and starts it from the top. Navigate first so the
  // screen appears immediately, then play from the cached detail when it's warm;
  // otherwise fetch it first, since a summary carries no tracks.
  const onPlay = useCallback(
    (pl: PlaylistSummary) => {
      openPlaylist(pl);

      const cached = playlistDetails[pl.id]?.items;
      if (cached?.length) {
        void playTracks(
          cached.map((i) => i.track),
          0,
        );
        return;
      }
      void dispatch(fetchPlaylistDetail(pl.id))
        .unwrap()
        .then((detail) => {
          if (detail.items.length) {
            void playTracks(
              detail.items.map((i) => i.track),
              0,
            );
          }
        })
        .catch(() => undefined);
    },
    [openPlaylist, playlistDetails, dispatch, playTracks],
  );

  const confirmDelete = () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target) void dispatch(deletePlaylist(target.id));
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display" numberOfLines={1} style={styles.headerTitle}>
          {t('tabs.playlists')}
        </AppText>
        <View style={styles.headerActions}>
          <IconButton name="add" size={26} onPress={() => setCreating(true)} />
          <ProfileButton size={32} onPress={() => navigation.navigate('Profile')} />
        </View>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(pl) => pl.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        renderItem={({ item: pl }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
            <Pressable onPress={() => openPlaylist(pl)}>
              <Artwork uri={coverFor(pl)} style={styles.cover} iconSize={28} />
              <View style={styles.countBadge}>
                <AppText variant="caption" style={styles.countText}>
                  {t('playlist.songCount', { count: pl.itemCount })}
                </AppText>
              </View>
            </Pressable>

            <View style={styles.cardBody}>
              <AppText variant="label" numberOfLines={1}>
                {pl.name}
              </AppText>

              <Pressable
                onPress={() => onPlay(pl)}
                disabled={pl.itemCount === 0}
                style={({ pressed }) => [
                  styles.playBtn,
                  {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radius.sm,
                    opacity: pl.itemCount === 0 ? 0.4 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <AppText variant="label" style={styles.playLabel}>
                  {t('common.play')}
                </AppText>
              </Pressable>

              <View style={styles.secondaryRow}>
                <Pressable
                  onPress={() => openPlaylist(pl)}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: theme.colors.backgroundElevated,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.sm,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <AppText variant="label" numberOfLines={1}>
                    {t('common.open')}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setPendingDelete(pl)}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: theme.colors.backgroundElevated,
                      borderColor: theme.colors.danger,
                      borderRadius: theme.radius.sm,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <AppText variant="label" numberOfLines={1} style={{ color: theme.colors.danger }}>
                    {t('common.delete')}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <AppText variant="bodySm" color="textMuted" style={styles.plEmpty}>
            {t('library.emptyPlaylists')}
          </AppText>
        }
      />

      <PlaylistNameDialog
        visible={creating}
        title={t('playlist.namePrompt')}
        confirmLabel={t('playlist.create')}
        onConfirm={onCreate}
        onCancel={() => setCreating(false)}
      />

      <ConfirmDialog
        visible={pendingDelete != null}
        title={t('playlist.delete')}
        message={t('playlist.deleteConfirm', { title: pendingDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  headerTitle: { flexShrink: 1, marginRight: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid: { paddingHorizontal: GAP, paddingTop: 8, paddingBottom: 24 },
  column: { gap: GAP, marginBottom: GAP },
  card: { width: CARD_W, overflow: 'hidden' },
  cover: { width: CARD_W, height: CARD_W, backgroundColor: '#222' },
  // Track count sits over the bottom-left of the cover, as in the web design.
  countBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: { color: '#FFFFFF' },
  cardBody: { padding: 10, gap: 8 },
  playBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38 },
  playLabel: { color: '#FFFFFF', fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  // Bordered so Delete reads as a real button on the card surface rather than
  // bare red text; height matches the Play button above it.
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 4,
    borderWidth: 1,
  },
  plEmpty: { paddingVertical: 8 },
});

export default PlaylistsScreen;
