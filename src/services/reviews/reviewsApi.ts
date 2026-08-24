import { authClient } from '@/services/auth/authClient';
import type {
  MyReview,
  MyReviewRow,
  ReviewContributions,
  ReviewListPage,
  ReviewSort,
  ReviewSummary,
  ReviewTargetType,
} from '@/types';
import type {
  BatchSummariesResponseDto,
  ContributionsDto,
  DeleteReviewResponseDto,
  MyReviewRowDto,
  ReviewListResponseDto,
  ReviewSummaryDto,
  UpsertReviewResponseDto,
} from './dto';
import {
  mapContributions,
  mapMyReview,
  mapMyReviewRow,
  mapReviewListPage,
  mapSummary,
} from './mappers';

/**
 * Thin client for the public reviews API (`/api/reviews/*` on
 * api.kjubilee.com). Uses the shared `authClient` (Bearer + transparent
 * 401-refresh) so the caller's own rating (`mine`) is populated when signed in.
 * Errors reject as the normalized `ApiError` from the client.
 */

const BASE = '/api/reviews';

export interface ReviewTarget {
  type: ReviewTargetType;
  id: string;
}

/** Build the `"{type}:{id}"` key the batch-summaries endpoint returns. */
export const targetKey = (type: ReviewTargetType, id: string): string => `${type}:${id}`;

export interface UpsertReviewBody {
  stars: number;
  title?: string | null;
  body?: string | null;
}

export const reviewsApi = {
  /** Aggregate summary (+ my rating) for a single target. */
  getSummary: async (type: ReviewTargetType, id: string): Promise<ReviewSummary> => {
    const { data } = await authClient.get<ReviewSummaryDto>(`${BASE}/${type}/${id}/summary`);
    return mapSummary(data);
  },

  /** Batch summaries for many targets, keyed by `"{type}:{id}"`. */
  batchSummaries: async (targets: ReviewTarget[]): Promise<Record<string, ReviewSummary>> => {
    if (!targets.length) return {};
    const { data } = await authClient.post<BatchSummariesResponseDto>(`${BASE}/summaries`, {
      targets,
    });
    const out: Record<string, ReviewSummary> = {};
    for (const [key, dto] of Object.entries(data.summaries ?? {})) {
      out[key] = mapSummary(dto);
    }
    return out;
  },

  /** Paginated reviews for one target. */
  listReviews: async (
    target: ReviewTarget,
    opts: { sort?: ReviewSort; page?: number; limit?: number } = {},
  ): Promise<ReviewListPage> => {
    const { data } = await authClient.post<ReviewListResponseDto>(`${BASE}/list`, {
      targets: [target],
      ...opts,
    });
    return mapReviewListPage(data);
  },

  /** Create or replace the caller's rating/review. Requires auth. */
  upsert: async (
    type: ReviewTargetType,
    id: string,
    body: UpsertReviewBody,
  ): Promise<{ review: MyReview; summary: ReviewSummary }> => {
    const { data } = await authClient.put<UpsertReviewResponseDto>(`${BASE}/${type}/${id}`, body);
    return { review: mapMyReview(data.review), summary: mapSummary(data.summary) };
  },

  /** Delete the caller's rating/review. Requires auth. */
  remove: async (type: ReviewTargetType, id: string): Promise<{ summary: ReviewSummary }> => {
    const { data } = await authClient.delete<DeleteReviewResponseDto>(`${BASE}/${type}/${id}`);
    return { summary: mapSummary(data.summary) };
  },

  /** The caller's aggregate rating/review activity. Requires auth. */
  getContributions: async (): Promise<ReviewContributions> => {
    const { data } = await authClient.get<ContributionsDto>(`${BASE}/me/contributions`);
    return mapContributions(data);
  },

  /** The caller's own reviews (with their targets). Requires auth. */
  getMyReviews: async (): Promise<MyReviewRow[]> => {
    const { data } = await authClient.get<MyReviewRowDto[]>(`${BASE}/me/reviews`);
    return (data ?? []).map(mapMyReviewRow);
  },
};
