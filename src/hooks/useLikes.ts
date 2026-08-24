import { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '@/redux';
import { Album, Track } from '@/types';
import { songLikeKey, albumLikeKey, getAlbumUuidMap } from '@/services/likes';
import { getSongUuidMap } from '@/services/playlists';
import { useVisibleTracks, useVisibleAlbums } from './useVisibleCatalog';

/** Is this track liked? (false for tracks with no track number.) */
export function useIsSongLiked(track: Pick<Track, 'albumId' | 'trackNumber'>): boolean {
  const key = songLikeKey(track);
  return useAppSelector((s) => (key ? !!s.likes.keys[key] : false));
}

/** Is this album liked? */
export function useIsAlbumLiked(album: Pick<Album, 'id'>): boolean {
  const key = albumLikeKey(album);
  return useAppSelector((s) => !!s.likes.keys[key]);
}

/** Count of liked songs (drives the Library "Favorites" shortcut). */
export function useLikedSongCount(): number {
  return useAppSelector(
    (s) => Object.keys(s.likes.keys).filter((k) => k.startsWith('song:')).length,
  );
}

/**
 * The liked songs resolved to playable local `Track`s (for the LikedSongs
 * screen). Liked song uuids -> local Track via the catalog reverse map (built
 * once, cached); uuids not in the catalog are dropped. Never language-filtered —
 * a personal collection. `loading` is true only until the reverse map is ready.
 */
export function useLikedTracks(): { tracks: Track[]; loading: boolean } {
  const keys = useAppSelector((s) => s.likes.keys);
  const [reverse, setReverse] = useState<Map<string, Track> | null>(null);

  useEffect(() => {
    let active = true;
    getSongUuidMap()
      .then((m) => active && setReverse(m))
      .catch(() => active && setReverse(new Map()));
    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(() => {
    if (!reverse) return [];
    const out: Track[] = [];
    for (const k of Object.keys(keys)) {
      if (!k.startsWith('song:')) continue;
      const t = reverse.get(k.slice('song:'.length));
      if (t) out.push(t);
    }
    return out;
  }, [reverse, keys]);

  const tracks = useVisibleTracks(resolved, { filterByLanguage: false });
  return { tracks, loading: reverse == null };
}

/**
 * The liked albums resolved to local `Album`s (for the Library grid). Never
 * language-filtered. `loading` is true only until the album reverse map is ready.
 */
export function useLikedAlbums(): { albums: Album[]; loading: boolean } {
  const keys = useAppSelector((s) => s.likes.keys);
  const [reverse, setReverse] = useState<Map<string, Album> | null>(null);

  useEffect(() => {
    let active = true;
    getAlbumUuidMap()
      .then((m) => active && setReverse(m))
      .catch(() => active && setReverse(new Map()));
    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(() => {
    if (!reverse) return [];
    const out: Album[] = [];
    for (const k of Object.keys(keys)) {
      if (!k.startsWith('album:')) continue;
      const a = reverse.get(k.slice('album:'.length));
      if (a) out.push(a);
    }
    return out;
  }, [reverse, keys]);

  const albums = useVisibleAlbums(resolved, { filterByLanguage: false });
  return { albums, loading: reverse == null };
}
