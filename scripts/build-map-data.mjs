#!/usr/bin/env node
/**
 * Build the bundled map data.
 *
 * Two inputs from the website, neither of which the app carried before:
 *
 *   world-110m.json  177 countries as [lon,lat] rings. Already a clean custom
 *                    format (kj.worldmap/1) — no TopoJSON to decode.
 *   stations-data.js each station's broadcast bases: city, country, lat/lon,
 *                    and whether it carries a tower.
 *
 * The rings are projected to SVG paths HERE rather than on the device. An
 * equirectangular projection is one multiply per coordinate, so the phone could
 * do it — but it would redo the whole world on every mount, and shipping paths
 * lets react-native-svg parse strings instead of walking ~10k coordinate pairs.
 *
 * Re-run when the website's map data changes:
 *   node scripts/build-map-data.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const WEB = 'D:/Projects Data/KJubilee.com';
const OUT = path.join(process.cwd(), 'src/assets/radio');

/** viewBox of the generated paths. Equirectangular, so width is exactly 2x height. */
const W = 2000;
const H = 1000;
/** Coordinates rounded to this many decimals — a tenth of a viewBox unit is
 *  far finer than any phone pixel, and it roughly halves the file. */
const PRECISION = 1;

if (!existsSync(`${WEB}/public/data/world-110m.json`)) {
  console.error(`World data not found under ${WEB}`);
  process.exit(1);
}

// ---- world outline -------------------------------------------------------

const world = JSON.parse(readFileSync(`${WEB}/public/data/world-110m.json`, 'utf8'));

/** Equirectangular: lon -180..180 → 0..W, lat 90..-90 → 0..H. */
const projX = (lon) => ((lon + 180) / 360) * W;
const projY = (lat) => ((90 - lat) / 180) * H;
const r = (n) => Number(n.toFixed(PRECISION));

const countries = world.countries
  .map((c) => {
    const d = c.rings
      .map((ring) => {
        let out = '';
        let px = null;
        let py = null;
        for (const [lon, lat] of ring) {
          const x = r(projX(lon));
          const y = r(projY(lat));
          // Drop points that round to the same place as the previous one —
          // at 110m detail with a 2000-unit viewBox there are many.
          if (x === px && y === py) continue;
          out += `${out ? 'L' : 'M'}${x} ${y}`;
          px = x;
          py = y;
        }
        return out ? `${out}Z` : '';
      })
      .filter(Boolean)
      .join('');
    return d ? { id: c.id, name: c.name, d } : null;
  })
  .filter(Boolean);

// ---- broadcast bases -----------------------------------------------------

const require_ = createRequire(import.meta.url);
global.window = {};
require_(`${WEB}/public/js/stations-data.js`);
const STATIONS = global.window.KJ_STATIONS || [];

/**
 * One dot per city, carrying the stations that broadcast from it.
 *
 * Collapsed by city because 315 base entries resolve to 73 places: drawing them
 * per-station would stack dozens of dots on the same pixel and make a city with
 * ten stations look identical to one with one.
 */
const byCity = new Map();
for (const s of STATIONS) {
  for (const b of s.bases || []) {
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number') continue;
    const key = `${b.city}|${b.cc}`;
    if (!byCity.has(key)) {
      byCity.set(key, {
        city: b.city,
        cc: b.cc,
        region: b.region,
        lat: b.lat,
        lon: b.lon,
        x: r(projX(b.lon)),
        y: r(projY(b.lat)),
        tower: false,
        stations: [],
      });
    }
    const dot = byCity.get(key);
    if (b.tower) dot.tower = true;
    if (!dot.stations.includes(s.slug)) dot.stations.push(s.slug);
  }
}

const cities = [...byCity.values()].sort((a, b) => b.stations.length - a.stations.length);

writeFileSync(
  path.join(OUT, 'worldMap.json'),
  `${JSON.stringify({ width: W, height: H, countries, cities }, null, 0)}\n`,
);

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(
  `wrote worldMap.json — ${countries.length} countries, ${cities.length} cities ` +
    `(${STATIONS.reduce((n, s) => n + (s.bases?.length || 0), 0)} base entries), ` +
    kb(readFileSync(path.join(OUT, 'worldMap.json')).length),
);
