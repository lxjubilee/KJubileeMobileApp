#!/usr/bin/env node
/**
 * Rebuild the bundled section layout from the site's own published catalog.
 *
 * WHY THIS SCRIPT EXISTS. `sections.json` drives every category chip in the app
 * — Home's filter row and Browse's — and it was hand-maintained from a snapshot
 * of the website. The site moved on and nothing noticed:
 *
 *   - "Prayer Rooms" was added, taking 12 stations with it. Ten of them were
 *     still filed under International Stations in the app and two under
 *     teaching, so three sections were wrong from one upstream change.
 *   - "Bible Studies & Prayers" was renamed "Bible Teachings".
 *   - Home and Christian Music became separate shelves.
 *   - The order changed: International Stations moved to third, teaching to last.
 *
 * A hand-copied list is how that happens; a command is how it stops happening.
 * This is the same argument build-station-catalog.mjs makes about `hm` and
 * `tenant`, applied to the shelves.
 *
 * SOURCE IS PRODUCTION, deliberately. Both local checkouts of the website
 * (`KJubilee.com` and `KJubilee.com-developer`) still carry the OLD five-section
 * layout, so building from either would faithfully reproduce the drift. The
 * generated file the site actually serves is the only current copy.
 *
 *   node scripts/build-sections.mjs            # report only
 *   node scripts/build-sections.mjs --apply    # write sections.json
 *   node scripts/build-sections.mjs --from <path-to-stations-data.js>
 *
 * REPORT IS THE DEFAULT, matching the other two build scripts: this rewrites a
 * file every screen reads.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://kjubilee.com/js/stations-data.js';
const SECTIONS = path.join(process.cwd(), 'src/assets/radio/sections.json');
const CATALOG = path.join(process.cwd(), 'src/assets/radio/stations.json');

/**
 * The app's "Home" chip is a client-side sentinel meaning *show everything*
 * (`HOME_FILTER_ALL`), not a shelf. The site's `home` section is a curated
 * landing shelf that happens to share the word. Emitting it would put two chips
 * labelled "Home" side by side, so it is skipped and the sentinel keeps the
 * name — which lands the app on the same chip row the site shows, in the same
 * order.
 */
const SKIP_SECTIONS = new Set(['home']);

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const fromIdx = args.indexOf('--from');
const fromPath = fromIdx >= 0 ? args[fromIdx + 1] : null;

/** Pull one `window.KJ_X = <json>;` out of the generated file. */
function readGlobal(src, name) {
  const start = src.indexOf(`window.${name}`);
  if (start < 0) throw new Error(`${name} not found in the source file`);
  const eq = src.indexOf('=', start);
  // Scan for the `;` that closes the literal rather than regex across 200KB of
  // JSON — station blurbs contain both semicolons and newlines.
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

async function loadSource() {
  if (fromPath) return { src: await readFile(fromPath, 'utf8'), origin: fromPath };
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`${SOURCE_URL} answered ${res.status}`);
  return { src: await res.text(), origin: SOURCE_URL };
}

const { src, origin } = await loadSource();
const liveSections = readGlobal(src, 'KJ_SECTIONS');
const liveFeatured = readGlobal(src, 'KJ_FEATURED');
const liveStations = readGlobal(src, 'KJ_STATIONS');

const catalogRaw = JSON.parse(await readFile(CATALOG, 'utf8'));
const catalog = Array.isArray(catalogRaw) ? catalogRaw : catalogRaw.stations ?? [];
const known = new Set(catalog.map((s) => s.slug));

const current = JSON.parse(await readFile(SECTIONS, 'utf8'));

const flat = (s) => (s.shelves ?? []).flatMap((shelf) => shelf.stations ?? []);

/** Slugs the site files somewhere but the app's catalog has never heard of. */
const dropped = new Map();

const sections = liveSections
  // A section with no stations is a nav destination, not a category — "The
  // Heavenly Band" is a link to the band, and a chip filtering to nothing would
  // be a dead end.
  .filter((s) => !SKIP_SECTIONS.has(s.id) && flat(s).length > 0)
  .map((s) => {
    const kept = [];
    for (const slug of flat(s)) {
      if (known.has(slug)) kept.push(slug);
      else dropped.set(slug, s.id);
    }
    return {
      id: s.id,
      label: s.nav ?? s.label ?? s.id,
      shelves: [{ title: '', stations: kept }],
    };
  })
  .filter((s) => s.shelves[0].stations.length > 0);

const next = { featured: liveFeatured.filter((s) => known.has(s)), sections };

// ── report ────────────────────────────────────────────────────────────────
const before = new Map(current.sections.map((s) => [s.id, s]));
const after = new Map(sections.map((s) => [s.id, s]));

console.log(`source: ${origin}\n`);
console.log('CHIP ROW');
console.log('  now:  Home · ' + current.sections.map((s) => s.label).join(' · '));
console.log('  next: Home · ' + sections.map((s) => s.label).join(' · '));

console.log('\nPER SECTION');
for (const s of sections) {
  const was = before.get(s.id);
  const n = s.shelves[0].stations.length;
  if (!was) console.log(`  + ${s.id.padEnd(10)} ${s.label.padEnd(24)} NEW, ${n} stations`);
  else {
    const wasN = flat(was).length;
    const renamed = was.label !== s.label ? `  renamed from "${was.label}"` : '';
    const reordered =
      JSON.stringify(flat(was)) !== JSON.stringify(s.shelves[0].stations) ? '  (contents/order changed)' : '';
    console.log(`    ${s.id.padEnd(10)} ${s.label.padEnd(24)} ${wasN} -> ${n}${renamed}${reordered}`);
  }
}
for (const s of current.sections) {
  if (!after.has(s.id)) console.log(`  - ${s.id.padEnd(10)} ${String(s.label).padEnd(24)} REMOVED`);
}

if (dropped.size) {
  console.log(`\nNOT IN THE APP CATALOG — dropped from the shelves (${dropped.size}):`);
  for (const [slug, sec] of dropped) console.log(`  ${slug.padEnd(32)} (site files it under "${sec}")`);
  console.log('  These are stations the site has and the app does not. They need catalog');
  console.log('  entries and artwork before they can appear; run build-station-catalog.mjs.');
}

const missingFromApp = liveStations.map((s) => s.slug).filter((s) => !known.has(s));
console.log(
  `\nCATALOG: site has ${liveStations.length} stations, app has ${catalog.length}` +
    (missingFromApp.length ? ` — ${missingFromApp.length} absent from the app` : ''),
);

if (!apply) {
  console.log('\nReport only. Re-run with --apply to write sections.json.');
} else {
  await writeFile(SECTIONS, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${SECTIONS}`);
}
