import { fetchDay, resolve, now } from './dayFile';
import type { DayFile } from './types';

/**
 * The programme guide.
 *
 * A day file carries the WHOLE broadcast day — every entry, its start second
 * and its duration — so "what's on next" and "what's on at eight" need no API
 * and no new data. They are simply the entries after the one the clock resolves
 * to. This is the thing the day-file model gives that a stream cannot: a live
 * stream can only tell you what is sounding now, because nothing downstream
 * knows what comes after it.
 *
 * Works for any station, not just the tuned one — the detail screen needs a
 * schedule for a station the listener has not started yet.
 */

export interface ScheduleEntry {
  /** Stable within a day: tenant + the entry's own second. */
  key: string;
  title: string;
  artist: string;
  album: string;
  /** Absolute instant this entry starts, in ms. */
  startsAt: number;
  durationSec: number;
  /** True for the entry sounding right now. */
  current: boolean;
  /** Seconds already elapsed, for the current entry only. */
  into: number;
}

export interface Schedule {
  station: { name: string; hm: string };
  entries: ScheduleEntry[];
}

/**
 * Day files are static for the whole broadcast day, so one fetch per tenant
 * serves every look at its schedule. Position is still re-derived from the
 * clock on every call — the document is cached, never the answer.
 */
const cache = new Map<string, { doc: DayFile; at: number }>();
/** Re-fetch after this, so a mid-day republish (`rev` change) is picked up. */
const TTL_MS = 15 * 60_000;

async function dayFor(tenant: string): Promise<DayFile> {
  const hit = cache.get(tenant);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.doc;
  const doc = await fetchDay(tenant);
  cache.set(tenant, { doc, at: Date.now() });
  return doc;
}

/** Drop a tenant's cached day (or all of them) — used when a day 404s. */
export function invalidateSchedule(tenant?: string): void {
  if (tenant) cache.delete(tenant);
  else cache.clear();
}

/**
 * What is on now and what follows, for one station.
 *
 * Returns the current entry first, then the next `count`. An entry that would
 * run past the end of the published day is simply absent — the next day's file
 * is a separate document, and stitching them is not worth a second fetch for a
 * list this short.
 */
export async function getSchedule(tenant: string, count = 12): Promise<Schedule | null> {
  const doc = await dayFor(tenant);
  const at = now();
  const r = resolve(doc, at);
  if (!r) return null;

  const dayStart = Date.parse(doc.startsAt);
  const entries: ScheduleEntry[] = [];

  for (let i = r.index; i < Math.min(r.index + count + 1, doc.entries.length); i++) {
    const e = doc.entries[i];
    entries.push({
      key: `${doc.tenant}:${e.t}`,
      title: e.ti,
      artist: e.ar,
      album: e.al,
      startsAt: dayStart + e.t * 1000,
      durationSec: e.d,
      current: i === r.index,
      into: i === r.index ? r.into : 0,
    });
  }

  return { station: { name: doc.name, hm: doc.hm }, entries };
}
