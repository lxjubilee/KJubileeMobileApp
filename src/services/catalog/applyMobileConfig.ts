import { HomeRail } from '@/types';
import { HomeConfig } from '@/repositories/DataSource';
import type { MobileCategory, MobileConfig } from '@/services/mobileConfig';
import { CatalogIndex } from './manifestMappers';

/**
 * Overlays the admin-managed mobile config (v2) on the catalog index to produce
 * the Home feed. The catalog manifest stays the source of album/artist/track
 * data; this only decides WHICH pages show, in what ORDER, their SECTIONS, and
 * each page's HERO.
 *
 * Shape (v2): each page (category) has ordered typed `sections` (artists → a
 * circular-avatar rail, albums → a cover rail) and an optional per-page `hero`.
 * Rails are tagged with `categoryLabel` = the page label, so the Home chips are
 * the pages (in config order) and each chip shows that page's sections. The hero
 * carousel is chosen per active chip via `heroesByCategory`.
 *
 * Falls back to the manifest-derived `index.home` when there is no config or it
 * resolves to nothing — so Home is never empty because of a config problem.
 */
const MAX_MUSIC_TYPE_ALBUMS = 20;

export function applyMobileConfig(index: CatalogIndex, config: MobileConfig | null): HomeConfig {
  if (!config?.categories?.length) return index.home;

  const rails: HomeRail[] = [];
  const heroesByCategory: Record<string, string[]> = {};
  const categories = [...config.categories].sort((a, b) => a.order - b.order);

  for (const cat of categories) {
    if (cat.kind === 'music_type') {
      rails.push(...musicTypeRails(index, cat));
      continue;
    }
    rails.push(...sectionRails(index, cat));

    // Per-page hero: ordered, resolvable album refs for this page.
    if (cat.hero?.enabled && cat.hero.slides?.length) {
      const ids = [...cat.hero.slides]
        .sort((a, b) => a.order - b.order)
        .map((s) => s.ref)
        .filter((ref) => index.albumsById.has(ref));
      if (ids.length) heroesByCategory[cat.label] = ids;
    }
  }

  // Fall back to the manifest home ONLY when the config produced nothing at all
  // (no rails AND no heroes) — otherwise a hero-only page would be lost.
  if (!rails.length && !Object.keys(heroesByCategory).length) return index.home;

  // A page shows only when the admin has actually curated it — i.e. it has at
  // least one section (or a hero, or, for music_type, its genre list). A category
  // the admin left empty (0 sections) is hidden entirely: the backend no longer
  // injects default membership for empty pages, so 0 admin sections means the
  // chip does not appear. NB this is a config-level check (admin intent), NOT a
  // resolved-content check — a curated page whose albums merely aren't playable
  // on-device yet (e.g. Family Friendly) still has sections here, so it stays
  // visible and the Home screen renders an empty state for it.
  const hasAdminContent = (c: MobileCategory): boolean =>
    (c.sections?.length ?? 0) > 0 ||
    !!(c.hero?.enabled && (c.hero.slides?.length ?? 0) > 0) ||
    (c.kind === 'music_type' && (c.musicTypes?.length ?? 0) > 0) ||
    (c.items?.length ?? 0) > 0; // legacy pre-v2 flat membership
  const shownCategories = categories.filter(hasAdminContent);
  const categoryLabels = shownCategories.map((c) => c.label);
  // Map each page's display label → its stable config key, so the Home chips can
  // be translated by key while filtering stays keyed on the raw label.
  const categoryKeys: Record<string, string> = {};
  for (const c of shownCategories) categoryKeys[c.label] = c.key;

  // With admin config active, the hero is driven ENTIRELY by it: if a page has
  // its hero turned OFF it shows no hero, and if NO page has one there is no hero
  // at all — we do NOT resurrect the on-device manifest hero. Per-page heroes
  // live in `heroesByCategory`; this default only feeds the fallback "all" chip.
  const firstHeroLabel = categories.map((c) => c.label).find((l) => heroesByCategory[l]?.length);
  const heroAlbumIds = firstHeroLabel ? heroesByCategory[firstHeroLabel] : [];
  const heroAlbumId = heroAlbumIds[0] ?? '';

  return { heroAlbumId, heroAlbumIds, heroesByCategory, categoryLabels, categoryKeys, rails };
}

