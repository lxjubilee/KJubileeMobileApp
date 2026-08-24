/**
 * Shapes of the public catalog manifest served at
 * `${CDN_BASE_URL}/music/catalog-manifest.json`.
 *
 * This is the live source of truth for all album/track metadata (verified
 * 2026-06-13). It is intentionally separate from the app's domain models in
 * `@/types` — `manifestMappers` translates between the two, so a manifest shape
 * change is absorbed here and never ripples into screens/redux.
 *
 * Notable gaps vs. the domain model: the manifest carries NO track duration,
 * release year, artist image, or editorial home rails. Those are defaulted or
 * synthesized by the mapper. (Album `genres` ARE present — see ManifestAlbum.)
 */

export interface ManifestTrack {
  /** 1-based track number within the album. */
  n: number;
  title: string;
  /** Original filename, e.g. "01 The Phone Call.mp3". */
  file: string;
  /**
   * CDN path RELATIVE TO `/music/`, e.g.
   * "albums/inspire/caleb-inspire/CAIM1001EN-anchor-in-the-storm/tracks/01 The Phone Call.mp3".
   * Contains spaces — must be URL-encoded before use (handled by cdnUrl()).
   */
  url: string;
  /** Whether this entry is a playable audio file. */
  audio: boolean;
}

export interface ManifestAlbum {
  /** Stable album code, e.g. "CAIM1001EN". Used as the domain Album id. */
  code: string;
  title: string;
  /** Folder name, e.g. "CAIM1001EN-anchor-in-the-storm". */
  folder: string;
  /**
   * CDN path RELATIVE TO `/music/`, e.g.
   * "albums/inspire/caleb-inspire/CAIM1001EN-anchor-in-the-storm".
   */
  path: string;
  /** 1 when the album has playable audio, 0 otherwise. */
  playable: number;
  trackCount: number;
  /**
   * True when the album's cover PNG (`<path>/artwork/<code>.png`) is published
   * to the CDN. Absent ⇒ assume present (legacy manifests stay fully visible);
   * only an explicit `false` hides the album. See manifestMappers.hasArtwork().
   */
  hasArtwork?: boolean;
  /**
   * Genre tags for the album, most-specific first, e.g. ["Gospel", "Honky-Tonk"].
   * Pre-resolved into the manifest (the web derives these from album-genres.json).
   * Absent/empty for ~14% of albums — treat as "no genres".
   */
  genres?: string[];
  tracks: ManifestTrack[];
}

export interface ManifestArtist {
  slug: string;
  name: string;
  /** Free-text descriptor, e.g. "Sufi Christian / Messianic". Mapped to bio. */
  role?: string;
  albums: ManifestAlbum[];
}

export interface ManifestCategory {
  key: string;
  label: string;
  artists: ManifestArtist[];
}

export interface CatalogManifest {
  /** ISO-8601 timestamp the manifest was generated; used as a cache key. */
  generated: string;
  totalArtists: number;
  totalAlbums: number;
  totalPlayableAlbums: number;
  totalPlayableTracks: number;
  categories: ManifestCategory[];
}
