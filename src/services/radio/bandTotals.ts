import totals from '@/assets/radio/totals.json';
import { getStations } from './stationCatalog';

/**
 * The band's own numbers, as the site prints them in the dial's top corners.
 *
 * All of them are generated rather than typed — see `scripts/build-totals.mjs`
 * for where each one comes from and how to refresh it.
 */
export interface BandTotals {
  /** Every device on earth. Already drifted for today — see `dailyDrift`. */
  potentialOutreach: number;
  /** Transmitters, counted from the same file the map draws. */
  towers: number;
  /** Distinct SongIDs in the catalogue. */
  songs: number;
  /** Frequencies this app will actually stop on. */
  stationsOnAir: number;
}

/** Half a million either way, matching the web's DRIFT_MAX. */
const DRIFT_MAX = 500000;

/**
 * Move the outreach figure by up to ±500,000, once a day.
 *
 * WHY IT MOVES AT ALL. The ceiling is a real population — devices are bought
 * and lost, people are born and people die — and a number describing that which
 * is frozen to the digit for months is quietly saying the opposite of what it
 * means.
 *
 * WHY IT IS SEEDED FROM THE DATE AND NOT `Math.random()`. This matters more
 * than it looks. A fresh random number per render would change while someone
 * sat there, disagree between two devices, and disagree between two people
 * looking at the same figure — which does not read as a living number, it reads
 * as a fabricated one. Seeding from the UTC date means every listener on earth
 * sees the SAME number all day, the web included, and a different one tomorrow.
 *
 * ANCHORED, NOT ACCUMULATING. The offset is applied to the researched base
 * every day rather than to yesterday's result, so it cannot random-walk away
 * from the figure `build-totals.mjs` last pulled.
 *
 * Ported from the web's `public/js/pages/player.js` — the same xorshift32 on
 * the same day key, so the two agree to the digit.
 */
export function dailyDrift(base: number, now: Date = new Date()): number {
  if (!Number.isFinite(base)) return base;
  const key =
    now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  // `>>> 0` after every step: JS bitwise ops yield signed 32-bit, and the web's
  // version relies on the unsigned value.
  let h = (key ^ 0x9e3779b9) >>> 0;
  h = (h ^ (h << 13)) >>> 0;
  h = (h ^ (h >>> 17)) >>> 0;
  h = (h ^ (h << 5)) >>> 0;
  const magnitude = (h % DRIFT_MAX) + 1; // 1..500,000 — never zero
  const sign = (h >>> 21) & 1 ? 1 : -1;
  return base + sign * magnitude;
}

/**
 * Stations on air is COUNTED FROM THE DIAL, not read from the totals file.
 *
 * The site takes the same view, and learned it the hard way: its figure came
 * from the research file and sat at 41 while the dial carried 43, because a
 * station went on air and that file was not regenerated. A derived count cannot
 * drift from the thing it describes — if this app can only tune seventeen
 * frequencies, seventeen is the honest number to print, however many the
 * network is broadcasting.
 */
export function getBandTotals(now?: Date): BandTotals {
  return {
    potentialOutreach: dailyDrift(totals.worldDevice, now),
    towers: totals.towers,
    songs: totals.songsInLedger,
    stationsOnAir: getStations().length,
  };
}

/** Printed in full — 2,000,000 rather than 2M — because the point is the size. */
export function groupThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
