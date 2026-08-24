/** Wire shapes for the mobile app config API (`GET /api/mobile/config`). */

export type MobileItemType = 'album' | 'artist' | 'collection';

export interface MobileConfigItem {
  type: MobileItemType;
  ref: string;
  order: number;
  /** Collection only: its display title + ordered album codes. */
  title?: string;
  albums?: string[];
  /** Album only, and only inside a `showGenre` section: the album's primary genre.
   *  Absent when the catalog gives the album no genre — caption falls back to the
   *  album title. Do NOT substitute the on-device `Album.genre`, which falls back
   *  to the category label rather than being absent. */
  genre?: string;
}

export interface MobileMusicType {
  genre: string;
  label: string;
  order: number;
  pinned: boolean;
  /** Curated album refs (v2). Present = admin picked these exact albums; absent =
   *  an auto (threshold) genre that the app fills from catalog genre tags. */
  albums?: string[];
}

/** A hero slide (album-backed) in a page's per-page hero carousel (v2). */
export interface MobileHeroSlide {
  ref: string;
  order: number;
  headline?: string | null;
  subtitle?: string | null;
}

/** Per-page hero banner (v2). */
export interface MobileHero {
  enabled: boolean;
  slides: MobileHeroSlide[];
}

/** A named, typed row inside a page (v2). Supersedes the flat `items`. */
export interface MobileSection {
  name: string;
  kind: 'artists' | 'albums';
  order: number;
  items: MobileConfigItem[];
  /** Album sections only: caption each cover with the album's primary genre
   *  instead of its name. Omitted by the API when off. */
  showGenre?: boolean;
}

export interface MobileCategory {
  key: string;
  label: string;
  kind: 'curated' | 'personas' | 'albums' | 'music_type';
  order: number;
  /** Per-page hero banner (v2). */
  hero?: MobileHero;
  /** Ordered typed sections (v2). Present for every non-music_type page. */
  sections?: MobileSection[];
  /** Legacy flat membership (pre-v2). */
  items?: MobileConfigItem[];
  /** music_type category only. */
  musicTypes?: MobileMusicType[];
}

export interface MobileConfig {
  version: number;
  generated: string | null;
  categories: MobileCategory[];
}
