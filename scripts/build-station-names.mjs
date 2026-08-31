#!/usr/bin/env node
/**
 * Reconcile station NAMES against the published registry on kjubilee.com.
 *
 * WHY THIS EXISTS. A station's display name is editorial and changes without
 * warning: "Latin Worship (Sung in English)" became "Latin Worship
 * (English-Spanish)" on the site while the app went on printing the old one on
 * the Dial. The local checkouts of the web repo are themselves behind the
 * deployment, so they cannot referee this — `/js/stations-data.js` as SERVED is
 * the only copy that matches what a listener sees.
 *
 * Names only. `hm`/`tenant`/`live` belong to build-station-catalog.mjs, which
 * takes them from the backend's tenant records rather than from a page asset,
 * and the two must not fight over the same fields.
 *
 * Slugs are the join and are never rewritten: they key the bundled artwork,
 * sections.json and the persona portraits.
 *
 *   node scripts/build-station-names.mjs           # report only
 *   node scripts/build-station-names.mjs --apply   # write stations.json
 *
 * REPORT IS THE DEFAULT, matching the other catalog scripts.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REGISTRY = 'https://kjubilee.com/js/stations-data.js';
const CATALOG = path.join(process.cwd(), 'src/assets/radio/stations.json');

const apply = process.argv.includes('--apply');

const res = await fetch(REGISTRY);
if (!res.ok) throw new Error(`${REGISTRY} -> HTTP ${res.status}`);
const source = await res.text();

// The asset is a script, not JSON: one `KJ_STATIONS = [...]` array among
// several globals. Slice the literal out rather than executing the file.
const match = source.match(/KJ_STATIONS\s*=\s*(\[[\s\S]*?\]);/);
if (!match) throw new Error('KJ_STATIONS array not found in the served registry');
const live = new Map(JSON.parse(match[1]).map((s) => [s.slug, s]));

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));

const renamed = [];
const absent = [];
let untouched = 0;

const next = catalog.map((station) => {
  const w = live.get(station.slug);
  if (!w?.name) {
    absent.push(station.slug);
    return station;
  }
  if (w.name === station.name) {
    untouched += 1;
    return station;
  }
  renamed.push(`${station.slug.padEnd(24)} ${station.name}\n${''.padEnd(24)}   -> ${w.name}`);
  return { ...station, name: w.name };
});

console.log(
  [
    `registry : ${REGISTRY} (${live.size} stations)`,
    `catalog  : ${CATALOG} (${catalog.length} stations)`,
    '',
    `renamed  ${renamed.length}`,
    `same     ${untouched}`,
    `absent   ${absent.length}`,
    ...(renamed.length ? ['', 'RENAMED', ...renamed.map((l) => `  ${l}`)] : []),
    ...(absent.length ? ['', 'NOT IN REGISTRY', ...absent.map((s) => `  ${s}`)] : []),
  ].join('\n'),
);

if (!apply) {
  console.log('\nReport only. Re-run with --apply to write the catalog.');
} else if (renamed.length) {
  await writeFile(CATALOG, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${CATALOG}`);
} else {
  console.log('\nNothing to write.');
}
