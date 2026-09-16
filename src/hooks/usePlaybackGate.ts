import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector, setLimitReached } from '@/redux';
import type { Track } from '@/types';
import { trackSongUuid } from '@/services/catalogIds';
import { listeningApi } from '@/services/listening';
import { isExpoGo, Event, TrackPlayer, useTrackPlayerEvents } from '@/services/music';

/**
 * Server-authoritative Free-plan playback gate — the mobile mirror of the web
 * player's `beginPlay()` + preview cap (stores/player.ts + FooterPlayer.tsx).
 * MUST be mounted exactly once near the root (next to useListeningAnalytics).
 *
 *  - On every NEW active track (initial play, skip, or queue auto-advance) it
 *    asks `POST /api/listening/intent` whether the track plays in full or is
 *    capped to a preview. That call is what advances the daily counter server-side.
 *  - If the response is `mode:'limited'`, playback is capped: once the position
 *    reaches `preview_seconds`, the track is paused and the "Daily Limit Reached"
 *    popup is shown once for that track.
 *  - Fails OPEN (no cap) on any error, so a network hiccup never blocks playback.
 *    Paid users always get `mode:'full'`, so nothing is capped for them.
 *
 * In Expo Go the native module is absent, so the subscription is skipped
 * (`isExpoGo` is constant, keeping the conditional hook stable).
 */

const GATE_EVENTS = isExpoGo
  ? []
  : [Event.PlaybackActiveTrackChanged, Event.PlaybackProgressUpdated];

export function usePlaybackGate(): void {
  const dispatch = useAppDispatch();
  const queue = useAppSelector((s) => s.player.queue);
  const authed = useAppSelector((s) => s.auth.user != null);

  const queueRef = useRef<Track[]>(queue);
  const authedRef = useRef(authed);
  // Preview cap (seconds) for the CURRENT track, or null for uncapped/full play.
  const capRef = useRef<number | null>(null);
  // Whether the popup has already been shown for the current capped track.
  const promptedRef = useRef(false);
  // Song UUID of the active track — guards the async intent response against the
  // user skipping to another track before it resolves.
  const activeUuidRef = useRef<string | null>(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    authedRef.current = authed;
  }, [authed]);

  /** A new track became active: reset the cap and re-check entitlement. */
  const beginTrack = (tpTrack: { id?: string; duration?: number } | undefined) => {
    capRef.current = null;
    promptedRef.current = false;
    const domain = tpTrack?.id ? queueRef.current.find((t) => t.id === tpTrack.id) : undefined;
    const uuid = domain ? trackSongUuid(domain) : null;
    activeUuidRef.current = uuid;
    // TODO(backend): guests are UNCAPPED. `/api/listening/intent` is the only
    // thing that decides full-vs-preview and it is Bearer-authed, so a signed-out
    // listener asks nobody and is capped by nothing — and since sign-in became
    // optional, that is now a reachable state rather than a theoretical one.
    // Closing it needs the endpoint to accept an anonymous device identifier;
    // until then this is a known, accepted hole, not an oversight. A client-side
    // counter was considered and rejected: it would be the client deciding its
    // own entitlement, which is exactly what this gate exists to avoid.
    if (!uuid || !authedRef.current) return;
    // Ask the server whether this track plays in full or as a preview. This is
    // the authoritative gate (and what increments the Free-plan daily counter).
    void listeningApi.intent(uuid).then((intent) => {
      if (!intent) return; // fail open
      if (activeUuidRef.current !== uuid) return; // user already moved on
      if (intent.mode === 'limited') {
        capRef.current = intent.preview_seconds || 60;
      }
    });
  };

  if (!isExpoGo) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackPlayerEvents(GATE_EVENTS, (event) => {
      if (event.type === Event.PlaybackProgressUpdated) {
        const cap = capRef.current;
        if (cap != null && event.position >= cap) {
          // Stop at the preview boundary and hold the position there so the user
          // can't scrub or resume past it (matches the web preview cap).
          void TrackPlayer.pause();
          void TrackPlayer.seekTo(cap);
          if (!promptedRef.current) {
            promptedRef.current = true;
            dispatch(setLimitReached(true));
          }
        }
        return;
      }
      if (event.type === Event.PlaybackActiveTrackChanged) {
        beginTrack(event.track);
      }
    });
  }
}
