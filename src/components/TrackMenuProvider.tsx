import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Track } from '@/types';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchLikes, toggleSongLike } from '@/redux';
import { useIsSongLiked } from '@/hooks';
import { TrackOptionsModal, TrackOption } from '@/components/modals';

interface TrackMenu {
  /** Open the track "⋮" options sheet. */
  openTrackOptions: (track: Track) => void;
}

const Ctx = createContext<TrackMenu | null>(null);

export function useTrackMenu(): TrackMenu {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTrackMenu must be used within a TrackMenuProvider');
  return ctx;
}

/**
 * Renders the track options sheet exactly once, near the root, and exposes it
 * via `useTrackMenu()` so any track list can offer the "⋮" menu without
 * managing its own modal.
 *
 * Was `PlaylistMenuProvider`. Playlists are gone — radio has no playlists — but
 * the sheet itself was never playlist machinery: it also carries Like, and it
 * is where the user's likes are warmed on sign-in so the heart state is right
 * from any track list. Only the "add to playlist" option and its picker went.
 */
export const TrackMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);

  // Load the user's likes once signed in, so the heart state is ready from any
  // track list without visiting a particular screen first.
  useEffect(() => {
    if (userId) void dispatch(fetchLikes());
  }, [userId, dispatch]);

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  const openTrackOptions = useCallback((track: Track) => setOptionsTrack(track), []);
  const value = useMemo<TrackMenu>(() => ({ openTrackOptions }), [openTrackOptions]);

  const isFavorite = useIsSongLiked(optionsTrack ?? { albumId: '', trackNumber: undefined });
  const trackOptions: TrackOption[] = [
    {
      key: 'like',
      label: isFavorite ? t('player.removeFromLiked') : t('player.like'),
      icon: isFavorite ? 'heart' : 'heart-outline',
      onPress: (track) => dispatch(toggleSongLike(track)),
    },
  ];

  return (
    <Ctx.Provider value={value}>
      {children}
      <TrackOptionsModal
        track={optionsTrack}
        options={trackOptions}
        onClose={() => setOptionsTrack(null)}
      />
    </Ctx.Provider>
  );
};
