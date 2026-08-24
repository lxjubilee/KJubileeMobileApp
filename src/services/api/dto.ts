/**
 * API DTOs — the raw shapes returned by the jubileeverse backend.
 * Kept separate from domain models so backend/contract changes are absorbed by
 * the mappers (services/api/mappers.ts) and never leak into the UI/Redux.
 */

export interface ArtistDTO {
  id: string;
  name: string;
  image_path: string;
  bio?: string;
  monthly_listeners?: number;
  genres?: string[];
}

export interface TrackDTO {
  id: string;
  title: string;
  audio_path: string;
  artwork_path: string;
  duration_seconds: number;
  artist_id: string;
  artist_name: string;
  album_id: string;
  album_name: string;
  track_number?: number;
  explicit?: boolean;
}

export interface AlbumDTO {
  id: string;
  title: string;
  cover_path: string;
  artist_id: string;
  artist_name: string;
  release_year?: number;
  genre?: string;
  track_count?: number;
  color_hex?: string;
  tracks?: TrackDTO[];
}

export interface HomeRailDTO {
  id: string;
  title: string;
  item_type: 'album' | 'artist' | 'playlist';
  item_ids: string[];
}

export interface HomeConfigDTO {
  hero_album_id: string;
  rails: HomeRailDTO[];
}

/** Standard list envelope used by the API. */
export interface ListResponse<T> {
  data: T[];
  total: number;
}
