import type {
  MyReview,
  MyReviewRow,
  RatingDistribution,
  ReviewContributions,
  ReviewListItem,
  ReviewListPage,
  ReviewSort,
  ReviewSummary,
} from '@/types';
import type {
  ContributionsDto,
  DistributionDto,
  MyReviewDto,
  MyReviewRowDto,
  ReviewItemDto,
  ReviewListResponseDto,
  ReviewSummaryDto,
} from './dto';

/**
 * DTO -> domain-model mappers. The only place that knows the reviews API's
 * snake_case field naming (mirrors services/api/mappers.ts).
 */

const mapDistribution = (d: DistributionDto | undefined): RatingDistribution => ({
  1: d?.[1] ?? 0,
  2: d?.[2] ?? 0,
  3: d?.[3] ?? 0,
  4: d?.[4] ?? 0,
  5: d?.[5] ?? 0,
});

export const mapMyReview = (d: MyReviewDto): MyReview => ({
  id: d.id,
  stars: d.stars,
  title: d.title,
  body: d.body,
  helpfulCount: d.helpful_count ?? 0,
  createdAt: d.created_at,
  edited: d.edited ?? false,
});

export const mapSummary = (d: ReviewSummaryDto): ReviewSummary => ({
  targetType: d.target_type,
  targetId: d.target_id,
  average: d.average,
  ratingCount: d.rating_count ?? 0,
  reviewCount: d.review_count ?? 0,
  distribution: mapDistribution(d.distribution),
  mine: d.mine ? mapMyReview(d.mine) : null,
});

export const mapReviewItem = (d: ReviewItemDto): ReviewListItem => ({
  id: d.id,
  stars: d.stars,
  title: d.title,
  body: d.body,
  helpfulCount: d.helpful_count ?? 0,
  createdAt: d.created_at,
  edited: d.edited ?? false,
  authorName: d.author?.display_name ?? '',
  authorAvatarUrl: d.author?.avatar_url ?? null,
  mine: d.mine ?? false,
});

export const mapReviewListPage = (d: ReviewListResponseDto): ReviewListPage => ({
  items: (d.items ?? []).map(mapReviewItem),
  page: d.page,
  limit: d.limit,
  total: d.total,
  hasMore: d.has_more ?? false,
  sort: (d.sort === 'helpful' ? 'recent' : d.sort) as ReviewSort,
});

export const mapContributions = (d: ContributionsDto): ReviewContributions => ({
  albumsRated: d.albums_rated ?? 0,
  songsRated: d.songs_rated ?? 0,
  reviewsWritten: d.reviews_written ?? 0,
  totalContributions: d.total_contributions ?? 0,
  helpfulReceived: d.helpful_received ?? 0,
});

export const mapMyReviewRow = (d: MyReviewRowDto): MyReviewRow => ({
  ...mapMyReview(d),
  status: d.status ?? 'published',
  targetType: d.target_type,
  targetId: d.target_id,
});
