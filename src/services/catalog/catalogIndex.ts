import { getManifest } from './manifestClient';
import { buildCatalogIndex, CatalogIndex } from './manifestMappers';

/**
 * Module-level cache of the built catalog index, shared by every repository
 * (via ManifestDataSource). Keeping it here — rather than on a data-source
 * instance — lets a background manifest refresh swap it for the whole app at
 * once: call `invalidateCatalogIndex()` and the next `getCatalogIndex()` rebuilds
 * from the freshly-cached manifest.
 */
let indexPromise: Promise<CatalogIndex> | null = null;
let indexValue: CatalogIndex | null = null;

export function getCatalogIndex(): Promise<CatalogIndex> {
  if (!indexPromise) {
    indexPromise = getManifest()
      .then((manifest) => {
        const index = buildCatalogIndex(manifest);
        indexValue = index;
        return index;
      })
      .catch((err) => {
        indexPromise = null; // allow retry
        throw err;
      });
  }
  return indexPromise;
}

/**
 * Synchronous peek at the already-built index, or null if it hasn't loaded yet.
 * For consumers that run during render and can tolerate a null first pass — e.g.
 * artist visibility filtering, which needs each artist's album covers. Once the
 * catalog has loaded (a precondition for any artist to be on screen) this is set.
 */
export function peekCatalogIndex(): CatalogIndex | null {
  return indexValue;
}

/** Drop the built index so the next read rebuilds it (after a manifest refresh). */
export function invalidateCatalogIndex(): void {
  indexPromise = null;
  indexValue = null;
}
