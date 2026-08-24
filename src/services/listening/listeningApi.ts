import { authClient } from '@/services/auth/authClient';
import { logger } from '@/utils';
import type { PlayIntent } from './types';

/**
 * Thin client for the listening-entitlement gate (`/api/listening/*` on
 * api.kjubilee.com). Uses the shared `authClient` (Bearer + transparent
 * 401-refresh), the same host as likes/reviews/analytics.
 *
 * `intent` is the server-authoritative, per-track check that mirrors the web
 * player: it advances the Free-plan daily counter and returns whether the track
 * plays in full or is capped to a preview. It fails OPEN (resolves `null`) so a
 * network/API error never blocks playback.
 */

const BASE = '/api/listening';

export const listeningApi = {
  /**
   * Resolve whether the given song plays in full or as a preview, advancing the
   * daily counter server-side. `songUuid` is the deterministic song UUID (see
   * `trackSongUuid`), NOT the catalog code. Returns `null` on any failure (fail open).
   */
  intent: async (songUuid?: string): Promise<PlayIntent | null> => {
    try {
      const { data } = await authClient.post<PlayIntent>(`${BASE}/intent`, {
        song_id: songUuid,
      });
      return data;
    } catch (e) {
      logger.debug('listening intent failed', (e as Error)?.message);
      return null;
    }
  },
};
