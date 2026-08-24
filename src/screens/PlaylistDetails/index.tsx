import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  Screen,
  AppText,
  Artwork,
  Button,
  IconButton,
  Placeholder,
  ConfirmDialog,
} from '@/components/common';
import { TrackRow } from '@/components/cards';
import { PlaylistNameDialog } from '@/components/playlists';
import { FloatingMiniPlayer } from '@/components/player';
import { useTheme } from '@/context';
import { useAppDispatch, useAppSelector, usePlayer } from '@/hooks';
import {
  deletePlaylist,
  fetchPlaylistDetail,
  removeItemFromPlaylist,
  renamePlaylist,
  reorderPlaylistItems,
  toggleSongLike,
} from '@/redux';
import { shuffle as shuffleArray } from '@/utils';
import { songLikeKey } from '@/services/likes';
import type { PlaylistItem } from '@/services/playlists';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
// Pinned black header row (below the status bar) holding the back / options
// buttons — stays visible while the page scrolls (matches AlbumDetails).
const HEADER_HEIGHT = 38;
// Hero-sized cover: full content width, height tracking the artwork's aspect
// ratio under the same clamps as the Home hero / AlbumDetails.
const H_PADDING = 16;
const POSTER_W = width - H_PADDING * 2;
const POSTER_H_DEFAULT = Math.round(POSTER_W * 1.36);
const MIN_ASPECT = 0.6;
const MAX_ASPECT = 1.9;

