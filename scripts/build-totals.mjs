#!/usr/bin/env node
/**
 * Rebuild the band's own numbers — the figures the site prints in the dial's
 * top corners — from the site's published data.
 *
 * NONE OF THESE ARE TYPED BY HAND on the web, and none are invented here:
 *
 *   worldDevice    KJ_CIRCULATION.totals.worldDevice, computed by the site's
 *                  tools/build-circulation.js from data/circulation.json. The
 *                  researched ceiling; see docs/CIRCULATION-METHODOLOGY.md.
 *   towers         KJ_CIRCULATION.totals.towers, counted from hm-towers.json —
 *                  the same file the map draws, so the dial cannot claim a
 *                  transmitter the map does not show.
 *   songsInLedger  KJ_TOTALS.songsInLedger, the count of distinct SongIDs (one
 *                  per unique .mp3, voice scripts excluded — they carry no
 *                  SongID). Rewritten on every publish. Falls back to
 *                  KJ_CIRCULATION.totals.distinctSongs, which is the copy that
 *                  once sat frozen at 7,741 while the catalogue grew.
 *
 * STATIONS ON AIR IS DELIBERATELY NOT HERE. The site counts it from the dial's
 * own station list rather than from any file, because a figure that disagrees
 * with the number of frequencies the dial will actually stop on is worse than
 * no figure — theirs had stuck at 41 while the dial carried 43. The app derives
 * it the same way, from getStations().
 *
 *   node scripts/build-totals.mjs            # report only
 *   node scripts/build-totals.mjs --apply    # write totals.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CIRCULATION_URL = 'https://kjubilee.com/js/circulation-data.js';
const STATIONS_URL = 'https://kjubilee.com/js/stations-data.js';
const OUT = path.join(process.cwd(), 'src/assets/radio/totals.json');

const apply = process.argv.includes('--apply');

/** Pull one `window.KJ_X = <json>;` out of a generated file. */
function readGlobal(src, name) {
  const start = src.indexOf(`window.${name}`);
  if (start < 0) return null;
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
  return null;
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}

const circ = readGlobal(await get(CIRCULATION_URL), 'KJ_CIRCULATION');
const totals = readGlobal(await get(STATIONS_URL), 'KJ_TOTALS');

const t = (circ && circ.totals) || {};
const next = {
  worldDevice: t.worldDevice ?? t.deviceReachable ?? null,
  towers: t.towers ?? null,
  songsInLedger:
    totals && typeof totals.songsInLedger === 'number' && totals.songsInLedger > 0
      ? totals.songsInLedger
      : (t.distinctSongs ?? t.songs ?? null),
  generatedAt: (totals && totals.generatedAt) || null,
};

let current = null;
try {
  current = JSON.parse(await readFile(OUT, 'utf8'));
} catch {
  /* first run */
}

console.log(`source: ${CIRCULATION_URL}\n        ${STATIONS_URL}\n`);
for (const k of ['worldDevice', 'towers', 'songsInLedger', 'generatedAt']) {
  const was = current ? current[k] : undefined;
  const now = next[k];
  const mark = current && was !== now ? ' <-- changed' : '';
  console.log(`  ${k.padEnd(14)} ${String(was ?? '(none)').padEnd(14)} -> ${String(now)}${mark}`);
}

if (Object.entries(next).some(([k, v]) => k !== 'generatedAt' && v == null)) {
  console.error('\nRefusing to write: a figure came back empty.');
  process.exit(1);
}

if (!apply) {
  console.log('\nReport only. Re-run with --apply to write totals.json.');
} else {
  await writeFile(OUT, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${OUT}`);
}
