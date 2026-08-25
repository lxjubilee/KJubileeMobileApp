/** Namespaced AsyncStorage keys. Keep all persisted keys here to avoid clashes. */
export const STORAGE_KEYS = {
  PERSIST_ROOT: 'kjubilee:root',
  RECENT_SEARCHES: 'kjubilee:recentSearches',
  AUTH_TOKEN: 'kjubilee:authToken',
  /** Which tuner face the Dial screen shows: 'linear' | 'rotary'. */
  DIAL_STYLE: 'kjubilee:dialStyle',
  /** Catalog manifest is cached chunked (it exceeds Android's ~2 MB row limit). */
  CATALOG_MANIFEST_META: 'kjubilee:catalogManifest:meta',
  CATALOG_MANIFEST_CHUNK: 'kjubilee:catalogManifest:chunk:',
  /** Admin-managed mobile category config (small JSON; stale-while-revalidate). */
  MOBILE_CONFIG: 'kjubilee:mobileConfig',
} as const;
