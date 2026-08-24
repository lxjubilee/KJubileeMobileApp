import { useCallback, useEffect, useState } from 'react';
import type { RatingDistribution, ReviewSummary, ReviewTargetType } from '@/types';
import { reviewsApi, targetKey } from '@/services/reviews';
import type { ApiError } from '@/services/api';
import { logger } from '@/utils';

const emptyDistribution = (): RatingDistribution => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

/** A zero-state summary for a target with no ratings yet. */
export const emptySummary = (type: ReviewTargetType, id: string): ReviewSummary => ({
  targetType: type,
  targetId: id,
  average: null,
  ratingCount: 0,
  reviewCount: 0,
  distribution: emptyDistribution(),
  mine: null,
});

export interface UseReviews {
  summary: ReviewSummary | null;
  loading: boolean;
  error: string | null;
  /** Replace the summary locally (e.g. after the composer saves/deletes). */
  applySummary: (summary: ReviewSummary) => void;
  reload: () => void;
}

/**
 * Loads the aggregate rating summary (+ the caller's own rating) for a single
 * target and keeps it in local state — reviews are server-authoritative, so
 * nothing here is persisted. `applySummary` lets the composer push the fresh
 * summary the upsert/delete endpoints already return, avoiding a refetch.
 */
export function useReviews(type: ReviewTargetType, id: string | undefined): UseReviews {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);
    reviewsApi
      .getSummary(type, id)
      .then((s) => active && setSummary(s))
      .catch((e: ApiError) => {
        if (!active) return;
        logger.warn('reviews summary failed', e?.message);
        setError(e?.message ?? 'Could not load ratings.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [type, id]);

  useEffect(() => reload(), [reload]);

  return { summary, loading, error, applySummary: setSummary, reload };
}

/**
 * One song to fetch a summary for: `localId` keys the result for the UI (the
 * catalog `Track.id`), `targetId` is the server song uuid the reviews API keys
 * by (from `trackSongUuid`). The two differ because the mobile catalog uses
 * codes while the backend keys by a deterministic uuid — see songId.ts.
 */
export interface SongSummaryTarget {
  localId: string;
  targetId: string;
}

export interface UseSongSummaries {
  /** Summaries keyed by the local `Track.id`. */
  summaries: Record<string, ReviewSummary>;
  /** Replace one song's summary locally (by local `Track.id`) after it is rated. */
  applyOne: (localId: string, summary: ReviewSummary) => void;
}

/**
 * Batch-loads the rating summaries for a list of songs in one request, keyed by
 * the local `Track.id`. Missing songs (no ratings yet) resolve to a zero-state
 * summary so the per-row control always has something to render.
 */
export function useSongSummaries(songs: SongSummaryTarget[]): UseSongSummaries {
  const idsKey = songs.map((s) => s.targetId).join(',');
  const [summaries, setSummaries] = useState<Record<string, ReviewSummary>>({});

  useEffect(() => {
    if (!songs.length) {
      setSummaries({});
      return;
    }
    let active = true;
    reviewsApi
      .batchSummaries(songs.map((s) => ({ type: 'song' as const, id: s.targetId })))
      .then((map) => {
        if (!active) return;
        const bySong: Record<string, ReviewSummary> = {};
        for (const s of songs) {
          bySong[s.localId] = map[targetKey('song', s.targetId)] ?? emptySummary('song', s.targetId);
        }
        setSummaries(bySong);
      })
      .catch((e: ApiError) => logger.warn('song summaries failed', e?.message));
    return () => {
      active = false;
    };
    // idsKey captures the set of songs; `songs` identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const applyOne = useCallback(
    (localId: string, summary: ReviewSummary) =>
      setSummaries((prev) => ({ ...prev, [localId]: summary })),
    [],
  );

  return { summaries, applyOne };
}
