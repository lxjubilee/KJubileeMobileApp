/**
 * Domain models — the shapes the UI and Redux work with.
 * These are intentionally decoupled from API DTOs (see services/api/dto.ts);
 * repositories map DTO -> model, so a backend change never ripples into screens.
 */

export type ID = string;

export interface Artist {
  id: ID;
  name: string;
  /** CDN-relative path, resolved to a full URL by utils/cdn. */
  image: string;
  bio?: string;
  monthlyListeners?: number;
  genres?: string[];
}

export interface Track {
  id: ID;
  title: string;
  /** CDN-relative path to the audio file. */
  url: string;
  /** CDN-relative path to artwork (usually the album cover). */
  artwork: string;
  duration: number; // seconds
  artistId: ID;
  artistName: string;
  albumId: ID;
  albumName: string;
  trackNumber?: number;
  explicit?: boolean;
}

export interface Album {
  id: ID;
  title: string;
  cover: string; // CDN-relative path
  artistId: ID;
  artistName: string;
  year?: number;
  genre?: string;
  /** Genre tags, most-specific first, e.g. ["Gospel", "Honky-Tonk"]. */
  genres?: string[];
  trackCount?: number;
  tracks?: Track[];
  /**
   * Dominant/ambient color of the cover (hex), used for the hero backdrop —
   * provided by the catalog API (like Netflix/Spotify), not extracted on-device.
   */
  accentColor?: string;
}

export interface Playlist {
  id: ID;
  title: string;
  cover: string;
  description?: string;
  trackIds: ID[];
  curated?: boolean;
}

/** A horizontally-scrolling row on the Home screen (Netflix-style rail). */
export type RailItemType = 'album' | 'artist' | 'playlist';

export interface HomeRail {
  id: ID;
  title: string;
  itemType: RailItemType;
  /** IDs referencing albums/artists/playlists, resolved by the repository. */
  itemIds: ID[];
  /** When set, the rail shows a "See all" action targeting this artist's full album list. */
  seeAllArtistId?: ID;
  /** Catalog category label this rail belongs to, used by the Home filter chips. */
  categoryLabel?: string;
  /** Caption covers with each album's primary genre instead of its title. */
  showGenre?: boolean;
  /** Album id → primary genre, from the config. Only the albums the catalog gives
   *  a genre appear here; the rest keep their title as the caption. */
  genreByItem?: Record<ID, string>;
}

export interface HomeFeed {
  hero?: Album;
  rails: HomeRail[];
}

/** Search results across entity types. */
export interface SearchResults {
  albums: Album[];
  artists: Artist[];
  tracks: Track[];
}

// ---------------------------------------------------------------------------
// Ratings & reviews (public review module — mirrors the web `/api/reviews/*`).
// ---------------------------------------------------------------------------

/** What a review targets. Matches the backend `rateable_type`. */
export type ReviewTargetType = 'album' | 'song';

/** Ordering options exposed in the mobile reviews list (helpful votes deferred). */
export type ReviewSort = 'recent' | 'highest' | 'lowest';

/** Count of ratings per star bucket, 1..5. */
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/** The caller's own rating/review for a target, if they have one. */
export interface MyReview {
  id: ID;
  stars: number; // 1..5
  title: string | null;
  body: string | null;
  helpfulCount: number;
  createdAt: string;
  edited: boolean;
}

/** Aggregate rating summary for one target (+ the caller's own rating). */
export interface ReviewSummary {
  targetType: ReviewTargetType;
  targetId: ID;
  average: number | null; // 1..5, or null when there are no ratings
  ratingCount: number;
  reviewCount: number; // ratings that also carry a written body
  distribution: RatingDistribution;
  mine: MyReview | null;
}

/** A single review in a browsable list (another user's, or your own). */
export interface ReviewListItem {
  id: ID;
  stars: number;
  title: string | null;
  body: string | null;
  helpfulCount: number;
  createdAt: string;
  edited: boolean;
  authorName: string;
  authorAvatarUrl: string | null;
  mine: boolean;
}

/** One page of reviews for a target. */
export interface ReviewListPage {
  items: ReviewListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  sort: ReviewSort;
}

/** The signed-in user's aggregate rating/review activity (profile section). */
export interface ReviewContributions {
  albumsRated: number;
  songsRated: number;
  reviewsWritten: number;
  totalContributions: number;
  helpfulReceived: number;
}

/** One of the caller's own reviews, with the target it belongs to. */
export interface MyReviewRow {
  id: ID;
  stars: number;
  title: string | null;
  body: string | null;
  status: string; // 'published' | 'pending' | 'hidden' | 'rejected'
  helpfulCount: number;
  createdAt: string;
  edited: boolean;
  targetType: ReviewTargetType;
  targetId: ID;
}
