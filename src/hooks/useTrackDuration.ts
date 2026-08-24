import { useEffect, useState } from 'react';
import { Track } from '@/types';
import { cdnUrl } from '@/utils';
import { getAudioDuration } from '@/services/audio';

/**
 * Resolves a track's real playback duration (seconds). The catalog manifest has
 * no durations (tracks arrive as `duration: 0`), so for those we lazily read it
 * from the audio file header — cached per URL, so a list resolves each track once.
 * Returns 0 until known.
 */
export function useTrackDuration(track: Track): number {
  const [duration, setDuration] = useState(track.duration > 0 ? track.duration : 0);

  useEffect(() => {
    if (track.duration > 0) {
      setDuration(track.duration);
      return;
    }
    let active = true;
    getAudioDuration(cdnUrl(track.url)).then((seconds) => {
      if (active && seconds > 0) setDuration(seconds);
    });
    return () => {
      active = false;
    };
  }, [track.url, track.duration]);

  return duration;
}
