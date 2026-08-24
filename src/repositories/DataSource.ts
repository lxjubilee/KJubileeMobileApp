import { Album, Artist, HomeRail, SearchResults, Track } from '@/types';

/**
 * The contract every data source implements. Repositories depend ONLY on this
 * interface, so swapping MockDataSource <-> ApiDataSource is invisible to them
 * (and therefore to Redux and the UI).
 */
export interface HomeConfig {
  heroAlbumId: string;
  /** Ordered album ids for the rotating hero carousel; falls back to [heroAlbumId]. */
  heroAlbumIds?: string[];
  /** Per-page hero album ids, keyed by category label (v2); the Home screen
   *  swaps the hero to the active chip's page. */
  heroesByCategory?: Record<string, string[]>;
  /** Ordered page labels for the top-nav chips (v2). Includes pages that have a
   *  hero but no rails yet, so a new page still appears. */
  categoryLabels?: string[];
  /** Maps each page label (the chip identity) → its stable config key, so chips
   *  can be localized by key while filtering stays keyed on the raw label. */
  categoryKeys?: Record<string, string>;
  rails: HomeRail[];
}

export interface MusicDataSource {
  getHomeConfig(): Promise<HomeConfig>;
  listAlbums(): Promise<Album[]>;
  getAlbum(id: string): Promise<Album | null>;
  listArtists(): Promise<Artist[]>;
  getArtist(id: string): Promise<Artist | null>;
  getArtistAlbums(artistId: string): Promise<Album[]>;
  getArtistTopTracks(artistId: string): Promise<Track[]>;
  search(query: string): Promise<SearchResults>;
}
