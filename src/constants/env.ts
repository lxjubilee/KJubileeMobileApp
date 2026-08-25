import Constants from 'expo-constants';

/**
 * Environment configuration sourced from `app.json` -> `expo.extra`.
 * Keeping this in one typed module means screens/services never reach into
 * `Constants.expoConfig` directly, and swapping environments is a config change.
 */
/** Which data source backs the repositories. See `repositories.ts`. */
export type DataSourceKind = 'mock' | 'manifest' | 'api';

type AppExtra = {
  cdnBaseUrl: string;
  apiBaseUrl: string;
  useMock: boolean;
  /** Explicit source selector; takes precedence over `useMock` when set. */
  dataSource: DataSourceKind;
  /**
   * Unified kjubilee-api host (Bearer-token auth). Owns ALL auth/account flows
   * under `/api/auth/*`; in prod it delegates credential checks to JubileeInspire
   * server-side, so the client never talks to JI directly. See `API docs/API.md`.
   */
  authBaseUrl: string;
  /**
   * Dev override for the dynamic-content config endpoint (`/api/mobile/config`)
   * ONLY. When set, the mobile CMS config is fetched from here while auth/social
   * stay on `authBaseUrl` and the catalog on `cdnBaseUrl`. Unset in prod.
   */
  mobileConfigBaseUrl?: string;
  /**
   * Dev override for the catalog manifest (`/music/catalog-manifest.json`) ONLY —
   * the source of albums, artists and categories. Media (audio, covers) keeps
   * flowing through `cdnBaseUrl`, which is the only host that serves it. Point
   * this at a local web server to browse a locally-built catalog. Unset in prod.
   */
  catalogBaseUrl?: string;
  /** Cloudflare Turnstile site key for the sign-in CAPTCHA (empty = CAPTCHA off). */
  turnstileSiteKey: string;
  /** Origin the Turnstile widget runs under (must be allow-listed for the site key). */
  turnstileBaseUrl: string;
  /**
   * Development escape hatch: render the main app without a session, so screens
   * behind the Jubilee Door can be worked on while the auth API is unavailable.
   * Ignored unless `__DEV__` — see ENV.DEV_SKIP_AUTH below.
   */
  devSkipAuth?: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

const useMock = extra.useMock ?? true;

export const ENV = {
  CDN_BASE_URL: extra.cdnBaseUrl ?? 'https://cdn.jubileeverse.com',
  API_BASE_URL: extra.apiBaseUrl ?? 'https://api.jubileeverse.com/v1',
  USE_MOCK: useMock,
  // Backward-compatible: fall back to the old boolean when `dataSource` is unset.
  DATA_SOURCE: (extra.dataSource ?? (useMock ? 'mock' : 'api')) as DataSourceKind,
  // Unified kjubilee-api — single host for every /api/auth/* call (Bearer).
  API_AUTH_BASE: extra.authBaseUrl ?? 'https://api.kjubilee.com',
  // Host for the dynamic-content config ONLY. Defaults to the auth host so prod
  // is unchanged; override via extra.mobileConfigBaseUrl to test a local API.
  MOBILE_CONFIG_BASE: extra.mobileConfigBaseUrl ?? extra.authBaseUrl ?? 'https://api.kjubilee.com',
  // Host for the catalog MANIFEST ONLY (albums/artists/categories). Defaults to
  // the CDN so prod is unchanged; override via extra.catalogBaseUrl to browse a
  // locally-built catalog. Media still resolves against CDN_BASE_URL.
  CATALOG_BASE_URL: extra.catalogBaseUrl ?? extra.cdnBaseUrl ?? 'https://cdn.jubileeverse.com',
  // Cloudflare Turnstile (sign-in CAPTCHA). Empty disables the widget.
  TURNSTILE_SITE_KEY: extra.turnstileSiteKey ?? '',
  TURNSTILE_BASE_URL: extra.turnstileBaseUrl ?? 'https://kjubilee.com',
  /**
   * Skip the auth gate. Double-guarded — the flag must be set in app.json AND
   * the bundle must be a dev bundle — so a release build cannot ship an
   * unauthenticated app even if the flag is left switched on by mistake.
   *
   * Temporary: remove once the auth API is reachable. Anything downstream of a
   * real session (entitlement, likes, playlists) stays empty or fails under it;
   * it exists to reach the radio surfaces, not to fake a signed-in user.
   */
  DEV_SKIP_AUTH:
    (typeof __DEV__ !== 'undefined' ? __DEV__ : false) && extra.devSkipAuth === true,
} as const;
