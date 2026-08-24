#!/usr/bin/env node
/**
 * Locale key-parity guard.
 *
 * `en.json` is the source of truth and `i18n.ts` sets `fallbackLng: 'en'`, so a
 * missing key renders English rather than blank — partial translations are safe
 * to ship. What is NOT safe is losing track of which keys are actually
 * translated, across 40 hand-maintained files.
 *
 * So this reports rather than blocks. Two categories:
 *   missing — in en.json, absent here. Expected; falls back to English.
 *   extra   — here but not in en.json. A smell: a typo, or a key renamed in
 *             en.json and left stale everywhere else.
 *
 * Usage:  node scripts/check-locales.mjs [--strict] [--strict-missing]
 *   --strict          fail on extra keys
 *   --strict-missing  fail on missing keys too (once the translations land)
 *
 * Known pre-existing extras (unrelated to any one feature): `tabs.library`,
 * `artist.popular`, `artist.discography` survive in all 40 locales from an old
 * rename. They are unreachable — nothing in src/ reads them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = join(root, 'src', 'localization', 'locales');
const strictExtra = process.argv.includes('--strict');
const strictMissing = process.argv.includes('--strict-missing');

/** Flatten to dotted leaf paths, so nesting differences surface as key diffs. */
const leaves = (obj, prefix = '', out = new Set()) => {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, path, out);
    else out.add(path);
  }
  return out;
};

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));

const en = leaves(read(join(root, 'src', 'localization', 'en.json')));
const files = readdirSync(localesDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

let extraTotal = 0;
let missingTotal = 0;
const rows = [];

for (const file of files) {
  const keys = leaves(read(join(localesDir, file)));
  const missing = [...en].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !en.has(k));
  extraTotal += extra.length;
  missingTotal += missing.length;
  if (missing.length || extra.length) {
    rows.push({ file, missing, extra });
  }
}

const pct = (n) => `${Math.round((1 - n / en.size) * 100)}%`;

console.log(`en.json: ${en.size} keys across ${files.length} locales\n`);
for (const { file, missing, extra } of rows) {
  console.log(`${file.padEnd(12)} ${pct(missing.length).padStart(4)} translated` +
    (missing.length ? `  (${missing.length} missing)` : '') +
    (extra.length ? `  ⚠ ${extra.length} EXTRA` : ''));
  if (strictExtra || strictMissing) {
    for (const k of extra) console.log(`               extra: ${k}`);
    for (const k of missing.slice(0, 10)) console.log(`               missing: ${k}`);
  }
}

console.log(
  `\n${missingTotal} untranslated key(s) fall back to English; ${extraTotal} stale key(s) not in en.json.`,
);
if (strictExtra && extraTotal) {
  console.error(`✗ ${extraTotal} stale key(s) (--strict).`);
  process.exit(1);
}
if (strictMissing && missingTotal) {
  console.error(`✗ ${missingTotal} missing key(s) (--strict-missing).`);
  process.exit(1);
}
