/** Wire shapes returned by `/api/me/playlists*` (snake_case, as the server sends). */

export interface PlaylistDto {
  id: string;
  owner_user_id?: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_default?: boolean;
  item_count?: number;
  cover?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItemDto {
  id: string;
  song_id: string;
  position: number;
  song_title: string;
  album_title?: string | null;
  artist_name?: string | null;
  cover?: string | null;
  url?: string | null;
  added_at?: string;
}

export interface PlaylistDetailDto extends PlaylistDto {
  items: PlaylistItemDto[];
}

export interface AddItemResultDto {
  id?: string;
  playlist_id: string;
  song_id: string;
  position?: number;
  added_at?: string;
  duplicate?: boolean;
}

export interface BulkAddResultDto {
  playlist_id: string;
  added: number;
  total: number;
}

export interface ReorderResultDto {
  playlist_id: string;
  item_count: number;
}

export interface SongIdsDto {
  counts: Record<string, number>;
}
