import { Track } from '@/types';
import { getCatalogIndex, peekCatalogIndex } from '@/services/catalog';
import type { CatalogIndex } from '@/services/catalog';
import { uuidv5 } from './uuidv5';

/**
 * Maps between the mobile catalog's track ids and the server's playlist
 * `song_id`s. The backend stores playlist songs by a DETERMINISTIC uuid v5 —
 * `songUuid(albumCode, n) = uuidv5('song:' + UPPER(code) + ':' + n, NAMESPACE)`
 * (see app/api/src/ids.js). The mobile app's `Track.albumId` is the album code
 * and `Track.trackNumber` is `n`, so we can compute the same uuid to add tracks,
 * and build a reverse map to resolve server items back to playable `Track`s.
 */

// MUST match app/api/src/ids.js (and the web/db) so uuids are identical everywhere.
const JV_NAMESPACE = 'f3a1e2d4-5b6c-4d7e-8f90-1a2b3c4d5e6f';

export function songUuid(albumCode: string, trackNumber: number | string): string {
  return uuidv5(`song:${String(albumCode).toUpperCase()}:${String(trackNumber)}`, JV_NAMESPACE);
}

/**
 * The server's deterministic id for an album — `uuidv5('album:' + UPPER(code))`.
 * The mobile `Album.id` is the catalog code, so review endpoints (which key by
 * this uuid, like playlists key songs by `songUuid`) must convert through here.
 */
export function albumUuid(albumCode: string): string {
  return uuidv5(`album:${String(albumCode).toUpperCase()}`, JV_NAMESPACE);
}

/** The server `song_id` for a domain Track, or null if it has no track number. */
export function trackSongUuid(track: Pick<Track, 'albumId' | 'trackNumber'>): string | null {
  if (track.trackNumber == null) return null;
  return songUuid(track.albumId, track.trackNumber);
}

// --- Reverse map: server song_id (uuid) -> local Track ------------------------
// Built lazily from the catalog index and cached; invalidated on catalog refresh.

let reverseMap: Map<string, Track> | null = null;

function build(index: CatalogIndex): Map<string, Track> {
  const map = new Map<string, Track>();
  for (const album of index.albumsById.values()) {
    for (const t of album.tracks ?? []) {
      if (t.trackNumber == null) continue;
      map.set(songUuid(album.id, t.trackNumber), t);
    }
  }
  return map;
}

/** Resolve uuids -> local Tracks (async; ensures the catalog index is loaded). */
export async function getSongUuidMap(): Promise<Map<string, Track>> {
  if (!reverseMap) reverseMap = build(await getCatalogIndex());
  return reverseMap;
}

/** Synchronous peek; null if the catalog index hasn't built yet. */
export function peekSongUuidMap(): Map<string, Track> | null {
  if (reverseMap) return reverseMap;
  const index = peekCatalogIndex();
  if (!index) return null;
  reverseMap = build(index);
  return reverseMap;
}

/** Drop the reverse map so it rebuilds after a manifest/catalog refresh. */
export function invalidateSongUuidMap(): void {
  reverseMap = null;
}
