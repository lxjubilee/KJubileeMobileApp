import { authClient } from '@/services/auth/authClient';
import { getSessionId } from '@/services/analytics/session';
import { logger } from '@/utils';
import type { RadioStation } from '@/services/radio';

/**
 * Listener engagement (`POST /api/radio/feedback`) — the thumb.
 *
 * The endpoint is an append-only log on the CDN with nothing to read back, so
 * what this device has liked is remembered locally (`stationLikesSlice`) — the
 * website does the same in `localStorage['kjubilee.thumbs']`. It accepts guests;
 * a signed-in listener's Bearer token is attached by `authClient` and the server
 * records their user id alongside the event.
 */

export type StationThumbEvent = 'thumb_up' | 'thumb_clear';

/** Fire-and-forget. A failed beacon must never undo the tap on screen. */
export function sendStationThumb(station: RadioStation, event_type: StationThumbEvent): void {
  authClient
    .post('/api/radio/feedback', {
      station_id: station.slug,
      station_name: station.name,
      event_type,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
    })
    .catch((e) => logger.debug('[feedback] thumb not recorded', e?.status ?? '', e?.message ?? e));
}
