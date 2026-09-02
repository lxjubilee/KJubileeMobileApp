#!/usr/bin/env node
/**
 * Build the bundled map data.
 *
 * Three inputs, all read from PRODUCTION:
 *
 *   world-110m.json  177 countries as [lon,lat] rings. Already a clean custom
 *                    format (kj.worldmap/1) — no TopoJSON to decode.
 *   hm-towers.json   THE ROSTER THE SITE'S MAP DRAWS: 347 AI Radio Towers
 *                    across 132 countries, in seven regions.
 *   stations-data.js each station's broadcast bases, which is where the station
 *                    list under a tapped city comes from.
 *
 * WHY THE TOWERS ROSTER. This built its dots from station bases alone, and
 * those resolve to 72 cities — so the app drew 72 markers where the site draws
 * 347, and whole regions were simply absent: one dot in South America against
 * the site's 49, none at all in Oceania against 14. Every city it had was a
 * real tower. It was missing 275 of them.
 *
 * WHY BOTH FILES. They answer different questions and the app needs both.
 * hm-towers.json says WHERE the signal transmits from and carries no station
 * list — which is why the site's own map cannot tell you what plays from a
 * marker. Station bases say WHICH stations broadcast from a city. Joined on
 * `city|cc`, every tower stays on the map AND the station panel survives, which
 * is the one thing this screen has that the website's does not.
 *
 * WHY PRODUCTION, NOT THE LOCAL CHECKOUT. Both local copies of the website are
 * behind the deployed one — the same lesson build-sections.mjs records — so
 * reading from disk would faithfully reproduce whatever drift is already there.
 *
 * The rings are projected to SVG paths HERE rather than on the device. An
 * equirectangular projection is one multiply per coordinate, so the phone could
 * do it — but it would redo the whole world on every mount, and shipping paths
 * lets react-native-svg parse strings instead of walking ~10k coordinate pairs.
 *
 * Re-run when the website's map data changes:
 *   node scripts/build-map-data.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SITE = 'https://kjubilee.com';
const OUT = path.join(process.cwd(), 'src/assets/radio');

/** viewBox of the generated paths. Equirectangular, so width is exactly 2x height. */
const W = 2000;
const H = 1000;
/** Coordinates rounded to this many decimals — a tenth of a viewBox unit is
 *  far finer than any phone pixel, and it roughly halves the file. */
const PRECISION = 1;

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

/** Pull one `window.KJ_X = <json>;` out of a generated site script. */
function readGlobal(src, name) {
  const start = src.indexOf(`window.${name}`);
  if (start < 0) throw new Error(`${name} not found`);
  const eq = src.indexOf('=', start);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = eq + 1; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    else if (ch === ';' && depth === 0) return JSON.parse(src.slice(eq + 1, i).trim());
  }
  throw new Error(`${name} literal never closed`);
}

// ---- world outline -------------------------------------------------------

const world = JSON.parse(await get(`${SITE}/data/world-110m.json`));

/** Equirectangular: lon -180..180 → 0..W, lat 90..-90 → 0..H. */
const projX = (lon) => ((lon + 180) / 360) * W;
const projY = (lat) => ((90 - lat) / 180) * H;
const r = (n) => Number(n.toFixed(PRECISION));

/**
 * Break a ring wherever it jumps the antimeridian.
 *
 * A country that straddles 180 degrees has points on both sides of it, and
 * they are neighbours on the globe — Fiji's Vanua Levu at 179.4E and its Lau
 * group at 179.9W are 40km apart. Flat, they are at opposite ENDS of the map,
 * and the projection joins them with a straight line: a segment 2000 units
 * wide across an 1000-unit-tall world. Filled it is invisible; STROKED it is a
 * bright rule straight across every continent at that latitude, drawn after
 * the graticule and over the land. Three countries did this — Fiji at 16S,
 * Russia twice up at 71N — and the Fiji one lands across South America and
 * southern Africa where nobody can miss it.
 *
 * Rings that cross come back in: a polygon that leaves the map at one edge has
 * to re-enter at the other, so its crossings come in PAIRS. Cutting at each
 * one and closing the pieces separately leaves each piece on its own side.
 *
 * A single crossing is not a crossing at all — it is a ring whose two ends sit
 * on opposite edges, closed along the map's border. Antarctica is the one that
 * matters: its 554-point coastline runs 180W to 180E and shuts along a flat
 * line at 85.6S, which is that border and belongs on the map. Splitting a
 * one-crossing ring would give one piece with the identical outline anyway, so
 * this returns it untouched rather than relying on that.
 */
function splitAtAntimeridian(pts) {
  const n = pts.length;
  const wraps = [];
  for (let i = 0; i < n; i++) {
    if (Math.abs(pts[(i + 1) % n][0] - pts[i][0]) > W / 2) wraps.push(i);
  }
  if (wraps.length < 2) return [pts];

  const out = [];
  for (let k = 0; k < wraps.length; k++) {
    // Each piece runs from just after one crossing up to and including the
    // next, wrapping around the end of the ring to get there.
    const start = (wraps[k] + 1) % n;
    const end = wraps[(k + 1) % wraps.length];
    const piece = [];
    for (let i = start; ; i = (i + 1) % n) {
      piece.push(pts[i]);
      if (i === end) break;
    }
    // Under three points there is no shape left to draw, only the line back —
    // which is the thing being removed. Russia leaves one such offcut.
    if (piece.length >= 3) out.push(piece);
  }
  return out;
}

