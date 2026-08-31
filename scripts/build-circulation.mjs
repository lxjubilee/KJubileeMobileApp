#!/usr/bin/env node
/**
 * Port each station's potential-outreach figure — what the Dial prints as
 * `(96,096,000 c.)` beside the format and host.
 *
 * The site keeps it OUT of the station registry: `tools/build-circulation.js`
 * computes it from `data/circulation.json` and publishes
 * `/js/circulation-data.js`, a separate asset keyed by slug. It is a research
 * figure with its own methodology and its own update cadence, not part of a
 * station's identity, and the two are versioned apart for that reason. So this
 * is a second porter rather than a field bolted onto the names sync.
 *
 * WHY NOT COMPUTE IT HERE. It is not derivable from anything the app carries.
 * The figure is de-duplicated across stations that share a language segment —
 * the published totals show a naive sum of 22.15bn collapsing to 3.14bn
 * device-reachable — so summing city populations would produce a different and
 * wrong number. It is copied, never recalculated.
 *
 *   node scripts/build-circulation.mjs           # report only
 *   node scripts/build-circulation.mjs --apply   # write stations.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE = 'https://kjubilee.com/js/circulation-data.js';
const CATALOG = path.join(process.cwd(), 'src/assets/radio/stations.json');

const apply = process.argv.includes('--apply');

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`${SOURCE} -> HTTP ${res.status}`);
const text = await res.text();

// A script asset, not JSON: one `window.KJ_CIRCULATION = {...}` object. Slice
// the literal rather than executing the file.
const match = text.match(/window\.KJ_CIRCULATION\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
if (!match) throw new Error('KJ_CIRCULATION object not found in the served asset');
const data = JSON.parse(match[1]);
const figures = data.stations ?? {};

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));

const added = [];
const changed = [];
const absent = [];
let untouched = 0;

const next = catalog.map((station) => {
  const v = figures[station.slug];
  if (typeof v !== 'number') {
    absent.push(station.slug);
    // Leave any existing figure alone: a gap upstream is a gap, not a retraction.
    return station;
  }
  if (station.circulation === v) {
    untouched += 1;
    return station;
  }
  const line = `${station.slug.padEnd(28)} ${v.toLocaleString('en-US')}`;
  (station.circulation == null ? added : changed).push(line);
  return { ...station, circulation: v };
});

console.log(
  [
    `source  : ${SOURCE}`,
    `dataset : updated ${data.updated}, generated ${data.generated}, ${Object.keys(figures).length} stations`,
    `catalog : ${CATALOG} (${catalog.length} stations)`,
    '',
    `added    ${added.length}`,
    `changed  ${changed.length}`,
    `same     ${untouched}`,
    `absent   ${absent.length}`,
    ...(changed.length ? ['', 'CHANGED', ...changed.map((l) => `  ${l}`)] : []),
    ...(absent.length ? ['', 'NO FIGURE PUBLISHED', ...absent.map((s) => `  ${s}`)] : []),
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
