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
 * The Dial is built on this rather than the full catalog on purpose: a dial that
 * stops on a frequency carrying nothing teaches the listener that next is
 * unreliable. Home shows the rest as "coming soon" instead.
 */
export function getStations(): RadioStation[] {
  return CATALOG.filter((s) => s.live);
}

/** The whole network, playable or not — what Home browses. */
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

/** Home's shelves, in the site's own order: music, teaching, family, international. */
export function getSections(): StationSection[] {
  return (layout as { sections: StationSection[] }).sections;
}

/** Slugs the site features at the top of Home. */
export function getFeatured(): RadioStation[] {
  return getStationsBySlugs((layout as { featured: string[] }).featured);
}

/** The station the dial opens on when nothing is playing — the flagship. */
export const DEFAULT_STATION_SLUG = 'jubilee-radio';

/** The HM band's bounds. The dial draws this whole range, not just the occupied part. */
export const BAND_LO = 300;
export const BAND_HI = 400;
