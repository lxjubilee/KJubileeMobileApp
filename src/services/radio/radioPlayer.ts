import { AppState, type AppStateStatus } from 'react-native';
import { TrackPlayer, Event, isExpoGo } from '@/services/music';
import { logger } from '@/utils/logger';
import { fetchDay, resolve, trackUrl, msUntilEnd, now, MissingDayError } from './dayFile';
import { getStationBySlug } from './stationCatalog';
import type { DayFile, RadioState, Resolved } from './types';

/**
 * The radio engine.
 *
 * Tuning a station means: fetch its published day, ask the clock what should be
 * sounding, load that track, and seek into it. There is no stream connection
 * anywhere in here — see `dayFile.ts` for why, and for rules 1 and 2. This file
 * owns the other two:
 *
 *   3. Preload the next entry. Entries are contiguous, so the entry after the
 *      current one is genuinely what plays next — it is queued behind the
 *      current track, which both buffers it and lets track-player cross the
 *      boundary itself. A gap at a boundary reads instantly as "playlist"
 *      rather than "station".
 *   4. Report a missing day rather than going quiet.
 *
 * Correctness comes from re-deriving, not from the queue: a periodic tick and
 * every return to the foreground re-ask the clock and rebuild if the answer has
 * moved. The queue is an optimisation over that, never the source of truth.
 *
 * Radio and the music player share one track-player instance, so tuning resets
 * the queue. Whichever was playing stops — which is the single-stream rule the
 * product spec asks for, falling out of the shared engine rather than needing
 * enforcement.
 */

/** How often to re-ask the clock while playing. Cheap, and bounds any drift. */
const REDERIVE_MS = 20_000;

/**
 * How long a tune may sit in `loading` before it is declared failed.
 *
 * A backstop, not a policy: every path that starts a tune is meant to end it,
 * and the timer should normally be cleared long before it fires. It exists
 * because a spinner that never resolves is the worst failure this engine can
 * produce — the listener is told something is about to happen, forever, with no
 * error to act on and no way back. Negative testing found exactly that
 * (NEG-101/102/103), so the engine now guarantees a terminal state.
 */
const TUNE_TIMEOUT_MS = 25_000;

// ---- state ---------------------------------------------------------------

let state: RadioState = {
  slug: null,
  playing: false,
  loading: false,
  track: null,
  error: null,
};

const listeners = new Set<() => void>();

/** Fires only if a tune neither succeeds nor fails; see TUNE_TIMEOUT_MS. */
let tuneWatchdog: ReturnType<typeof setTimeout> | null = null;

function clearWatchdog(): void {
  if (tuneWatchdog) {
    clearTimeout(tuneWatchdog);
    tuneWatchdog = null;
  }
}

function emit(next: Partial<RadioState>): void {
  // Any emit that settles `loading` is the end of a tune, whichever path got
  // there — success, failure, an empty schedule, or a pause that cancelled it.
  // Clearing here rather than at each call site means a future branch cannot
  // forget to, which is the mistake that produced the stuck spinner.
  if (next.loading === false) clearWatchdog();
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): RadioState {
  return state;
}

// ---- engine internals ----------------------------------------------------

let doc: DayFile | null = null;
let docTenant: string | null = null;
/** Index of the entry currently loaded into track-player. */
let loadedIndex = -1;
let tickTimer: ReturnType<typeof setTimeout> | null = null;
/** Guards against an out-of-order tune: only the newest one may touch the player. */
let generation = 0;

function clearTick(): void {
  if (tickTimer) {
    clearTimeout(tickTimer);
    tickTimer = null;
  }
}

/**
 * Schedule the next re-derive: whichever comes first, the periodic tick or the
 * end of the current entry. Landing on the boundary means the correction happens
 * exactly when the queue would otherwise be free to drift.
 */
function scheduleTick(r: Resolved): void {
  clearTick();
  const delay = Math.min(REDERIVE_MS, msUntilEnd(r) + 250);
  tickTimer = setTimeout(rederive, Math.max(1000, delay));
}

