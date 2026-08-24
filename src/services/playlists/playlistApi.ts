import { authClient } from '@/services/auth/authClient';
import type {
  AddItemResultDto,
  BulkAddResultDto,
  PlaylistDetailDto,
  PlaylistDto,
  ReorderResultDto,
  SongIdsDto,
} from './dto';

/**
 * Thin client for the personal-playlist API (`/api/me/playlists*` on
 * api.kjubilee.com). Uses the shared `authClient` (Bearer + transparent
 * 401-refresh). Errors reject as the normalized `ApiError` from the client.
 */

const BASE = '/api/me';

export interface CreatePlaylistBody {
  name: string;
  description?: string;
  is_public?: boolean;
}
export interface UpdatePlaylistBody {
  name?: string;
  description?: string | null;
  is_public?: boolean;
}

export const playlistApi = {
  list: async (): Promise<PlaylistDto[]> => {
    const { data } = await authClient.get<PlaylistDto[]>(`${BASE}/playlists`);
    return data;
  },

  create: async (body: CreatePlaylistBody): Promise<PlaylistDto> => {
    const { data } = await authClient.post<PlaylistDto>(`${BASE}/playlists`, body);
    return data;
  },

  get: async (id: string): Promise<PlaylistDetailDto> => {
    const { data } = await authClient.get<PlaylistDetailDto>(`${BASE}/playlists/${id}`);
    return data;
  },

  update: async (id: string, body: UpdatePlaylistBody): Promise<PlaylistDto> => {
    const { data } = await authClient.patch<PlaylistDto>(`${BASE}/playlists/${id}`, body);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await authClient.delete(`${BASE}/playlists/${id}`);
  },

  addItem: async (id: string, songId: string): Promise<AddItemResultDto> => {
    const { data } = await authClient.post<AddItemResultDto>(`${BASE}/playlists/${id}/items`, {
      song_id: songId,
    });
    return data;
  },

  bulkAdd: async (id: string, songIds: string[]): Promise<BulkAddResultDto> => {
    const { data } = await authClient.post<BulkAddResultDto>(
      `${BASE}/playlists/${id}/items/bulk`,
      { song_ids: songIds },
    );
    return data;
  },

  removeItem: async (id: string, itemId: string): Promise<void> => {
    await authClient.delete(`${BASE}/playlists/${id}/items/${itemId}`);
  },

  /** Replace the full ordered item list (used for reorder). */
  reorder: async (id: string, songIds: string[]): Promise<ReorderResultDto> => {
    const { data } = await authClient.patch<ReorderResultDto>(`${BASE}/playlists/${id}/items`, {
      items: songIds.map((song_id) => ({ song_id })),
    });
    return data;
  },

  songIds: async (): Promise<SongIdsDto> => {
    const { data } = await authClient.get<SongIdsDto>(`${BASE}/playlist-song-ids`);
    return data;
  },
};
