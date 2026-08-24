import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/constants';
import { logger } from '@/utils';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { CatalogManifest } from './manifestTypes';

/**
 * Fetches and caches the public catalog manifest from the CDN — the source of
 * truth backing `ManifestDataSource`.
 *
 * Strategy is **stale-while-revalidate**: a persisted snapshot is served
 * immediately on cold start (so lists paint without waiting on the network),
 * while a fresh copy is fetched in the background. If the fresh copy differs
 * (`generated` changed) it replaces the cache and subscribers are notified so
 * the UI can rebuild. Only the first-ever launch (no snapshot) blocks on the
 * network.
 *
 * A snapshot is also replaced when it was fetched from a different manifest URL
 * than the one configured now, regardless of `generated`. Hosts can publish the
 * same catalog build under different path conventions, so keeping a snapshot
 * across a `cdnBaseUrl` change would resolve every cover and track against paths
 * the new host does not have.
 *
 * The snapshot is stored CHUNKED because the stringified manifest (~2 MB) sits
 * at the edge of Android's AsyncStorage CursorWindow read limit; ~512 KB chunks
 * read back reliably. All storage access is best-effort — any failure degrades
 * to a plain network fetch.
 */
// CATALOG_BASE_URL, not CDN_BASE_URL: the manifest can be served from a local
// web server for testing while audio and covers still come from the CDN (the
// only host that has them). Defaults to the CDN when no override is set.
const MANIFEST_URL = `${ENV.CATALOG_BASE_URL.replace(/\/+$/, '')}/music/catalog-manifest.json`;
const CHUNK_SIZE = 512 * 1024; // characters

let current: CatalogManifest | null = null;
let initialLoad: Promise<CatalogManifest> | null = null;
let revalidated = false;
/**
 * Set when the cached snapshot came from a DIFFERENT manifest URL than the one
 * configured now (or from a build that predates source tracking). Such a cache
 * must be replaced even if `generated` is unchanged — see `revalidate`.
 */
let sourceChanged = false;
const subscribers = new Set<() => void>();

/** Subscribe to background catalog refreshes (new `generated`). Returns an unsubscribe fn. */
export function onCatalogUpdated(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function getManifest(): Promise<CatalogManifest> {
  if (current) return Promise.resolve(current);
  if (!initialLoad) {
    initialLoad = loadInitial().catch((err) => {
      initialLoad = null; // allow retry
      throw err;
    });
  }
  return initialLoad;
}

async function loadInitial(): Promise<CatalogManifest> {
  const cached = await readChunkedCache();
  if (cached) {
    current = cached;
    void revalidate(); // background; don't block first paint
    return cached;
  }
  // First-ever launch: must wait on the network, then seed the cache.
  const fresh = await fetchManifest();
  current = fresh;
  revalidated = true; // already freshest; no background pass needed
  void writeChunkedCache(fresh);
  return fresh;
}

async function revalidate(): Promise<void> {
  if (revalidated) return;
  revalidated = true;
  try {
    const fresh = await fetchManifest();
    // `generated` alone is not enough: two hosts can publish the same catalog
    // build under different path conventions, so a host swap must replace the
    // cache even when the timestamp matches.
    if (sourceChanged || !current || fresh.generated !== current.generated) {
      sourceChanged = false;
      current = fresh;
      void writeChunkedCache(fresh);
      subscribers.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          logger.warn('onCatalogUpdated subscriber threw', e);
        }
      });
    }
  } catch (err) {
    logger.warn('catalog revalidation failed; keeping cached snapshot', err);
  }
}

async function fetchManifest(): Promise<CatalogManifest> {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`catalog manifest HTTP ${res.status}`);
  return (await res.json()) as CatalogManifest;
}

interface ChunkMeta {
  count: number;
  generated: string;
  /**
   * The manifest URL this snapshot was fetched from. Absent on caches written by
   * builds before source tracking existed, which are treated as changed so they
   * get replaced once on upgrade.
   */
  source?: string;
}

async function readChunkedCache(): Promise<CatalogManifest | null> {
  try {
    const meta = await storage.getItem<ChunkMeta>(STORAGE_KEYS.CATALOG_MANIFEST_META);
    if (!meta?.count) return null;
    // Serve the snapshot either way (offline upgrades keep working), but flag a
    // host change so `revalidate` swaps it in unconditionally.
    if (meta.source !== MANIFEST_URL) sourceChanged = true;
    const parts: string[] = [];
    for (let i = 0; i < meta.count; i += 1) {
      const part = await AsyncStorage.getItem(`${STORAGE_KEYS.CATALOG_MANIFEST_CHUNK}${i}`);
      if (part == null) return null; // incomplete cache — ignore
      parts.push(part);
    }
    return JSON.parse(parts.join('')) as CatalogManifest;
  } catch (err) {
    logger.warn('catalog cache read failed', err);
    return null;
  }
}

async function writeChunkedCache(manifest: CatalogManifest): Promise<void> {
  try {
    const str = JSON.stringify(manifest);
    const count = Math.ceil(str.length / CHUNK_SIZE);
    for (let i = 0; i < count; i += 1) {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.CATALOG_MANIFEST_CHUNK}${i}`,
        str.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    // Write meta last so a partially-written cache is never considered valid.
    await storage.setItem<ChunkMeta>(STORAGE_KEYS.CATALOG_MANIFEST_META, {
      count,
      generated: manifest.generated,
      source: MANIFEST_URL,
    });
  } catch (err) {
    logger.warn('catalog cache write failed', err);
  }
}

/** Test/diagnostic helper: drop in-memory state so the next call reloads. */
export function resetManifestCache(): void {
  current = null;
  initialLoad = null;
  revalidated = false;
  sourceChanged = false;
}