function entryToTrack(d: DayFile, index: number) {
  const e = d.entries[index];
  return {
    id: `${d.tenant}:${d.date}:${e.t}`,
    url: trackUrl(d, e.u),
    title: e.ti,
    artist: e.ar,
    album: e.al,
  };
}

/**
 * Load the resolved entry and seek to the live position, queueing the following
 * entry behind it (rule 3).
 */
async function load(d: DayFile, r: Resolved, gen: number): Promise<void> {
  if (isExpoGo) {
    // No native audio here. Metadata still resolves, so the dial shows what is
    // on air; it just cannot sound. Surfaced rather than failing silently.
    emit({
      loading: false,
      playing: false,
      track: { title: r.entry.ti, artist: r.entry.ar, album: r.entry.al },
      error: 'Audio needs a dev build — Expo Go has no native player.',
    });
    return;
  }

  await TrackPlayer.reset();
  if (gen !== generation) return;

  await TrackPlayer.add([entryToTrack(d, r.index)]);
  await TrackPlayer.seekTo(r.into);
  if (gen !== generation) return;

  await TrackPlayer.play();
  if (gen !== generation) return;

  loadedIndex = r.index;
  emit({
    loading: false,
    playing: true,
    error: null,
    track: { title: r.entry.ti, artist: r.entry.ar, album: r.entry.al },
  });

  // Queued after play() so the current track owns the bandwidth it needs to
  // start; the next one has a whole track's duration to buffer.
  if (d.entries[r.index + 1]) {
    try {
      await TrackPlayer.add([entryToTrack(d, r.index + 1)]);
    } catch (e) {
      logger.debug('[radio] preload failed (non-fatal)', e);
    }
  }
  scheduleTick(r);
}

/**
 * Re-ask the clock and correct if the answer moved.
 *
 * If the broadcast is still inside the entry track-player is on, this leaves it
 * alone — reloading mid-track to "fix" a position that is already right would
 * be audible for no reason. It rebuilds only when the entry itself has changed.
 */
async function rederive(): Promise<void> {
  if (!doc || !state.slug) return;
  const gen = generation;

  let r = resolve(doc, now());
  if (!r) {
    // Past the end of this published day (or in a gap). Fetch the day that
    // covers now and try once more; a real gap simply stops.
    try {
      const fresh = await fetchDay(docTenant!);
      if (gen !== generation) return;
      doc = fresh;
      r = resolve(fresh, now());
    } catch (e) {
      return fail(e);
    }
    if (!r) {
      clearTick();
      emit({ playing: false, error: 'Nothing scheduled right now.' });
      return;
    }
  }

  if (r.index === loadedIndex) {
    scheduleTick(r);
    return;
  }

  // Track-player advancing into the queued next entry is the common case and is
  // already correct — adopt it and keep the queue topped up rather than
  // reloading audio that is sounding properly.
  if (r.index === loadedIndex + 1) {
    loadedIndex = r.index;
    emit({ track: { title: r.entry.ti, artist: r.entry.ar, album: r.entry.al } });
    if (doc.entries[r.index + 1] && !isExpoGo) {
      try {
        await TrackPlayer.add([entryToTrack(doc, r.index + 1)]);
      } catch (e) {
        logger.debug('[radio] preload failed (non-fatal)', e);
      }
    }
    scheduleTick(r);
    return;
  }

  // Anything else — a long background, a stall, a clock correction — is a real
  // desync. Rejoin the live position.
  logger.debug(`[radio] desync: at ${loadedIndex}, should be ${r.index} — rejoining`);
  try {
    await load(doc, r, gen);
  } catch (e) {
    fail(e);
  }
}

function fail(e: unknown): void {
  clearTick();
  const message =
    e instanceof MissingDayError
      ? 'This station has no programme published for today.'
      : 'Could not reach the station.';
  logger.warn('[radio]', message, e);
  emit({ loading: false, playing: false, error: message });
}

