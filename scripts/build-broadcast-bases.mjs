#!/usr/bin/env node
/**
 * Port each station's broadcast bases — the cities it transmits from — into the
 * bundled catalog. The Dial prints them under the readout in broadcast green,
 * the way kjubilee.com does, so the list has to travel with the catalog: the
 * Dial must paint before any network call returns.
 *
 * SOURCE IS THE SERVED REGISTRY, NOT THE LOCAL CHECKOUT. This script first read
 * `data/broadcast-bases.json` out of the web repo on disk, and that copy is
 * behind the deployment — twelve stations disagreed, most of them relay lists
 * that have since been cut from three cities to two (Riddim and Rhyme lost
 * Newark, Upper Room grew to seven). `/js/stations-data.js` as SERVED is the
 * only copy that matches what a listener sees, and it is what the site's own
 * dial reads.
 *
 * Only the city NAMES come across, de-duplicated in order, exactly as the
 * site's `originHTML` does it. The per-city `cc`/`tz`/`lat`/`lon` belong to the
 * map, which has its own copy, and `basesWhy` is tooltip copy the phone has no
 * room for.
 *
 *   node scripts/build-broadcast-bases.mjs           # report only
 *   node scripts/build-broadcast-bases.mjs --apply   # write stations.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REGISTRY = 'https://kjubilee.com/js/stations-data.js';
const CATALOG = path.join(process.cwd(), 'src/assets/radio/stations.json');

const apply = process.argv.includes('--apply');

const res = await fetch(REGISTRY);
if (!res.ok) throw new Error(`${REGISTRY} -> HTTP ${res.status}`);
const source = await res.text();

const match = source.match(/KJ_STATIONS\s*=\s*(\[[\s\S]*?\]);/);
if (!match) throw new Error('KJ_STATIONS array not found in the served registry');

const live = new Map(
  JSON.parse(match[1]).map((s) => {
    const cities = [];
    for (const b of s.bases ?? []) {
      // Dedupe in place, keeping first appearance: the anchor leads, and a city
      // that also appears as a relay must not be printed twice.
      if (b?.city && !cities.includes(b.city)) cities.push(b.city);
    }
    return [s.slug, cities];
  }),
);

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));

const added = [];
const changed = [];
const absent = [];
let untouched = 0;

const next = catalog.map((station) => {
  const cities = live.get(station.slug);
  if (!cities?.length) {
    absent.push(station.slug);
    // A station with no bases recorded keeps whatever it has rather than a
    // guess — the site's own rule: real cities for thirty stations must not
    // become an invented one for the thirty-first.
    return station;
  }

  const before = station.bases;
  if (Array.isArray(before) && before.join('\u0000') === cities.join('\u0000')) {
    untouched += 1;
    return station;
  }

  (before ? changed : added).push(
    `${station.slug.padEnd(28)}${before ? `${before.join(', ')}\n${''.padEnd(28)}  -> ` : ''}${cities.join(', ')}`,
  );
  return { ...station, bases: cities };
});

console.log(
  [
    `registry : ${REGISTRY} (${live.size} stations)`,
    `catalog  : ${CATALOG} (${catalog.length} stations)`,
    '',
    `added    ${added.length}`,
    `changed  ${changed.length}`,
    `same     ${untouched}`,
    `absent   ${absent.length}`,
    ...(added.length ? ['', 'ADDED', ...added.map((l) => `  ${l}`)] : []),
    ...(changed.length ? ['', 'CHANGED', ...changed.map((l) => `  ${l}`)] : []),
    ...(absent.length ? ['', 'NO BASES PUBLISHED', ...absent.map((s) => `  ${s}`)] : []),
  ].join('\n'),
);

if (!apply) {
  console.log('\nReport only. Re-run with --apply to write the catalog.');
} else if (added.length || changed.length) {
  await writeFile(CATALOG, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${CATALOG}`);
} else {
  console.log('\nNothing to write.');
}
