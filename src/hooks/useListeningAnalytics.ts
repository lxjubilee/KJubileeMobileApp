import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/redux';
import type { Track } from '@/types';
import { trackSongUuid } from '@/services/catalogIds';
import { analyticsApi } from '@/services/analytics';
import { isExpoGo, Event, State, useTrackPlayerEvents } from '@/services/music';

/**
 * Emits listening-analytics events (`/api/analytics/*`) off the track-player
 * lifecycle so mobile plays show up in the web admin dashboard — the same data
 * the web player produces. MUST be mounted exactly once near the root (next to
 * usePlayerSync) to avoid duplicate listeners.
 *
 *  - `play` is recorded for the PREVIOUS track whenever the active track changes
 *    or the queue ends, using the last known position/duration; the server
 *    derives completed/skipped from listening vs duration.
 *  - `now-playing` is pinged on play and every ~25s, and cleared on pause/stop.
 *
 * In Expo Go the native module is absent, so the subscription is skipped
 * (`isExpoGo` is constant, keeping the conditional hook stable).
 */

const HEARTBEAT_MS = 25_000;
const ANALYTICS_EVENTS = isExpoGo
  ? []
  : [
      Event.PlaybackActiveTrackChanged,
      Event.PlaybackProgressUpdated,
      Event.PlaybackQueueEnded,
      Event.PlaybackState,
    ];

interface CurrentPlay {
  songUuid: string;
  startedAtMs: number;
  lastPosition: number;
  duration: number;
}

export function useListeningAnalytics(): void {
  const queue = useAppSelector((s) => s.player.queue);
  const authed = useAppSelector((s) => s.auth.user != null);

  const queueRef = useRef<Track[]>(queue);
  const authedRef = useRef(authed);
  const currentRef = useRef<CurrentPlay | null>(null);
  /**
   * Whether presence was ever announced for this session.
   *
   * Load-bearing for radio. `stopNowPlaying()` takes no arguments, so it used to
   * fire on every pause and stop even when nothing had been announced — and a
   * radio segment never announces, because `trackSongUuid()` needs an album id
   * and a track number that a day-file entry does not have. The result was a
   * stream of "presence cleared" beacons for presence that was never set, all of
   * them against an endpoint that does not exist.
   *
   * Radio has no telemetry of its own by decision — not an omission. If it ever
   * gains any, it belongs in the radio engine, which knows the station and the
   * segment; this hook only understands the music catalog.
   */
  const announcedRef = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    authedRef.current = authed;
  }, [authed]);

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  /** Clear presence, but only if presence was ever announced. */
  const clearPresence = () => {
    if (!announcedRef.current || !authedRef.current) return;
    announcedRef.current = false;
    analyticsApi.stopNowPlaying();
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    const ping = () => {
      const cur = currentRef.current;
      if (cur && authedRef.current) {
        announcedRef.current = true;
        analyticsApi.pingNowPlaying(cur.songUuid);
      }
    };
    ping();
    heartbeatRef.current = setInterval(ping, HEARTBEAT_MS);
  };

  /** Record the in-progress play (if any) and clear it. */
  const flush = (position?: number) => {
    const play = currentRef.current;
    currentRef.current = null;
    if (!play || !authedRef.current) return;
    const listening = Math.round(position != null && position > 0 ? position : play.lastPosition);
    if (listening < 1) return;
    analyticsApi.recordPlay({
      song_id: play.songUuid,
      started_at: new Date(play.startedAtMs).toISOString(),
      ended_at: new Date().toISOString(),
      listening_seconds: listening,
      duration_seconds: play.duration > 0 ? Math.round(play.duration) : undefined,
    });
  };

  /** Begin tracking a newly active track (maps the engine id → catalog track). */
  const beginTrack = (tpTrack: { id?: string; duration?: number } | undefined) => {
    const domain = tpTrack?.id ? queueRef.current.find((t) => t.id === tpTrack.id) : undefined;
    const uuid = domain ? trackSongUuid(domain) : null;
    if (!uuid) {
      currentRef.current = null;
      return;
    }
    currentRef.current = {
      songUuid: uuid,
      startedAtMs: Date.now(),
      lastPosition: 0,
      duration: tpTrack?.duration && tpTrack.duration > 0 ? tpTrack.duration : domain?.duration ?? 0,
    };
    if (authedRef.current) startHeartbeat();
  };

  if (!isExpoGo) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTrackPlayerEvents(ANALYTICS_EVENTS, (event) => {
      if (event.type === Event.PlaybackProgressUpdated) {
        const cur = currentRef.current;
        if (cur) {
          cur.lastPosition = event.position;
          if (event.duration > 0) cur.duration = event.duration;
        }
        return;
      }
      if (event.type === Event.PlaybackActiveTrackChanged) {
        flush(event.lastPosition);
        if (event.track) {
          beginTrack(event.track);
        } else {
          // Queue drained: nothing new is active.
          currentRef.current = null;
          stopHeartbeat();
          clearPresence();
        }
        return;
      }
      if (event.type === Event.PlaybackQueueEnded) {
        flush(event.position);
        stopHeartbeat();
        clearPresence();
        return;
      }
      if (event.type === Event.PlaybackState) {
        if (event.state === State.Playing) {
          if (currentRef.current) startHeartbeat();
        } else if (
          event.state === State.Paused ||
          event.state === State.Stopped ||
          event.state === State.Ended
        ) {
          stopHeartbeat();
          clearPresence();
        }
      }
    });
  }

  // App teardown: stop the heartbeat and clear presence. (Mounted once for the
  // app's lifetime, so this only runs on shutdown.)
  useEffect(() => {
    return () => {
      stopHeartbeat();
      clearPresence();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
