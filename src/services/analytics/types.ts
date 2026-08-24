/** Wire shapes for the listening-analytics ingestion API (`/api/analytics/*`). */

export type PlaybackSource =
  | 'album'
  | 'playlist'
  | 'search'
  | 'recommendation'
  | 'radio'
  | 'direct'
  | 'other';

/**
 * Body for `POST /api/analytics/play`. The server resolves album/artist from
 * `song_id`, parses device from the User-Agent, and derives `completion_pct`,
 * `completed` (≥90%), and `skipped` (<80%) from `listening_seconds` vs
 * `duration_seconds` when those flags are omitted.
 */
export interface PlayPayload {
  /** Backend song UUID (see songId.ts `trackSongUuid`), NOT the catalog code. */
  song_id: string;
  session_id?: string;
  source?: PlaybackSource;
  started_at?: string;
  ended_at?: string;
  listening_seconds: number;
  duration_seconds?: number;
  completed?: boolean;
  skipped?: boolean;
}
