import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Track } from '@/types';
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
 * the sheet itself was never playlist machinery: it also carries Like. Only the
 * "add to playlist" option and its picker went.
 */
export const TrackMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  const openTrackOptions = useCallback((track: Track) => setOptionsTrack(track), []);
  const value = useMemo<TrackMenu>(() => ({ openTrackOptions }), [openTrackOptions]);

  // Like is hidden: song likes post to `/api/me/likes`, which kjubilee.com
  // answers with a 404 — a heart that filled and then silently emptied. Nothing
  // opens this sheet today either, so it stays empty until a song-likes API
  // gives it something real to carry.
  const trackOptions: TrackOption[] = [];

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
