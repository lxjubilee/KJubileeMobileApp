/**
 * Deterministic catalog ids.
 *
 * The backend keys songs and albums by a uuid v5 derived from the catalog code,
 * while the mobile catalog carries the codes themselves. Everything that talks
 * to a server endpoint about a specific track or album — likes, reviews,
 * listening analytics, the playback gate — converts through here.
 *
 * These lived under `services/playlists` while playlists were the only feature
 * computing them. They are not playlist-specific and outlived that feature.
 */
export {
  songUuid,
  albumUuid,
  trackSongUuid,
  getSongUuidMap,
  peekSongUuidMap,
  invalidateSongUuidMap,
} from './songId';