/**
 * One rail per section. An `artists` section becomes a circular-avatar rail
 * (itemType 'artist'); an `albums` section a cover rail (itemType 'album').
 * Order and membership come straight from the section; unresolved refs are
 * dropped and empty rails are removed at render by `useVisibleRails`.
 */
function sectionRails(index: CatalogIndex, cat: MobileCategory): HomeRail[] {
  const out: HomeRail[] = [];
  const sections = [...(cat.sections ?? [])].sort((a, b) => a.order - b.order);
  sections.forEach((sec, i) => {
    const items = [...(sec.items ?? [])].sort((a, b) => a.order - b.order);
    if (sec.kind === 'artists') {
      const itemIds = items
        .filter((it) => it.type === 'artist' && index.artistsById.has(it.ref))
        .map((it) => it.ref);
      if (itemIds.length) {
        out.push({ id: `sec-${cat.key}-${i}`, title: sec.name, itemType: 'artist', itemIds, categoryLabel: cat.label });
      }
    } else {
      const albums = items.filter((it) => it.type === 'album' && index.albumsById.has(it.ref));
      const itemIds = albums.map((it) => it.ref);
      if (itemIds.length) {
        // The config carries a per-album `genre` only for a showGenre section, and
        // only where the catalog has one; albums it omits keep their title.
        const genreByItem: Record<string, string> = {};
        if (sec.showGenre) {
          for (const it of albums) if (it.genre) genreByItem[it.ref] = it.genre;
        }
        out.push({
          id: `sec-${cat.key}-${i}`, title: sec.name, itemType: 'album', itemIds, categoryLabel: cat.label,
          ...(sec.showGenre ? { showGenre: true, genreByItem } : {}),
        });
      }
    }
  });

  // Back-compat: a category still on the pre-v2 flat `items` shape.
  if (!sections.length && cat.items?.length) out.push(...legacyContentRails(index, cat));
  return out;
}

/** One rail per genre: albums whose genre tags include it (from the catalog). */
function musicTypeRails(index: CatalogIndex, cat: MobileCategory): HomeRail[] {
  const out: HomeRail[] = [];
  const types = [...(cat.musicTypes ?? [])].sort((a, b) => a.order - b.order);
  for (const mt of types) {
    let itemIds: string[];
    if (mt.albums) {
      // Curated genre: exactly the admin-picked albums, in order (resolvable only).
      itemIds = mt.albums.filter((ref) => index.albumsById.has(ref)).slice(0, MAX_MUSIC_TYPE_ALBUMS);
    } else {
      // Auto (threshold) genre: albums whose catalog genre tags include it.
      const g = mt.genre.toLowerCase();
      itemIds = index.albums
        .filter((a) => a.genres?.some((x) => x.toLowerCase() === g))
        .slice(0, MAX_MUSIC_TYPE_ALBUMS)
        .map((a) => a.id);
    }
    if (itemIds.length) {
      out.push({ id: `mtype-${mt.genre}`, title: mt.label, itemType: 'album', itemIds, categoryLabel: cat.label });
    }
  }
  return out;
}

/** Legacy (pre-v2) mapping: artist item → that artist's albums rail. */
function legacyContentRails(index: CatalogIndex, cat: MobileCategory): HomeRail[] {
  const out: HomeRail[] = [];
  const looseAlbums: string[] = [];
  const items = [...(cat.items ?? [])].sort((a, b) => a.order - b.order);
  for (const item of items) {
    if (item.type === 'artist') {
      const albums = index.albumsByArtist.get(item.ref) ?? [];
      if (albums.length) {
        out.push({
          id: `artist-${item.ref}`,
          title: index.artistsById.get(item.ref)?.name ?? item.ref,
          itemType: 'album',
          itemIds: albums.map((a) => a.id),
          seeAllArtistId: item.ref,
          categoryLabel: cat.label,
        });
      }
    } else if (item.type === 'album') {
      if (index.albumsById.has(item.ref)) looseAlbums.push(item.ref);
    } else if (item.type === 'collection') {
      const itemIds = (item.albums ?? []).filter((c) => index.albumsById.has(c));
      if (itemIds.length) {
        out.push({ id: `coll-${item.ref}`, title: item.title ?? cat.label, itemType: 'album', itemIds, categoryLabel: cat.label });
      }
    }
  }
  if (looseAlbums.length) {
    out.unshift({ id: `cat-${cat.key}-albums`, title: cat.label, itemType: 'album', itemIds: looseAlbums, categoryLabel: cat.label });
  }
  return out;
}
