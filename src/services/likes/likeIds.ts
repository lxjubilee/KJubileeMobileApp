import { Album, Track } from '@/types';
import { getCatalogIndex, peekCatalogIndex } from '@/services/catalog';
import type { CatalogIndex } from '@/services/catalog';
import { albumUuid, trackSongUuid } from '@/services/playlists';

/**
 * Membership keys for the likes API. The backend's `GET /api/me/likes/ids`
 * returns `"<type>:<uuid>"` strings (e.g. `"song:<uuid>"`, `"album:<uuid>"`),
 * where the uuid is the SAME deterministic uuid-v5 the playlist/review endpoints
 * use. We build the identical key locally to check "is this liked?" in O(1) and
 * to know which uuid to POST/DELETE. See [[catalog-codes-vs-backend-uuids]].
 */

/** Like-key for a track, or null if it has no track number (can't be liked). */
export function songLikeKey(track: Pick<Track, 'albumId' | 'trackNumber'>): string | null {
  const uuid = trackSongUuid(track);
  return uuid ? `song:${uuid}` : null;
}

/** Like-key for an album (its catalog code -> deterministic album uuid). */
export function albumLikeKey(album: Pick<Album, 'id'>): string {
  return `album:${albumUuid(album.id)}`;
}

// --- Reverse map: server album uuid -> local Album ---------------------------
// Mirrors getSongUuidMap() in playlists/songId.ts. Built lazily from the catalog
// index and cached; lets the Library resolve liked album uuids back to Albums.

let albumMap: Map<string, Album> | null = null;

function build(index: CatalogIndex): Map<string, Album> {
  const map = new Map<string, Album>();
  for (const album of index.albumsById.values()) {
    map.set(albumUuid(album.id), album);
  }
  return map;
}

/** Resolve album uuids -> local Albums (async; ensures the catalog is loaded). */
export async function getAlbumUuidMap(): Promise<Map<string, Album>> {
  if (!albumMap) albumMap = build(await getCatalogIndex());
  return albumMap;
}

/** Synchronous peek; null if the catalog index hasn't built yet. */
export function peekAlbumUuidMap(): Map<string, Album> | null {
  if (albumMap) return albumMap;
  const index = peekCatalogIndex();
  if (!index) return null;
  albumMap = build(index);
  return albumMap;
}

/** Drop the reverse map so it rebuilds after a manifest/catalog refresh. */
export function invalidateAlbumUuidMap(): void {
  albumMap = null;
}
