import { useEffect } from 'react';
import {
  useAppDispatch,
  useAppSelector,
  setCurrentTrack,
  setIsPlaying,
  setIsBuffering,
} from '@/redux';
import {
  isExpoGo,
  TrackPlayer,
  Event,
  State,
  useTrackPlayerEvents,
} from '@/services/music';

// Built lazily so `Event` (undefined in Expo Go) is never dereferenced there.
const SYNC_EVENTS = isExpoGo ? [] : [Event.PlaybackState, Event.PlaybackActiveTrackChanged];

// States that mean "playing or about to play". Treating Buffering/Loading as
// playing keeps the pause icon steady while a track buffers, instead of flicking
// back to the play icon between the tap and the first audio frame.
const PLAYING_STATES = isExpoGo ? [] : [State.Playing, State.Buffering, State.Loading];

// States that mean genuinely not playing. None/Ready are deliberately excluded:
// they fire transiently during reset()/load and must NOT flip the icon to "play"
// (which made the control flicker the instant the mini player appeared).
const PAUSED_STATES = isExpoGo ? [] : [State.Paused, State.Stopped, State.Ended, State.Error];

// States where the engine is fetching/decoding before audio plays — drives a
// small spinner on the play button so the wait reads as loading, not frozen.
const BUFFERING_STATES = isExpoGo ? [] : [State.Buffering, State.Loading];

/**
 * Bridges the track-player engine (source of truth) into Redux so the UI can
 * react. MUST be mounted exactly once, near the app root, to avoid duplicate
 * listeners. Components read state via useAppSelector / usePlayer.
 *
 * In Expo Go the native module is absent, so the hook + effect are skipped
 * entirely (`isExpoGo` is constant, so these conditional hooks are stable).
 */
export function usePlayerSync(): void {
  const dispatch = useAppDispatch();
  const queue = useAppSelector((s) => s.player.queue);

  if (!isExpoGo) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackPlayerEvents(SYNC_EVENTS, async (event) => {
      if (event.type === Event.PlaybackState) {
        // Only commit a definite play/pause; ignore transient None/Ready so the
        // optimistic state set on tap isn't undone mid-load.
        if (PLAYING_STATES.includes(event.state)) dispatch(setIsPlaying(true));
        else if (PAUSED_STATES.includes(event.state)) dispatch(setIsPlaying(false));
        dispatch(setIsBuffering(BUFFERING_STATES.includes(event.state)));
      }
      if (event.type === Event.PlaybackActiveTrackChanged) {
        const activeId = event.track?.id;
        if (activeId == null) return;
        const domainTrack = queue.find((t) => t.id === activeId);
        if (domainTrack) dispatch(setCurrentTrack(domainTrack));
      }
    });
  }

  // Keep play/pause state fresh on mount (e.g. after returning to foreground).
  useEffect(() => {
    if (isExpoGo) return;
    let cancelled = false;
    TrackPlayer.getPlaybackState()
      .then((s) => {
        if (!cancelled) dispatch(setIsPlaying(PLAYING_STATES.includes(s.state)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}
