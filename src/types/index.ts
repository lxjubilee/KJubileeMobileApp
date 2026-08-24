export * from './models';

/** Generic async slice status used across Redux slices. */
export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

/** Envelope used by repositories/services for resolved (id -> entity) feeds. */
export interface ResolvedHomeFeed {
  /** Albums shown in the rotating hero carousel (first is the primary). */
  heroes?: import('./models').Album[];
  /** Per-page hero albums keyed by category label (v2); the Home screen shows
   *  the active chip's page hero, falling back to `heroes`. */
  heroesByCategory?: Record<string, import('./models').Album[]>;
  /** Ordered page labels for the top-nav chips (v2); pages with only a hero and
   *  no rails still appear here. */
  categoryLabels?: string[];
  /** Maps each page label (chip identity) → its stable config key, so the Home
   *  chips can be localized by key while filtering stays keyed on the raw label. */
  categoryKeys?: Record<string, string>;
  rails: ResolvedRail[];
}

export interface ResolvedRail {
  id: string;
  title: string;
  itemType: import('./models').RailItemType;
  albums?: import('./models').Album[];
  artists?: import('./models').Artist[];
  playlists?: import('./models').Playlist[];
  /** When set, the rail shows a "See all" action targeting this artist's full album list. */
  seeAllArtistId?: string;
  /** Catalog category label this rail belongs to, used by the Home filter chips. */
  categoryLabel?: string;
  /** Caption covers with each album's primary genre instead of its title. */
  showGenre?: boolean;
  /** Album id → primary genre, from the config. */
  genreByItem?: Record<string, string>;
}
