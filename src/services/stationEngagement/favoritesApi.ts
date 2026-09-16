import { authClient } from '@/services/auth/authClient';
import type { RadioStation } from '@/services/radio';

/**
 * Station favourites (`/api/radio/favorites*` on kjubilee.com) — the heart.
 *
 * Saved against the ACCOUNT, so every call needs a session; the shared
 * `authClient` supplies the Bearer token and the transparent 401-refresh.
 * Verified against the live host on 2026-09-16: list answers 401 without a
 * session, and `check/<slug>` answers `isFavorited:false` rather than 401.
 *
 * Not to be confused with `services/likes`, which targets `/api/me/likes` — an
 * endpoint that does not exist on this host.
 */

const BASE = '/api/radio/favorites';

interface FavoriteRow {
  station_id: string;
  favorited_at?: string;
}

export const favoritesApi = {
  /** The account's favourite station slugs, newest first (the server's order). */
  listSlugs: async (): Promise<string[]> => {
    const { data } = await authClient.get<{ favorites?: FavoriteRow[] }>(BASE);
    return (data.favorites ?? []).map((f) => f.station_id);
  },

  /**
   * Idempotent: the server inserts with `ON CONFLICT DO NOTHING`.
   *
   * The body is the one the website's Home page sends — `station_image` is the
   * site-relative CDN path, because that is what the web reads back.
   */
  add: async (station: RadioStation): Promise<void> => {
    await authClient.post(BASE, {
      station_id: station.slug,
      station_name: station.name,
      station_category: station.format,
      station_image: `/cdn/stations/${station.slug}.webp`,
    });
  },

  /**
   * A 404 means "was not a favourite", which is the state being asked for — so
   * it counts as success. Without that, removing a favourite another device had
   * already removed would snap the heart back on.
   */
  remove: async (slug: string): Promise<void> => {
    try {
      await authClient.delete(`${BASE}/${encodeURIComponent(slug)}`);
    } catch (e) {
      if ((e as { status?: number })?.status === 404) return;
      throw e;
    }
  },
};
