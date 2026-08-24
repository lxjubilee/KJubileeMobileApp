import { authClient } from '@/services/auth/authClient';
import { logger } from '@/utils';
import { getSessionId } from './session';
import type { PlayPayload } from './types';

/**
 * Fire-and-forget client for the listening-analytics ingestion API
 * (`/api/analytics/*` on api.kjubilee.com). Uses the shared `authClient`
 * (Bearer + transparent 401-refresh), the same host as reviews/likes/playlists.
 * These calls feed the web admin analytics dashboard (plays, completion, skips,
 * active listeners); failures are swallowed so tracking never disrupts playback.
 */

const BASE = '/api/analytics';

export const analyticsApi = {
  /** Record one finished/skipped/abandoned play. */
  recordPlay(payload: PlayPayload): void {
    if (!payload.song_id || payload.listening_seconds < 1) return;
    authClient
      .post(`${BASE}/play`, { session_id: getSessionId(), source: 'other', ...payload })
      .catch((e) => logger.debug('analytics play failed', e?.message));
  },

  /** Presence heartbeat — sent on play and every ~25s while playing. */
  pingNowPlaying(songUuid: string): void {
    if (!songUuid) return;
    authClient
      .post(`${BASE}/now-playing`, { song_id: songUuid, session_id: getSessionId() })
      .catch(() => undefined);
  },

  /** Clear presence — sent on pause/stop/queue-end. */
  stopNowPlaying(): void {
    authClient
      .post(`${BASE}/now-playing/stop`, { session_id: getSessionId() })
      .catch(() => undefined);
  },
};
