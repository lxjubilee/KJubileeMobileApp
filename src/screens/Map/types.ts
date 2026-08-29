import map from '@/assets/radio/worldMap.json';

export interface City {
  city: string;
  cc: string;
  region: string;
  x: number;
  y: number;
  /** False for a broadcast origin the tower roster has no transmitter for. */
  tower: boolean;
  stations: string[];
}

export interface World {
  width: number;
  height: number;
  /** Countries the roster transmits from — the site's own figure, not a count of outlines. */
  countryCount: number;
  /** Region order, as the site groups its location list. */
  regions: string[];
  countries: { id: string; name: string; d: string }[];
  cities: City[];
}

export const WORLD = map as unknown as World;

/**
 * The band of the projection actually drawn, matching the web's own crop.
 *
 * The equirectangular sphere runs 0..1000, but the top and bottom of it are
 * empty ocean and ice: nothing transmits above ~84N or below ~60S. Drawing the
 * full height spent a fifth of the screen on blank space at both ends. These
 * are the site's VIEW_TOP / VIEW_BOT to the unit, so both maps frame the world
 * identically.
 */
export const VIEW_TOP = 34;
export const VIEW_BOTTOM = 832;
export const VIEW_H = VIEW_BOTTOM - VIEW_TOP;

/** Pan offset and zoom, in viewBox units. */
export interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

export const HOME_VIEW: Viewport = { scale: 1, tx: 0, ty: 0 };

/** Each press of + or − moves by this factor, matching the web's zoom buttons. */
export const ZOOM_STEP = 1.5;
export const MIN_SCALE = 1;
export const MAX_SCALE = 8;

/**
 * Markers drawn larger than the rest, as a multiple of the base size.
 *
 * Sacramento is the origin — where the dial is run from. It is one edge
 * location among 347 as far as the network is concerned, so nothing in the data
 * marks it out: the emphasis is editorial and belongs here rather than in the
 * roster the build produces. Kept identical to the web's own EMPHASIS map.
 */
const EMPHASIS: Record<string, number> = { 'Sacramento|US': 3 };

/**
 * Dot radius in viewBox units.
 *
 * A tower with no station filed against it gets the small base size. At 347
 * markers the old floor of 8 read as dots first and geography second, which is
 * backwards for a map of where the signal is — the site halved its own marker
 * size for exactly that reason when it went past 300.
 */
export function radiusFor(city: City): number {
  const n = city.stations.length;
  const base = n === 0 ? 4.5 : Math.min(20, 8 + Math.sqrt(n) * 2.6);
  return base * (EMPHASIS[`${city.city}|${city.cc}`] ?? 1);
}

/**
 * Latitude and longitude lines every 20 degrees, as the site draws under its
 * land. Precomputed once: it never changes, and it is one path either way.
 *
 * Latitudes stop at 80 because the two beyond it are off the cropped band.
 */
export const GRATICULE = (() => {
  const W = 2000;
  let d = '';
  for (let lon = -180; lon <= 180; lon += 20) {
    const x = (((lon + 180) / 360) * W).toFixed(1);
    d += `M${x} ${VIEW_TOP}L${x} ${VIEW_BOTTOM}`;
  }
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = (((90 - lat) / 180) * 1000).toFixed(1);
    d += `M0 ${y}L${W} ${y}`;
  }
  return d;
})();

/**
 * A repeatable number from a string, so a city keeps the same pulse across
 * relaunches and across everyone's screen — the map looks alive rather than
 * shuffled, and the rhythm is something a test could assert about instead of
 * something that happens to differ every run. FNV-1a, same as the site's.
 */
export function hashLabel(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

/** Round country flag, as the site's location list draws them. */
export const flagUrl = (cc: string) => `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
