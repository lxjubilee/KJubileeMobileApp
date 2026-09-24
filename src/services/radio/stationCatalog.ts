import stations from '@/assets/radio/stations.json';
import layout from '@/assets/radio/sections.json';
import type { RadioStation, StationSection } from './types';

/**
 * The station catalog.
 *
 * Bundled for now. The web catalog is a generated file
 * (`KJubilee.com/public/js/stations-data.js`, built by `tools/build-home-data.js`)
 * and the mobile copies were generated from it — the full 105-station network
 * plus the site's own section/shelf grouping, so Home shows the same shape the
 * website does.
 *
 * This module is the seam: when the station API lands, only the bodies here
 * change and nothing above them moves. Keeping the bundled copy as the fallback
 * is deliberate — the dial must draw a band even offline.
 */

const CATALOG = (stations as RadioStation[])
  .slice()
  .sort((a, b) => parseFloat(a.hm) - parseFloat(b.hm));

const BY_SLUG = new Map(CATALOG.map((s) => [s.slug, s]));

/**
 * Stations that can actually be tuned, ascending by dial number.
 *
 * Every list in the app is built on this, not the full catalog: a station that
 * is announced but not on air cannot be played, and a screen full of dimmed
 * "coming soon" tiles reads as an unfinished app (App Review 2.1(a)). The full
 * catalog is still reachable by slug, so a share link or a saved favourite for a
 * station that goes quiet still opens its page.
 */
export function getStations(): RadioStation[] {
  return CATALOG.filter((s) => s.live);
}

/** The whole network, playable or not. Resolves links and frequencies — never list it. */
export function getAllStations(): RadioStation[] {
  return CATALOG;
}

export function getStationBySlug(slug: string): RadioStation | undefined {
  return BY_SLUG.get(slug);
}

/** Resolve a shelf's slug list, dropping any the catalog no longer carries. */
export function getStationsBySlugs(slugs: string[]): RadioStation[] {
  return slugs.map((s) => BY_SLUG.get(s)).filter((s): s is RadioStation => s != null);
}

/** Resolve slugs to on-air stations only, in the order given. */
export function getLiveStationsBySlugs(slugs: string[]): RadioStation[] {
  return getStationsBySlugs(slugs).filter((s) => s.live);
}

/**
 * Home's shelves, in the site's own order, holding on-air stations only. A shelf
 * left empty is dropped, and so is a section left with no shelves — its chip
 * would otherwise open onto nothing.
 */
export function getSections(): StationSection[] {
  return (layout as { sections: StationSection[] }).sections
    .map((section) => ({
      ...section,
      shelves: section.shelves
        .map((shelf) => ({
          ...shelf,
          stations: getLiveStationsBySlugs(shelf.stations).map((s) => s.slug),
        }))
        .filter((shelf) => shelf.stations.length > 0),
    }))
    .filter((section) => section.shelves.length > 0);
}

/** Slugs the site features at the top of Home, on-air ones only. */
export function getFeatured(): RadioStation[] {
  return getLiveStationsBySlugs((layout as { featured: string[] }).featured);
}

/** The station the dial opens on when nothing is playing — the flagship. */
export const DEFAULT_STATION_SLUG = 'jubilee-radio';

/** The HM band's bounds. The dial draws this whole range, not just the occupied part. */
export const BAND_LO = 300;
export const BAND_HI = 400;
