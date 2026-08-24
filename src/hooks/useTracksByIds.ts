import { useEffect, useMemo, useState } from 'react';
import { getCatalogIndex } from '@/services/catalog';
import { ID, Track } from '@/types';

export interface UseTracksByIds {
  /** Resolved tracks in the same order as `ids`; ids missing from the catalog are dropped. */
  tracks: Track[];
  /** True until the catalog index has loaded. */
  loading: boolean;
}

/**
 * Resolves a list of track ids to full `Track` objects via the catalog index.
 * Liked songs and playlists both store ids only, so this is the single place
 * that flattens the per-artist track lists into an id lookup and maps ids back
 * to tracks. `ids` should be a referentially-stable array (e.g. a Redux
 * selector result) so the memo doesn't recompute every render.
 */
export function useTracksByIds(ids: ID[]): UseTracksByIds {
  const [byId, setById] = useState<Map<string, Track> | null>(null);

  useEffect(() => {
    let active = true;
    getCatalogIndex()
      .then((index) => {
        if (!active) return;
        const map = new Map<string, Track>();
        for (const tracks of index.tracksByArtist.values()) {
          for (const track of tracks) map.set(track.id, track);
        }
        setById(map);
      })
      .catch(() => active && setById(new Map()));
    return () => {
      active = false;
    };
  }, []);

  const tracks = useMemo(
    () => (byId ? ids.map((id) => byId.get(id)).filter((tr): tr is Track => tr != null) : []),
    [byId, ids],
  );

  // Nothing to resolve when there are no ids — report ready immediately so empty
  // lists (e.g. a new playlist) render their empty state without a loading pass.
  return { tracks, loading: byId == null && ids.length > 0 };
}
