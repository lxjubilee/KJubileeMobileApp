import { authClient } from '@/services/auth/authClient';

/**
 * Thin client for the likes API (`/api/me/likes*` on api.kjubilee.com). Uses
 * the shared `authClient` (Bearer + transparent 401-refresh). Likes are a single
 * like/unlike toggle (no dislike): POST to add, DELETE to remove. `target_id`
 * must be the deterministic uuid (see likeIds.ts), not the catalog code.
 */

const BASE = '/api/me/likes';

export type LikeType = 'album' | 'song';

export const likesApi = {
  /** Membership set: `["album:<uuid>", "song:<uuid>", ...]`. */
  listIds: async (): Promise<string[]> => {
    const { data } = await authClient.get<{ ids: string[] }>(`${BASE}/ids`);
    return data.ids ?? [];
  },

  like: async (type: LikeType, uuid: string): Promise<void> => {
    await authClient.post(BASE, { target_type: type, target_id: uuid });
  },

  unlike: async (type: LikeType, uuid: string): Promise<void> => {
    await authClient.delete(`${BASE}/${type}/${uuid}`);
  },
};