// ---- public API ----------------------------------------------------------

/** Tune a station and start it at the live position. */
export async function tune(slug: string): Promise<void> {
  const station = getStationBySlug(slug);
  // A station with no tenant has no published day to resolve against — it is
  // announced, not on air. Home offers those as "coming soon" rather than as
  // something to tap, but guard here so no caller can hand one to the engine.
  if (!station?.tenant) return;

  const gen = ++generation;
  clearTick();
  loadedIndex = -1;
  emit({ slug, loading: true, playing: false, track: null, error: null });

  // Armed after the emit above; any settling emit disarms it, and a newer tune
  // replaces it, so at most one is ever pending.
  //
  // DELIBERATELY NOT SCOPED TO `gen`. The first version of this fired only when
  // `gen === generation`, which made it useless for the one case it exists for:
  // the state is stranded precisely BECAUSE something bumped the generation and
  // then failed to settle, so the guard was false exactly when it was needed and
  // the dial still hung on TUNING. If this timer is still pending, no settling
  // emit has happened since the tune it belongs to — so a `loading` that is
  // still true is stale whoever owns the current generation.
  clearWatchdog();
  tuneWatchdog = setTimeout(() => {
    if (state.loading) {
      fail(new Error(`Tuning ${slug} did not settle within ${TUNE_TIMEOUT_MS}ms`));
    }
  }, TUNE_TIMEOUT_MS);

  try {
    // Re-fetch even for the same tenant: a day republished mid-listen (`rev`
    // changes) would otherwise keep playing yesterday's idea of the programme.
    const fresh = await fetchDay(station.tenant);
    if (gen !== generation) return;
    doc = fresh;
    docTenant = station.tenant;

    const r = resolve(fresh, now());
    if (!r) {
      emit({ loading: false, error: 'Nothing scheduled right now.' });
      return;
    }
    await load(fresh, r, gen);
  } catch (e) {
    if (gen === generation) fail(e);
  }
}

export async function pause(): Promise<void> {
  clearTick();
  generation++; // cancel any tune still in flight
  try {
    if (!isExpoGo) await TrackPlayer.pause();
  } finally {
    // In `finally`, and `loading: false` is not cosmetic. Bumping the generation
    // above makes every in-flight tune return early at its next guard WITHOUT
    // emitting, so this pause is the only thing left that can end one. If
    // TrackPlayer.pause() rejects — which it can under a burst of taps — an emit
    // after the await would never run and the dial would sit on "TUNING"
    // forever, which is exactly what negative testing found.
    emit({ loading: false, playing: false });
  }
}

/**
 * Play/pause for the tuned station, or tune a different one.
 *
 * Resuming is a fresh `tune`, never a `TrackPlayer.play()`. A live broadcast
 * moved on while it was paused, so picking up where it stopped would put this
 * listener behind everyone else — the whole point of the model is that it does
 * not do that.
 */
export async function toggle(slug: string): Promise<void> {
  if (state.slug === slug && state.playing) {
    await pause();
    return;
  }
  await tune(slug);
}

/**
 * Wire the engine to the app lifecycle. Called once at startup.
 *
 * Coming back to the foreground re-derives immediately: a phone that slept for
 * an hour must rejoin the live broadcast, not resume an hour-old track.
 */
export function initRadio(): () => void {
  const onAppState = (next: AppStateStatus) => {
    if (next === 'active' && state.playing) void rederive();
  };
  const sub = AppState.addEventListener('change', onAppState);

  let queueSub: { remove: () => void } | null = null;
  if (!isExpoGo) {
    // Track-player crossing into the queued entry is the boundary the periodic
    // tick would otherwise wait up to 20s to notice; adopting it here keeps the
    // displayed track honest the moment the audio changes.
    queueSub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
      if (state.playing) void rederive();
    });
  }

  return () => {
    sub.remove();
    queueSub?.remove();
    clearTick();
  };
}
