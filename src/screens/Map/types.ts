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
 * A rectangular window into the world in viewBox units — what an SVG shows at
 * base zoom, and the frame every pan/zoom offset is measured against.
 */
export interface Band {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The window that exactly fills a `boxW x boxH` box on screen at base zoom.
 *
 * The world is always fitted by WIDTH — every longitude stays on screen, which
 * is the whole point of an overview map, and the 347 towers run from x=123 to
 * x=1991. The height then follows from the box's aspect, so device pixels per
 * viewBox unit is `boxW / WORLD.width` whatever the box's shape: making the box
 * taller reveals more sphere at the SAME scale rather than magnifying anything.
 *
 * This replaced a fixed 34..832 crop copied from the web. That crop existed to
 * skip "empty ocean and ice", but it also pinned the map to 0.4 x its width —
 * 157dp on a phone, too short a strip to pinch on. Opening the window to the
 * full sphere buys 25% more height for free, and the space is not empty: it is
 * where Greenland (y 35..166) and Antarctica (y 851..975) live.
 *
 * When the box is taller than 2:1 the window runs past the poles and `y` goes
 * negative — the world is then centred with slack above and below, which is
 * what the fullscreen map wants as room to zoom into.
 */
export function bandFor(boxW: number, boxH: number): Band {
  const w = WORLD.width;
  const h = (w * boxH) / boxW;
  return { x: 0, y: (WORLD.height - h) / 2, w, h };
}

/** Box height that shows the whole sphere and nothing beyond it. */
export const fullSphereHeight = (boxW: number): number =>
  Math.round((boxW * WORLD.height) / WORLD.width);

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
 * The meridians run pole to pole rather than stopping at the old 34..832 crop.
 * They used to end exactly on the crop edge, which was invisible while the SVG
 * was cut to that band — but the moment the window opened to the full sphere it
 * would have drawn a hard rectangle across the map. Latitudes still stop at 80:
 * 90 is a point, not a line.
 */
export const GRATICULE = (() => {
  const W = WORLD.width;
  const H = WORLD.height;
  let d = '';
  for (let lon = -180; lon <= 180; lon += 20) {
    const x = (((lon + 180) / 360) * W).toFixed(1);
    d += `M${x} 0L${x} ${H}`;
  }
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = (((90 - lat) / 180) * H).toFixed(1);
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
