import { logger } from '@/utils/logger';
import type { DayFile, Resolved } from './types';

/**
 * Day-file fetching, clock discipline, and position resolution.
 *
 * This module owns rules 1 and 2 of `station-guidelines.md` §2.5.4:
 *
 *   1. Never trust the device clock. Phone clocks drift and are sometimes
 *      flatly wrong; a listener whose clock is two minutes fast would be in the
 *      wrong song entirely. The `Date` header on the day-file response is the
 *      authority, and its offset is applied to every later calculation.
 *   2. Re-derive position, never advance it. There is deliberately no "next
 *      track" function here — `resolve()` answers "what should be sounding at
 *      this instant" and callers ask it again rather than stepping forward.
 *      Error therefore cannot accumulate over a long session, and an app coming
 *      back from the background rejoins the live broadcast instead of resuming
 *      where it fell asleep.
 */

const CDN_BASE = 'https://cdn.kjubilee.com';

/** The zone every broadcast day is cut against, matching the web player. */
const BROADCAST_TZ = 'America/Los_Angeles';

// ---- clock ---------------------------------------------------------------

/** serverNow - deviceNow, in ms. Zero until the first day file has been read. */
let clockOffset = 0;
let clockSynced = false;

/** The broadcast clock. Every scheduling decision must read this, not Date.now(). */
export function now(): number {
  return Date.now() + clockOffset;
}

export function isClockSynced(): boolean {
  return clockSynced;
}

/**
 * Adopt the origin's clock from a response's `Date` header.
 *
 * `Date` has one-second resolution, so this can be off by up to a second — which
 * is far inside the tolerance of "which of these 4-minute tracks is playing, and
 * roughly where". What it removes is the failure that matters: a device clock
 * that is minutes or hours out.
 */
function syncClockFrom(res: Response): void {
  const header = res.headers.get('date');
  if (!header) return;
  const serverMs = Date.parse(header);
  if (!Number.isFinite(serverMs)) return;
  clockOffset = serverMs - Date.now();
  clockSynced = true;
  if (Math.abs(clockOffset) > 30_000) {
    logger.warn(`[radio] device clock is off by ${Math.round(clockOffset / 1000)}s — corrected`);
  }
}

// ---- day addressing ------------------------------------------------------

/**
 * The broadcast date stamp (YYYYMMDD) for an instant.
 *
 * Hermes ships Intl but its `timeZone` support has been uneven across versions,
 * so a failure falls back to a fixed -8 rather than throwing. The fallback can
 * be wrong by a day near midnight during DST — which is exactly why `fetchDay`
 * verifies the file it got actually covers `now()` and steps to the neighbour
 * if it does not. The stamp only has to be close; the file itself is the truth.
 */
function broadcastStamp(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BROADCAST_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date(ms))
      .replace(/-/g, '');
  } catch {
    return new Date(ms - 8 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '');
  }
}

function shiftStamp(stamp: string, days: number): string {
  const y = Number(stamp.slice(0, 4));
  const m = Number(stamp.slice(4, 6));
  const d = Number(stamp.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * A tenant's day-file URL. The filename drops the tenant's dashes but keeps its
 * dots: `HM388.70-EN` → `HM388.70EN-20260825.json`.
 */
export function dayUrl(tenant: string, stamp: string): string {
  return `${CDN_BASE}/radio/${tenant}/delivery/${tenant.replace(/-/g, '')}-${stamp}.json`;
}

/** Absolute URL of an entry's audio: cdnBase + prefix + the entry's own path. */
export function trackUrl(doc: DayFile, path: string): string {
  const base = (doc.cdnBase || CDN_BASE).replace(/\/+$/, '');
  const prefix = (doc.prefix || '').replace(/^\/+/, '');
  return `${base}/${prefix}${String(path).replace(/^\/+/, '')}`;
}

// ---- fetching ------------------------------------------------------------

export class MissingDayError extends Error {
  constructor(public readonly tenant: string, public readonly stamp: string) {
    // Rule 4: a 404 is reported, not swallowed. The generator runs days ahead,
    // so a missing file means it has been failing long enough to burn the
    // buffer — and the listener's app is the first thing positioned to notice.
    super(`No published day for ${tenant} on ${stamp}`);
    this.name = 'MissingDayError';
  }
}

function covers(doc: DayFile, ms: number): boolean {
  const start = Date.parse(doc.startsAt);
  return Number.isFinite(start) && ms >= start && ms < start + doc.seconds * 1000;
}

async function get(tenant: string, stamp: string): Promise<DayFile> {
  const res = await fetch(dayUrl(tenant, stamp), { cache: 'no-cache' });
  // Sync before the body check: even a 404 carries a usable Date header, and a
  // corrected clock is what lets the retry below ask for the right day.
  syncClockFrom(res);
  if (res.status === 404) throw new MissingDayError(tenant, stamp);
  if (!res.ok) throw new Error(`day file HTTP ${res.status}`);
  const doc = (await res.json()) as DayFile;
  if (!doc?.entries?.length) throw new Error(`empty day for ${tenant} on ${stamp}`);
  return doc;
}

/**
 * The day file covering this instant for a tenant.
 *
 * Fetches the day the stamp suggests, then checks that it really covers `now()`.
 * Because the first fetch also corrects the clock, a device that was hours out
 * lands on the wrong file exactly once and is then walked to the right one.
 */
export async function fetchDay(tenant: string): Promise<DayFile> {
  const doc = await get(tenant, broadcastStamp(now()));
  if (covers(doc, now())) return doc;

  const start = Date.parse(doc.startsAt);
  const step = now() < start ? -1 : 1;
  const neighbour = shiftStamp(doc.date.replace(/-/g, ''), step);
  logger.debug(`[radio] ${doc.date} does not cover now; stepping to ${neighbour}`);
  return get(tenant, neighbour);
}

// ---- resolution ----------------------------------------------------------

/**
 * What should be sounding at `ms`, or null if the instant falls outside the day.
 *
 * Binary search: entries are contiguous and ordered, and a day can carry several
 * hundred of them.
 */
export function resolve(doc: DayFile, ms: number): Resolved | null {
  const start = Date.parse(doc.startsAt);
  if (!Number.isFinite(start)) return null;
  const sec = Math.floor((ms - start) / 1000);
  if (sec < 0 || sec >= doc.seconds) return null;

  let lo = 0;
  let hi = doc.entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const e = doc.entries[mid];
    if (sec < e.t) hi = mid - 1;
    else if (sec >= e.t + e.d) lo = mid + 1;
    else return { entry: e, index: mid, into: sec - e.t };
  }
  // A gap between entries is not an error — the day simply has nothing there.
  return null;
}

/** Milliseconds until the current entry ends, for scheduling the next re-derive. */
export function msUntilEnd(r: Resolved): number {
  return Math.max(0, (r.entry.d - r.into) * 1000);
}
