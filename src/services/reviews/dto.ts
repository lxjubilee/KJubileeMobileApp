/**
 * Wire shapes for the public reviews module (`/api/reviews/*` on
 * api.kjubilee.com), snake_case exactly as the server sends. Kept separate
 * from the domain models in `types/models.ts`; `mappers.ts` bridges the two.
 */

export type ReviewTargetTypeDto = 'album' | 'song';
export type ReviewSortDto = 'recent' | 'highest' | 'lowest' | 'helpful';

export interface DistributionDto {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface MyReviewDto {
  id: string;
  stars: number;
  title: string | null;
  body: string | null;
  status?: string;
  helpful_count: number;
  created_at: string;
  edited?: boolean;
}

export interface ReviewSummaryDto {
  target_type: ReviewTargetTypeDto;
  target_id: string;
  average: number | null;
  rating_count: number;
  review_count: number;
  distribution: DistributionDto;
  mine?: MyReviewDto | null;
}

export interface ReviewItemDto {
  id: string;
  target_type: ReviewTargetTypeDto;
  target_id: string;
  stars: number;
  title: string | null;
  body: string | null;
  helpful_count: number;
  created_at: string;
  edited: boolean;
  author: { display_name: string; avatar_url: string | null };
  mine: boolean;
  voted: boolean;
}

export interface ReviewListResponseDto {
  items: ReviewItemDto[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
  sort: ReviewSortDto;
}

/** `PUT /api/reviews/{type}/{id}` response. */
export interface UpsertReviewResponseDto {
  review: MyReviewDto;
  summary: ReviewSummaryDto;
}

/** `DELETE /api/reviews/{type}/{id}` response. */
export interface DeleteReviewResponseDto {
  deleted: boolean;
  summary: ReviewSummaryDto;
}

/** `POST /api/reviews/summaries` response — keyed by `"{type}:{id}"`. */
export interface BatchSummariesResponseDto {
  summaries: Record<string, ReviewSummaryDto>;
}

/** `GET /api/reviews/me/contributions` response. */
export interface ContributionsDto {
  albums_rated: number;
  songs_rated: number;
  reviews_written: number;
  total_contributions: number;
  helpful_received: number;
}

/** One row of `GET /api/reviews/me/reviews` — a MyReview plus its target. */
export interface MyReviewRowDto extends MyReviewDto {
  target_type: ReviewTargetTypeDto;
  target_id: string;
}
