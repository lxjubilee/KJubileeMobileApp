#!/usr/bin/env node
/**
 * Build the bundled Heavenly Band article index.
 *
 * WHAT THIS IS. The site's right-hand nav item, "The Heavenly Band", opens 113
 * essays about the band — what Heavenly Modulation is, why it had to be music,
 * why the tools are AI and why it is free — written by twelve of the Inspire
 * members. They live in the catalogue the site already publishes, as
 * `KJ_SECTIONS` → the `hm` entry → `articles[]`.
 *
 * METADATA ONLY, DELIBERATELY. The prose is NOT bundled. One hundred and
 * thirteen essays is about 950KB of text — five times worldMap.json, which is
 * the largest asset the app ships today — and it would be parsed at every cold
 * start whether or not anyone opened an article. The site reached the same
 * conclusion and moved its bodies out of the catalogue for the same reason; they
 * are fetched per slug from `/data/hm-articles/{slug}.json`, which is what
 * `src/services/band/articleBody.ts` does.
 *
 * FROM PRODUCTION, NOT THE LOCAL CHECKOUTS. Both copies of the website on this
 * machine are behind the deployed one and their article records are a different
 * shape: they still carry inline `body`, and no `img` or `words`. Building from
 * either would produce an index that cannot address the body files at all.
 *
 *   node scripts/build-band-articles.mjs            # report only
 *   node scripts/build-band-articles.mjs --apply    # write bandArticles.json
 *
 * REPORT IS THE DEFAULT, matching the other build scripts.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://kjubilee.com/js/stations-data.js';
const OUT = path.join(process.cwd(), 'src/assets/radio/bandArticles.json');
const CATALOG = path.join(process.cwd(), 'src/assets/radio/stations.json');
const PERSONAS = path.join(process.cwd(), 'src/assets/personaImages.ts');

const apply = process.argv.includes('--apply');

/** Pull one `window.KJ_X = <json>;` out of the generated site script. */
function readGlobal(src, name) {
  const start = src.indexOf(`window.${name}`);
  if (start < 0) throw new Error(`${name} not found in ${SOURCE_URL}`);
  const eq = src.indexOf('=', start);
  // Scan for the `;` that closes the literal rather than regex across 200KB of
  // JSON — the prose in this file contains both semicolons and newlines.
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

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`${SOURCE_URL} answered ${res.status}`);
const src = await res.text();

const sections = readGlobal(src, 'KJ_SECTIONS');
const band = sections.find((s) => s.id === 'hm');
if (!band) throw new Error('no `hm` section in KJ_SECTIONS — the site has moved the band');
const liveArticles = band.articles ?? [];
if (!liveArticles.length) throw new Error('the `hm` section carries no articles');

const liveMembers = readGlobal(src, 'KJ_MEMBERS');

const catalog = JSON.parse(await readFile(CATALOG, 'utf8'));
const stationSlugs = new Set((Array.isArray(catalog) ? catalog : catalog.stations).map((s) => s.slug));
const personaSrc = await readFile(PERSONAS, 'utf8');

/**
 * Only the fields the app renders.
 *
 * `gradient` and `image` are dropped from members: the app already bundles a
 * portrait for every member who writes (`src/assets/personaImages.ts`, keyed
 * `<id>-inspire`), and the card's gradient comes from the station named by
 * `article.image`, which the catalogue already carries.
 */
const members = {};
for (const m of liveMembers) {
  members[m.id] = { id: m.id, name: m.name, short: m.short, focus: m.focus };
}

const articles = liveArticles.map((a) => ({
  slug: a.slug,
  kicker: a.kicker,
  title: a.title,
  dek: a.dek,
  /** A STATION slug, not a path — it backs the card's gradient. */
  image: a.image,
  /** A KJ_MEMBERS id. */
  author: a.author,
  stands: a.stands,
  /** Root-relative on kjubilee.com; see articleImageUrl(). */
  img: a.img,
  /** Build-time word count; the app derives reading time from it. */
  words: a.words,
  ...(a.live ? { live: true } : {}),
}));

// ── report ────────────────────────────────────────────────────────────────
const authors = [...new Set(articles.map((a) => a.author))].sort();
const noPortrait = authors.filter((id) => !personaSrc.includes(`'${id}-inspire'`));
const unknownStation = [...new Set(articles.map((a) => a.image))].filter((s) => !stationSlugs.has(s));
const missingImg = articles.filter((a) => a.img !== `/images/articles/${a.slug}.webp`);
const noWords = articles.filter((a) => typeof a.words !== 'number' || a.words <= 0);

console.log(`source: ${SOURCE_URL}\n`);
console.log(`  articles       ${articles.length}`);
console.log(`  members        ${Object.keys(members).length} (${authors.length} of them write)`);
console.log(`  kickers        ${new Set(articles.map((a) => a.kicker)).size} distinct`);
console.log(`  index size     ~${Math.round(JSON.stringify({ members, articles }).length / 1024)} KB`);

if (noPortrait.length) {
  console.log(`\n  authors with NO bundled portrait (${noPortrait.length}): ${noPortrait.join(', ')}`);
  console.log('  Their byline will render name and focus with no picture. Add the');
  console.log('  portrait to src/assets/personaImages.ts as `<id>-inspire`.');
}
if (unknownStation.length) {
  console.log(`\n  article.image naming a station the app does not carry (${unknownStation.length}):`);
  console.log(`    ${unknownStation.join(', ')}`);
  console.log('  Those cards lose their gradient. Re-run build-station-catalog.mjs.');
}
if (missingImg.length) {
  console.log(`\n  articles whose img is not /images/articles/<slug>.webp (${missingImg.length}):`);
  console.log(`    ${missingImg.map((a) => a.slug).join(', ')}`);
}
if (noWords.length) {
  console.log(`\n  articles with no usable word count (${noWords.length}): reading time falls back to 1 min`);
}
if (!noPortrait.length && !unknownStation.length && !missingImg.length && !noWords.length) {
  console.log('\n  every author has a portrait, every station slug resolves, every');
  console.log('  image path and word count is present.');
}

if (!apply) {
  console.log('\nReport only. Re-run with --apply to write bandArticles.json.');
} else {
  await writeFile(OUT, `${JSON.stringify({ members, articles }, null, 0)}\n`, 'utf8');
  console.log(`\nWrote ${OUT}`);
}
