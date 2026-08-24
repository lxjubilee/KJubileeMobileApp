import { useMemo } from 'react';
import { Album, Artist, ResolvedRail, Track } from '@/types';
import { useAppSelector } from '@/redux';
import { peekCatalogIndex } from '@/services/catalog';
import type { CatalogIndex } from '@/services/catalog';
import { albumVisibleInLang } from '@/localization';

/**
 * Filters catalog items by two rules:
 *
 *  1. **Missing artwork** — items whose cover has been observed to 404 at runtime
 *     (tracked in the `artwork` slice) are hidden. Albums/tracks hide when their
 *     own cover is known-missing; artists hide only when EVERY one of their
 *     albums lacks artwork (otherwise the avatar swaps to a good cover); rails
 *     drop items and empty rails are removed (no blank gap on Home).
 *
 *  2. **Selected language** — the active language (`settings.language`) filters
 *     the catalog the same way the web does: English shows English + legacy
 *     ('other') albums and hides foreign translations; a selected language shows
 *     only its own albums. Language is derived from the album code, which in this
 *     app IS `Album.id` / `Track.albumId` (see albumVisibleInLang).
 *
 * These run at render, so changing the language re-filters every consumer
 * instantly — no refetch, no catalog rebuild.
 *
 * Language filtering is ON by default (catalog browse). Personal collections —
 * liked songs, saved albums, followed artists, user playlists — must show the
 * user's own choices regardless of the active language, so those callers pass
 * `{ filterByLanguage: false }`.
 */
type MissingMap = Record<string, true>;

interface VisibleOptions {
  /** Apply the selected-language catalog filter. Default true (browse). */
  filterByLanguage?: boolean;
}

function useMissingCovers(): MissingMap {
  return useAppSelector((s) => s.artwork.missing);
}

function useLang(): string {
  return useAppSelector((s) => s.settings.language);
}

function filterArtists(
  artists: Artist[],
  missing: MissingMap,
  index: CatalogIndex | null,
  lang: string,
): Artist[] {
  const result: Artist[] = [];
  // `'*'` is the "no language gate" sentinel used for personal collections.
  const allLangs = lang === '*';
  for (const artist of artists) {
    const albums = index?.albumsByArtist.get(artist.id) ?? [];
    // Only this language's albums count toward the artist's covers.
    const langAlbums = allLangs ? albums : albums.filter((al) => albumVisibleInLang(al.id, lang));
    // Artist has albums, but none in the active language → hide entirely.
    if (albums.length > 0 && langAlbums.length === 0) continue;
    const covers = langAlbums.map((al) => al.cover);
    // A curated/featured artist is kept even when every album cover has 404'd:
    // the avatar falls back to a local persona portrait (or a placeholder), and
    // the artist page shows a "no albums yet" empty state. Previously a single
    // transient image failure could permanently hide an artist whose only
    // in-language album's cover was marked missing (see ArtworkSlice trapdoor).
    // Avatar cover missing but other albums have art → show a good cover.
    if (artist.image && missing[artist.image]) {
      const firstGood = covers.find((c) => !missing[c]);
      result.push(firstGood ? { ...artist, image: firstGood } : artist);
    } else {
      result.push(artist);
    }
  }
  return result;
}

export function useVisibleAlbums(albums: Album[], options?: VisibleOptions): Album[] {
  const missing = useMissingCovers();
  const lang = useLang();
  const byLang = options?.filterByLanguage !== false;
  return useMemo(
    () =>
      albums.filter((a) => !missing[a.cover] && (!byLang || albumVisibleInLang(a.id, lang))),
    [albums, missing, lang, byLang],
  );
}

export function useVisibleTracks(tracks: Track[], options?: VisibleOptions): Track[] {
  const missing = useMissingCovers();
  const lang = useLang();
  const byLang = options?.filterByLanguage !== false;
  return useMemo(
    () =>
      tracks.filter((t) => !missing[t.artwork] && (!byLang || albumVisibleInLang(t.albumId, lang))),
    [tracks, missing, lang, byLang],
  );
}

export function useVisibleArtists(artists: Artist[], options?: VisibleOptions): Artist[] {
  const missing = useMissingCovers();
  const lang = useLang();
  // `'*'` disables the language gate inside filterArtists (personal collections).
  const effectiveLang = options?.filterByLanguage === false ? '*' : lang;
  return useMemo(
    () => filterArtists(artists, missing, peekCatalogIndex(), effectiveLang),
    [artists, missing, effectiveLang],
  );
}

export function useVisibleRails(rails: ResolvedRail[]): ResolvedRail[] {
  const missing = useMissingCovers();
  const lang = useLang();
  return useMemo(() => {
    const index = peekCatalogIndex();
    const out: ResolvedRail[] = [];
    for (const rail of rails) {
      if (rail.itemType === 'artist') {
        const artists = filterArtists(rail.artists ?? [], missing, index, lang);
        if (artists.length) out.push({ ...rail, artists });
      } else {
        const albums = (rail.albums ?? []).filter(
          (a) => !missing[a.cover] && albumVisibleInLang(a.id, lang),
        );
        if (albums.length) out.push({ ...rail, albums });
      }
    }
    return out;
  }, [rails, missing, lang]);
}
