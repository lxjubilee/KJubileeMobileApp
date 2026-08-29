/**
 * Radio domain types.
 *
 * A KJubilee station is not an Icecast mount. It is a *published broadcast day*:
 * one JSON file per station per day listing which track covers which second.
 * The client resolves the clock against that file and seeks into the track that
 * is sounding right now. See `setup/station-guidelines.md` §2.5 in the
 * KJubilee.com repo — that document, not the Icecast-based product spec, is the
 * authority on how delivery works.
 */

/** A persona from the Inspire Family who fronts a station. */
export interface StationHost {
  id: string;
  name: string;
  /** One-line editorial description of the persona's lane. */
  focus: string;
}

/** A tunable station on the HM band. Mirrors the web catalog's shape. */
export interface RadioStation {
  slug: string;
  /** HM-band dial number as published, e.g. "388.70". Kept a string so the
   *  trailing zero survives — it is a dial reading, not a quantity. */
  hm: string;
  name: string;
  format: string;
  description: string;
  /**
   * Tenant id addressing the station's folder on the CDN, e.g. "HM388.70-EN".
   * Null for a station that has been announced but has no folder yet — which is
   * exactly the set `live: false` describes.
   */
  tenant: string | null;
  lang: string;
  flag: string;
  pill: string;
  tracks: number;
  /**
   * The hero's blue strapline, pre-composed by the web catalog — e.g.
   * "Angel Songs · 1,749 tracks · Genesis to Revelation". Ported verbatim from
   * `stations-data.js` (`listeners`) rather than assembled here, because the
   * separators and what each station chooses to mention vary per row.
   */
  listeners?: string;
  /** Audience figure as published, e.g. "480M" — or "Featured" for the flagship. */
  reach?: string;
  /** Two-stop colour pair the web uses for station art; drives the tile wash here. */
  gradient: [string, string];
  host: StationHost | null;
  /**
   * Whether the station has a published broadcast day and can be tuned.
   * Most of the 105-station network is announced but not yet on air; Home shows
   * those as "coming soon" and the Dial leaves them off the band entirely.
   */
  live: boolean;
}

/** One row of station tiles on Home. An empty title means the section names it. */
export interface StationShelf {
  title: string;
  /** Slugs, in the order the site lists them. */
  stations: string[];
}

/** A Home grouping — "Christian Music", "Family Friendly", "International". */
export interface StationSection {
  id: string;
  label: string;
  shelves: StationShelf[];
}

/** One programmed slot in a broadcast day. Field names are the file's own. */
export interface DayEntry {
  /** Seconds from the start of the broadcast day. */
  t: number;
  /** Duration in seconds. */
  d: number;
  /** Audio path, relative to `cdnBase` + `prefix`. */
  u: string;
  /** Title. */
  ti: string;
  /** Artist. */
  ar: string;
  /** Album. */
  al: string;
  id: string;
}

/** A published broadcast day. `schema` is "kj.tenant.day/1". */
export interface DayFile {
  schema: string;
  tenant: string;
  name: string;
  hm: string;
  lang: string;
  format: string;
  slug: string;
  /** Broadcast date, "YYYY-MM-DD". */
  date: string;
  /** IANA zone the broadcast day is anchored to, e.g. "America/Los_Angeles". */
  tz: string;
  /** Absolute UTC instant second 0 of this day maps to. */
  startsAt: string;
  /** Length of the day in seconds (86400, or 82800/90000 across a DST shift). */
  seconds: number;
  cdnBase: string;
  prefix: string;
  poolTracks: number;
  /** Changes when the day is regenerated; used to detect a republish mid-listen. */
  rev: string;
  entries: DayEntry[];
}

/** Where the clock says we are inside a day file. */
export interface Resolved {
  entry: DayEntry;
  index: number;
  /** Seconds into `entry` that the broadcast is currently at. */
  into: number;
}

/** What the dial and any future footer player render. */
export interface RadioState {
  /** Station currently tuned, or null before the first tune. */
  slug: string | null;
  playing: boolean;
  /** True while fetching a day file or buffering into a track. */
  loading: boolean;
  /** Current broadcast track, once resolved. */
  track: { title: string; artist: string; album: string } | null;
  /** Set when the station cannot play (missing day file, network, empty day). */
  error: string | null;
}