export const PlaylistDetailsScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'PlaylistDetails'>['route']>();
  const id = params.playlistId;
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { playTracks, playFrom, currentTrack, isPlaying, toggle } = usePlayer();

  const detail = useAppSelector((s) => s.playlists.byId[id]);
  const summary = useAppSelector((s) => s.playlists.summaries.find((p) => p.id === id));
  const likeKeys = useAppSelector((s) => s.likes.keys);

  const [failed, setFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<PlaylistItem[]>([]);
  // Cover height, learned once the artwork loads, so the frame tracks its real
  // aspect ratio — exactly like the Home hero image / AlbumDetails.
  const [posterH, setPosterH] = useState(POSTER_H_DEFAULT);

  // Refresh detail whenever the screen gains focus (e.g. returning from Add Songs).
  useFocusEffect(
    useCallback(() => {
      setFailed(false);
      void dispatch(fetchPlaylistDetail(id))
        .unwrap()
        .catch(() => setFailed(true));
    }, [dispatch, id]),
  );

  const items = useMemo(() => detail?.items ?? [], [detail]);
  const tracks = useMemo(() => items.map((i) => i.track), [items]);
  const name = detail?.name ?? summary?.name ?? '';
  const cover = tracks[0]?.artwork ?? '';

  // "This playlist is the active queue" ≈ the current track belongs to it (its
  // tracks span many albums, so there's no single id to compare like an album).
  const isThisPlaylistActive =
    !!currentTrack && tracks.some((tr) => tr.id === currentTrack.id);
  const isThisPlaylistPlaying = isThisPlaylistActive && isPlaying;

  const onPlay = () => {
    // If this playlist is already the active queue, just pause/resume; otherwise
    // start it from the top.
    if (isThisPlaylistActive) {
      toggle();
    } else if (tracks.length) {
      void playTracks(tracks, 0);
    }
  };
  const onShuffle = () => {
    if (tracks.length) void playTracks(shuffleArray(tracks), 0);
  };

  const startEdit = () => {
    setOrder(items);
    setEditing(true);
  };
  const move = (from: number, to: number) =>
    setOrder((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  const saveOrder = () => {
    void dispatch(reorderPlaylistItems({ playlistId: id, orderedSongIds: order.map((i) => i.songId) }));
    setEditing(false);
  };

  if (failed && !detail) {
    return (
      <Screen>
        <View style={styles.topBarFixed}>
          <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        </View>
        <Placeholder icon="musical-notes-outline" title={t('playlist.notFound')} />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          // Start below the fixed header so the cover isn't hidden behind it.
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: 96 + insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.artFrame, { width: POSTER_W, height: posterH }]}>
            <Artwork
              uri={cover}
              style={styles.artImage}
              contentFit="cover"
              iconSize={Math.round(POSTER_W * 0.3)}
              onLoad={(e) => {
                const w = e.source?.width;
                const h = e.source?.height;
                if (!w || !h) return;
                const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, w / h));
                setPosterH(Math.round(POSTER_W / aspect));
              }}
            />
          </View>
          <AppText variant="display" style={styles.title} numberOfLines={2}>
            {name}
          </AppText>
          <AppText variant="bodySm" color="textMuted" style={styles.sub}>
            {t('playlist.songCount', { count: tracks.length })}
          </AppText>
        </View>

        {editing ? (
          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setEditing(false)} />
            <Button label={t('common.done')} icon="checkmark" onPress={saveOrder} />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              label={t('playlist.addSongs')}
              icon="add"
              variant="secondary"
              onPress={() => navigation.navigate('PlaylistAddSongs', { playlistId: id })}
            />
            <View style={styles.actionsRight}>
              <IconButton
                name="shuffle"
                size={26}
                onPress={onShuffle}
                style={styles.shuffle}
                disabled={!tracks.length}
              />
              <Button
                label={isThisPlaylistPlaying ? t('common.pause') : t('common.play')}
                icon={isThisPlaylistPlaying ? 'pause' : 'play'}
                onPress={onPlay}
              />
            </View>
          </View>
        )}

        {!detail ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : editing ? (
          <View style={styles.list}>
            {order.map((item, i) => (
              <View key={item.id} style={styles.editRow}>
                <AppText variant="body" numberOfLines={1} style={styles.editTitle}>
                  {item.track.title}
                </AppText>
                <IconButton
                  name="chevron-up"
                  size={22}
                  disabled={i === 0}
                  onPress={() => move(i, i - 1)}
                />
                <IconButton
                  name="chevron-down"
                  size={22}
                  disabled={i === order.length - 1}
                  onPress={() => move(i, i + 1)}
                  style={styles.downArrow}
                />
              </View>
            ))}
          </View>
        ) : tracks.length ? (
          <View style={styles.list}>
            {items.map((item, i) => (
              <TrackRow
                key={item.id}
                track={item.track}
                index={i + 1}
                isActive={currentTrack?.id === item.track.id}
                isFavorite={!!likeKeys[songLikeKey(item.track) ?? '']}
                onToggleFavorite={
                  songLikeKey(item.track) ? (tr) => dispatch(toggleSongLike(tr)) : undefined
                }
                onPress={() => playFrom(tracks, item.track.id)}
                onRemoveFromPlaylist={() =>
                  dispatch(
                    removeItemFromPlaylist({
                      playlistId: id,
                      itemId: item.id,
                      songId: item.songId,
                    }),
                  )
                }
                showDuration
              />
            ))}
          </View>
        ) : (
          <View style={styles.stateBox}>
            <Ionicons name="musical-notes-outline" size={56} color={theme.colors.iconMuted} />
            <AppText variant="h2" style={styles.emptyTitle}>
              {t('playlist.empty')}
            </AppText>
            <AppText variant="bodySm" color="textMuted" style={styles.emptyHint}>
              {t('playlist.emptyHint')}
            </AppText>
          </View>
        )}
      </ScrollView>

      {/* Solid-black safe-area band at the bottom so nothing scrolls behind the
          gesture/navigation bar. The top is covered by the fixed header below. */}
      {insets.bottom > 0 ? (
        <View style={[styles.safeBand, styles.safeBandBottom, { height: insets.bottom }]} pointerEvents="none" />
      ) : null}

      {/* Persistent black header with the back (and options) buttons — rendered
          outside the ScrollView so it stays pinned while the page scrolls. */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        {!editing ? (
          <IconButton name="ellipsis-horizontal" onPress={() => setMenuOpen(true)} />
        ) : null}
      </View>

      <FloatingMiniPlayer />

      {/* Modals mounted only while open (a stack of always-mounted RN <Modal>s wedges
          the Android UI thread on Old Arch). */}
      {menuOpen ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
            onPress={() => setMenuOpen(false)}
          >
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.colors.backgroundElevated,
                  borderTopLeftRadius: theme.radius.xl,
                  borderTopRightRadius: theme.radius.xl,
                  paddingBottom: 36 + insets.bottom,
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => {
                  setMenuOpen(false);
                  setTimeout(() => setRenaming(true), 260);
                }}
              >
                <Ionicons name="create-outline" size={22} color={theme.colors.icon} />
                <AppText variant="body" style={styles.menuLabel}>
                  {t('playlist.rename')}
                </AppText>
              </Pressable>
              {items.length > 1 ? (
                <Pressable
                  style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => {
                    setMenuOpen(false);
                    setTimeout(startEdit, 260);
                  }}
                >
                  <Ionicons name="swap-vertical-outline" size={22} color={theme.colors.icon} />
                  <AppText variant="body" style={styles.menuLabel}>
                    {t('playlist.reorder')}
                  </AppText>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => {
                  setMenuOpen(false);
                  setTimeout(() => setConfirmDelete(true), 260);
                }}
              >
                <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
                <AppText variant="body" color="danger" style={styles.menuLabel}>
                  {t('playlist.delete')}
                </AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {renaming ? (
        <PlaylistNameDialog
          visible
          title={t('playlist.rename')}
          confirmLabel={t('playlist.save')}
          initialName={name}
          onConfirm={(newName) => {
            void dispatch(renamePlaylist({ id, name: newName }));
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          visible
          title={t('playlist.delete')}
          message={t('playlist.deleteConfirm', { title: name })}
          confirmLabel={t('playlist.delete')}
          cancelLabel={t('common.cancel')}
          destructive
          onConfirm={() => {
            setConfirmDelete(false);
            setTimeout(() => {
              navigation.goBack();
              void dispatch(deletePlaylist(id));
            }, 350);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 96 },
  header: { alignItems: 'center', paddingBottom: 16 },
  topBarFixed: { paddingHorizontal: 12, paddingTop: 8 },
  // Solid-black header pinned to the top (outside the ScrollView) so the buttons
  // never scroll away; also covers the status-bar area (matches AlbumDetails).
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  // Full-bleed hero cover matching AlbumDetails: no padding, rounded corners
  // clipped via overflow; `#222` shows behind the artwork while it loads.
  artFrame: {
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  artImage: { flex: 1 },
  title: { textAlign: 'center', marginTop: 16, paddingHorizontal: 24 },
  sub: { marginTop: 6 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  actionsRight: { flexDirection: 'row', alignItems: 'center' },
  shuffle: { marginHorizontal: 14 },
  list: { paddingHorizontal: 16 },
  editRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  editTitle: { flex: 1, marginRight: 12 },
  downArrow: { marginLeft: 8 },
  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 72, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyHint: { marginTop: 8, textAlign: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuLabel: { marginLeft: 16 },
  safeBand: { position: 'absolute', left: 0, right: 0, backgroundColor: '#000' },
  safeBandBottom: { bottom: 0 },
});

export default PlaylistDetailsScreen;
