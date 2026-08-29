#!/usr/bin/env node
/**
 * Bundle the website's station articles.
 *
 * `KJubilee.com-developer/public/js/station-articles.js` is the editorial copy
 * behind each station page — the "For this:" standfirst, the "What it stands on"
 * pull-quote, and the written sections. It is a browser global
 * (`window.KJ_ARTICLES = {…}`), keyed by slug, and the app already speaks that
 * same slug vocabulary, so it joins straight onto the catalog with no aliasing.
 *
 * Generated rather than copied by hand. The catalog drifted from the backend
 * exactly that way — fifteen stations quietly pointing at frequencies that no
 * longer existed — and prose rots the same way, just less visibly.
 *
 * Only 17 of the 105 stations have an article. A station without one still
 * renders: the screen falls back to the catalog's own description, which is what
 * the website does too (`articleFor()`).
 *
 * Re-run after the website's copy changes:
 *   node scripts/build-station-articles.mjs           # report only
 *   node scripts/build-station-articles.mjs --apply   # write the JSON
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SRC =
  'D:/Projects Data/KJubilee.com-developer/KJubilee.com-developer/public/js/station-articles.js';
const OUT = path.join(process.cwd(), 'src/assets/radio/stationArticles.json');

const apply = process.argv.includes('--apply');

const src = await readFile(SRC, 'utf8');

// The file assigns one object literal to a browser global. Evaluating it in a
// throwaway scope is what reads it faithfully — a regex over 18 KB of prose
// containing braces, quotes and apostrophes would not.
const match = src.match(/window\.KJ_ARTICLES\s*=\s*(\{[\s\S]*?\});?\s*$/);
if (!match) {
  console.error('could not find `window.KJ_ARTICLES = {…}` in', SRC);
  process.exit(1);
}

let articles;
try {
  articles = new Function(`return (${match[1]});`)();
} catch (err) {
  console.error('failed to evaluate the articles object:', err.message);
  process.exit(1);
}

const catalog = JSON.parse(
  await readFile(path.join(process.cwd(), 'src/assets/radio/stations.json'), 'utf8'),
);
const slugs = new Set(catalog.map((s) => s.slug));

// Keep only what the app can actually show, and normalise the shape so the
// screen never has to guard against a missing array.
const out = {};
const orphans = [];
for (const [slug, a] of Object.entries(articles)) {
  if (!slugs.has(slug)) {
    orphans.push(slug);
    continue;
  }
  out[slug] = {
    need: typeof a?.need === 'string' ? a.need : null,
    stands: typeof a?.stands === 'string' ? a.stands : null,
    sections: (Array.isArray(a?.sections) ? a.sections : [])
      .map((s) => ({
        h: typeof s?.h === 'string' ? s.h : null,
        p: (Array.isArray(s?.p) ? s.p : []).filter((x) => typeof x === 'string'),
      }))
      .filter((s) => s.h || s.p.length),
  };
}

const kept = Object.keys(out).sort();
const withoutArticle = catalog.filter((s) => s.live && !out[s.slug]).map((s) => s.slug);

console.log(`articles in source: ${Object.keys(articles).length}`);
console.log(`matched to catalog: ${kept.length}`);
console.log(`  ${kept.join(', ')}`);
if (orphans.length) console.log(`\nno catalog entry (skipped): ${orphans.join(', ')}`);
if (withoutArticle.length) {
  console.log(`\nlive stations with no article (they fall back to `);
  console.log(`the catalog description): ${withoutArticle.join(', ')}`);
}

if (!apply) {
  console.log('\nreport only — pass --apply to write stationArticles.json');
} else {
  // Sorted keys so a re-run produces a stable diff rather than a reshuffle.
  const sorted = Object.fromEntries(kept.map((k) => [k, out[k]]));
  await writeFile(OUT, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${OUT}`);
}