const countries = world.countries
  .map((c) => {
    const d = c.rings
      .flatMap((ring) => {
        const pts = [];
        for (const [lon, lat] of ring) {
          const x = r(projX(lon));
          const y = r(projY(lat));
          // Drop points that round to the same place as the previous one —
          // at 110m detail with a 2000-unit viewBox there are many.
          const prev = pts[pts.length - 1];
          if (prev && prev[0] === x && prev[1] === y) continue;
          pts.push([x, y]);
        }
        return pts.length ? splitAtAntimeridian(pts) : [];
      })
      .map((piece) => piece.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z')
      .join('');
    return d ? { id: c.id, name: c.name, d } : null;
  })
  .filter(Boolean);

// ---- towers, and the stations that broadcast from them --------------------

const roster = JSON.parse(await get(`${SITE}/data/hm-towers.json`));
const STATIONS = readGlobal(await get(`${SITE}/js/stations-data.js`), 'KJ_STATIONS');

/**
 * Which stations broadcast from each city, keyed `city|cc`.
 *
 * Collapsed by city because the base entries resolve to far fewer places than
 * there are entries: kept per-station they would stack dozens of markers on one
 * pixel, and a city with ten stations would look identical to one with one.
 */
const stationsByCity = new Map();
for (const s of STATIONS) {
  for (const b of s.bases || []) {
    const key = `${b.city}|${b.cc}`;
    if (!stationsByCity.has(key)) {
      stationsByCity.set(key, {
        city: b.city,
        cc: b.cc,
        region: b.region,
        lat: b.lat,
        lon: b.lon,
        stations: [],
      });
    }
    const entry = stationsByCity.get(key);
    if (!entry.stations.includes(s.slug)) entry.stations.push(s.slug);
  }
}

/**
 * EVERY tower is a dot, whether or not a station is filed against it.
 *
 * A tower with no stations is not missing data — it is a transmitter carrying
 * the dial that no station names as a base, and the site draws all 347 alike.
 * Keeping only the ones with a station list is exactly how the app came to
 * show 72.
 */
const cities = roster.towers
  .map((t) => ({
    city: t.city,
    cc: t.cc,
    region: t.region,
    lat: t.lat,
    lon: t.lon,
    x: r(projX(t.lon)),
    y: r(projY(t.lat)),
    tower: true,
    stations: stationsByCity.get(`${t.city}|${t.cc}`)?.stations ?? [],
  }))
  // Busiest last: the screen paints in array order, so the cities carrying the
  // most stations are drawn on top and cannot be hidden by a quieter neighbour.
  .sort((a, b) => a.stations.length - b.stations.length);

/**
 * Broadcast origins with no tower in the roster.
 *
 * Kept as dots, flagged `tower: false`. Jerusalem is the case that matters: it
 * is Torah Sings' anchor — the origin the site's dial names first for that
 * station — and it carries no tower of its own, so a map built from the roster
 * alone would drop the one city the flagship broadcasts from.
 */
const towerKeys = new Set(cities.map((c) => `${c.city}|${c.cc}`));
const orphans = [...stationsByCity.values()].filter(
  (e) => !towerKeys.has(`${e.city}|${e.cc}`) && typeof e.lat === 'number',
);
for (const e of orphans) {
  cities.push({
    city: e.city,
    cc: e.cc,
    region: e.region,
    lat: e.lat,
    lon: e.lon,
    x: r(projX(e.lon)),
    y: r(projY(e.lat)),
    tower: false,
    stations: e.stations,
  });
}
cities.sort((a, b) => a.stations.length - b.stations.length);

writeFileSync(
  path.join(OUT, 'worldMap.json'),
  `${JSON.stringify(
    {
      width: W,
      height: H,
      /** How many countries the roster transmits from — the site's own figure. */
      countryCount: roster.countries,
      /** Region order, as the site groups its location list. */
      regions: roster.regions,
      countries,
      cities,
    },
    null,
    0,
  )}\n`,
);

const kb = (n) => `${Math.round(n / 1024)} KB`;
const withStations = cities.filter((c) => c.stations.length).length;
console.log(
  `wrote worldMap.json — ${countries.length} country outlines, ${cities.length} towers ` +
    `across ${roster.countries} countries, ${withStations} carrying stations, ` +
    kb(readFileSync(path.join(OUT, 'worldMap.json')).length),
);
for (const region of roster.regions) {
  console.log(`  ${region.padEnd(16)} ${cities.filter((c) => c.region === region).length}`);
}
if (orphans.length) {
  console.log(`\nbases with no tower in the roster (${orphans.length}): ${orphans.join(', ')}`);
}
