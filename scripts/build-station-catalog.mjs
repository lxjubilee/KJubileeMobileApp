#!/usr/bin/env node
/**
 * Reconcile the bundled station catalog against the backend's tenant records.
 *
 * `hm` and `tenant` are not ours to invent. The backend owns them, one file per
 * station under `KJubilee.com-developer/tenants/`, and the day file the player
 * fetches is addressed by the tenant id:
 *
 *     radio/<TENANT>/delivery/<TENANT-no-dashes>-<YYYYMMDD>.json
 *
 * WHY THIS SCRIPT EXISTS. The two catalogs silently diverged. The band was
 * renumbered — jubilee-radio moved from 388.70 to 308.70, Torah Sings from
 * 305.12 to 305.40, and so on for every live station — and because the app's
 * copy was hand-maintained, nothing noticed. Every day-file request 404'd, so
 * no station could play, and the failure looked like a dead CDN rather than
 * stale data. Fifteen records hand-copied once is how that happens; a command
 * is how it stops happening.
 *
 * Re-run after the backend's tenant list changes:
 *   node scripts/build-station-catalog.mjs           # report only
 *   node scripts/build-station-catalog.mjs --apply   # write stations.json
 *
 * REPORT IS THE DEFAULT, matching build-station-art.mjs's caution: this rewrites
 * the catalog every screen reads.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TENANT_DIR =
  'D:/Projects Data/KJubilee.com-developer/KJubilee.com-developer/tenants';
const CATALOG = path.join(process.cwd(), 'src/assets/radio/stations.json');

/**
 * Slugs the two sides spell differently for the same station.
 *
 * The app calls Torah Sings `jubilee-praise`; the backend calls it
 * `torah-sings`. Renaming the app's slug would be the tidier fix and the wrong
 * one here — the slug keys the bundled artwork, `sections.json` and the persona
 * portraits, so it is an identifier with three other consumers. Aliasing keeps
 * the join correct without moving any of that.
 */
const SLUG_ALIASES = { 'jubilee-praise': 'torah-sings' };

const apply = process.argv.includes('--apply');

const tenants = new Map();
for (const file of await readdir(TENANT_DIR)) {
  if (!file.endsWith('.json')) continue;
  const t = JSON.parse(await readFile(path.join(TENANT_DIR, file), 'utf8'));
  if (t?.slug) tenants.set(t.slug, t);
}

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));

const changed = [];
const dropped = [];
let untouched = 0;

const next = catalog.map((station) => {
  const key = SLUG_ALIASES[station.slug] ?? station.slug;
  const t = tenants.get(key);

  // No tenant record means no published day file, so the station cannot be
  // tuned. Saying so is better than leaving `live: true` pointing at a 404 —
  // the Dial would offer it and the player would fail on arrival.
  if (!t) {
    if (station.live) {
      dropped.push(`${station.slug} (was ${station.hm}/${station.tenant})`);
      return { ...station, hm: station.hm, tenant: null, live: false };
    }
    return station;
  }

  if (station.hm === t.hm && station.tenant === t.id && station.live) {
    untouched += 1;
    return station;
  }

  changed.push(
    `${station.slug.padEnd(24)} ${String(station.hm).padEnd(8)}/${String(station.tenant)}` +
      `  ->  ${String(t.hm).padEnd(8)}/${t.id}`,
  );
  // Spread first so every key keeps its original position; only these three move.
  return { ...station, hm: t.hm, tenant: t.id, live: true };
});

console.log(`tenants: ${tenants.size}   catalog: ${catalog.length}`);
console.log(`already correct: ${untouched}`);
console.log(`\nretuned (${changed.length}):`);
for (const line of changed) console.log('  ' + line);
if (dropped.length) {
  console.log(`\nno tenant — marked live:false (${dropped.length}):`);
  for (const line of dropped) console.log('  ' + line);
}

const unused = [...tenants.keys()].filter(
  (slug) => !catalog.some((s) => (SLUG_ALIASES[s.slug] ?? s.slug) === slug),
);
if (unused.length) console.log(`\nbackend tenants with no catalog entry: ${unused.join(', ')}`);

if (!apply) {
  console.log('\nreport only — pass --apply to write stations.json');
} else {
  await writeFile(CATALOG, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${CATALOG}`);
}
