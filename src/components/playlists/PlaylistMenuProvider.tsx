import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Track } from '@/types';
import { useAppDispatch, useAppSelector } from '@/hooks';
import {
  addAlbumToPlaylist,
  addTrackToPlaylist,
  createPlaylist,
  fetchLikes,
  fetchMembership,
  fetchPlaylists,
  toggleSongLike,
} from '@/redux';
import { useIsSongLiked } from '@/hooks';
import { TrackOptionsModal, TrackOption } from '@/components/modals';
import { PlaylistPickerSheet } from './PlaylistPickerSheet';
import { PlaylistNameDialog } from './PlaylistNameDialog';

interface PlaylistMenu {
  /** Open the "add this track to a playlist" picker directly. */
  addToPlaylist: (track: Track) => void;
  /** Open the picker to add a whole album (all its tracks) to a playlist. */
  addAlbumToPlaylist: (tracks: Track[]) => void;
  /** Open the generic track "⋮" options sheet (Like / Add to playlist). */
  openTrackOptions: (track: Track) => void;
}

const Ctx = createContext<PlaylistMenu | null>(null);

export function usePlaylistMenu(): PlaylistMenu {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePlaylistMenu must be used within a PlaylistMenuProvider');
  return ctx;
}

/**
 * Renders the "Add to playlist" UI (options sheet + playlist picker + create
 * dialog) exactly once, near the root, and exposes it via `usePlaylistMenu()` so
 * any track list can offer "Add to playlist" without managing its own modals.
 */
export const PlaylistMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const playlists = useAppSelector((s) => s.playlists.summaries);

  // Load the user's playlists (+ membership) and likes once signed in, so the
  // "add to playlist" picker and heart state are ready from any track list
  // without visiting Library.
  useEffect(() => {
    if (userId) {
      void dispatch(fetchPlaylists());
      void dispatch(fetchMembership());
      void dispatch(fetchLikes());
    }
  }, [userId, dispatch]);

  // The default "My Favorites" playlist is hidden from pickers (matches web).
  const pickable = useMemo(() => playlists.filter((p) => !p.isDefault), [playlists]);

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  // The pending add target: one or more tracks to add to the chosen playlist.
  const [pickerTracks, setPickerTracks] = useState<Track[] | null>(null);
  const [namingTracks, setNamingTracks] = useState<Track[] | null>(null);

  const addToPlaylist = useCallback((track: Track) => setPickerTracks([track]), []);
  const addAlbumToPlaylistMenu = useCallback(
    (tracks: Track[]) => (tracks.length ? setPickerTracks(tracks) : undefined),
    [],
  );
  const openTrackOptions = useCallback((track: Track) => setOptionsTrack(track), []);

  const value = useMemo<PlaylistMenu>(
    () => ({ addToPlaylist, addAlbumToPlaylist: addAlbumToPlaylistMenu, openTrackOptions }),
    [addToPlaylist, addAlbumToPlaylistMenu, openTrackOptions],
  );

  /** Add the pending tracks to a playlist (single -> addTrack, many -> bulk). */
  const addTracksTo = useCallback(
    (playlistId: string, tracks: Track[]) => {
      if (tracks.length === 1) void dispatch(addTrackToPlaylist({ playlistId, track: tracks[0] }));
      else void dispatch(addAlbumToPlaylist({ playlistId, tracks }));
    },
    [dispatch],
  );

  // Defer opening the next modal until the current one has finished dismissing —
  // presenting two RN modals in the same frame can swallow the second on iOS.
  const handoff = useCallback((open: () => void) => {
    setTimeout(open, 260);
  }, []);

  const isFavorite = useIsSongLiked(optionsTrack ?? { albumId: '', trackNumber: undefined });
  const trackOptions: TrackOption[] = [
    {
      key: 'like',
      label: isFavorite ? t('player.removeFromLiked') : t('player.like'),
      icon: isFavorite ? 'heart' : 'heart-outline',
      onPress: (track) => dispatch(toggleSongLike(track)),
    },
    {
      key: 'addToPlaylist',
      label: t('playlist.addToPlaylist'),
      icon: 'add-circle-outline',
      onPress: (track) => handoff(() => setPickerTracks([track])),
    },
  ];

  const onPick = (playlistId: string) => {
    if (pickerTracks) addTracksTo(playlistId, pickerTracks);
    setPickerTracks(null);
  };

  const onConfirmCreate = (name: string) => {
    const tracks = namingTracks;
    setNamingTracks(null);
    void dispatch(createPlaylist({ name }))
      .unwrap()
      .then((summary) => {
        if (tracks) addTracksTo(summary.id, tracks);
      })
      .catch(() => undefined);
  };

  return (
    <Ctx.Provider value={value}>
      {children}

      <TrackOptionsModal
        track={optionsTrack}
        options={trackOptions}
        onClose={() => setOptionsTrack(null)}
      />

      <PlaylistPickerSheet
        visible={pickerTracks != null}
        playlists={pickable}
        onPick={onPick}
        onCreateNew={() => {
          const tracks = pickerTracks;
          setPickerTracks(null);
          handoff(() => setNamingTracks(tracks));
        }}
        onClose={() => setPickerTracks(null)}
      />

      <PlaylistNameDialog
        visible={namingTracks != null}
        title={t('playlist.namePrompt')}
        confirmLabel={t('playlist.create')}
        onConfirm={onConfirmCreate}
        onCancel={() => setNamingTracks(null)}
      />
    </Ctx.Provider>
  );
};
