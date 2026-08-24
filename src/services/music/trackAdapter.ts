import type { Track as TPTrack } from 'react-native-track-player';
import { Track } from '@/types';
import { cdnUrl } from '@/utils';

/**
 * Convert a KJubilee domain Track into the shape react-native-track-player
 * expects, resolving all CDN-relative paths to absolute URLs in the process.
 */
export function toTPTrack(track: Track): TPTrack {
  const artwork = cdnUrl(track.artwork);
  return {
    id: track.id,
    url: cdnUrl(track.url),
    title: track.title,
    artist: track.artistName,
    album: track.albumName,
    // Omit when unavailable so the lock screen doesn't try to load an empty URL.
    artwork: artwork || undefined,
    duration: track.duration,
  };
}

export const toTPTracks = (tracks: Track[]): TPTrack[] => tracks.map(toTPTrack);
