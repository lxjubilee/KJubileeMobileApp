import { ENV } from '@/constants';
import { logger } from '@/utils';
import { storage, STORAGE_KEYS } from '@/services/storage';
import type { MobileConfig } from './types';

/**
 * Fetches and caches the admin-managed mobile app config (`/api/mobile/config`)
 * — the dynamic-content curation (pages, per-page hero, sections, Music Type
 * genres). The app overlays this on its catalog (see applyMobileConfig). Host is
 * `ENV.MOBILE_CONFIG_BASE` (the auth host by default; overridable to a local API
 * via `extra.mobileConfigBaseUrl` for testing) — this is the ONLY endpoint that
 * override affects.
 *
 * Strategy mirrors the catalog manifest: **stale-while-revalidate**. A persisted
 * snapshot is served immediately; a fresh copy is fetched in the background and,
 * if it differs, replaces the cache and notifies subscribers so Home rebuilds.
 * The payload is small (a few KB), so it's stored as a single JSON entry — no
 * chunking. Every step FAILS OPEN (resolves `null`) so a missing/slow endpoint
 * never blocks Home; the overlay then falls back to the manifest-derived feed.
 */
const CONFIG_URL = `${ENV.MOBILE_CONFIG_BASE.replace(/\/+$/, '')}/api/mobile/config`;
const FETCH_TIMEOUT_MS = 6000;

let current: MobileConfig | null = null;
let initialLoad: Promise<MobileConfig | null> | null = null;
let revalidated = false;
const subscribers = new Set<() => void>();

/** Subscribe to background config refreshes (content changed). Returns an unsubscribe fn. */
export function onMobileConfigUpdated(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** Latest mobile config, or null when unavailable (→ caller falls back). Never rejects. */
export function getMobileConfig(): Promise<MobileConfig | null> {
  if (current) return Promise.resolve(current);
  if (!initialLoad) {
    initialLoad = loadInitial().catch(() => {
      initialLoad = null; // allow retry
      return null;
    });
  }
  return initialLoad;
}

async function loadInitial(): Promise<MobileConfig | null> {
  const cached = await readCache();
  if (cached) {
    current = cached;
    void revalidate(); // background; don't block first paint
    return cached;
  }
  const fresh = await fetchConfig();
  if (fresh) {
    current = fresh;
    revalidated = true;
    void storage.setItem(STORAGE_KEYS.MOBILE_CONFIG, fresh);
  }
  return fresh;
}

async function revalidate(): Promise<void> {
  if (revalidated) return;
  revalidated = true;
  const fresh = await fetchConfig();
  // Deep compare (small payload) so ANY admin edit is detected — not just a
  // `generated` bump (admin edits don't change the catalog manifest timestamp).
  if (fresh && JSON.stringify(fresh) !== JSON.stringify(current)) {
    current = fresh;
    void storage.setItem(STORAGE_KEYS.MOBILE_CONFIG, fresh);
    subscribers.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        logger.warn('onMobileConfigUpdated subscriber threw', e);
      }
    });
  }
}

async function fetchConfig(): Promise<MobileConfig | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(CONFIG_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`mobile config HTTP ${res.status}`);
    return (await res.json()) as MobileConfig;
  } catch (err) {
    logger.warn('mobile config fetch failed; using fallback', err);
    return null;
  }
}

async function readCache(): Promise<MobileConfig | null> {
  try {
    return (await storage.getItem<MobileConfig>(STORAGE_KEYS.MOBILE_CONFIG)) ?? null;
  } catch {
    return null;
  }
}

/** Test/diagnostic helper: drop in-memory state so the next call reloads. */
export function resetMobileConfigCache(): void {
  current = null;
  initialLoad = null;
  revalidated = false;
}
