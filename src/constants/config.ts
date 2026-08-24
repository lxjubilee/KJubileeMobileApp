import { ENV } from './env';

/**
 * Global feature/config flags. `USE_MOCK` is the single switch that decides
 * whether repositories read local mock JSON or call the live jubileeverse API.
 * Flip `useMock` in app.json `extra` (or override here) to swap data sources
 * with zero changes at any call site.
 */
export const CONFIG = {
  USE_MOCK: ENV.USE_MOCK,
  /** 'mock' | 'manifest' | 'api' — which data source repositories read from. */
  DATA_SOURCE: ENV.DATA_SOURCE,
  /** Unified kjubilee-api base URL — every /api/auth/* call (Bearer auth). */
  API_AUTH_BASE: ENV.API_AUTH_BASE,
  /** Cloudflare Turnstile site key for the sign-in CAPTCHA (empty = disabled). */
  TURNSTILE_SITE_KEY: ENV.TURNSTILE_SITE_KEY,
  /** Origin the Turnstile widget runs under (allow-listed for the site key). */
  TURNSTILE_BASE_URL: ENV.TURNSTILE_BASE_URL,
  /**
   * Request timeout. Set high because `api.kjubilee.com` intermittently stalls
   * TCP connect by ~15s (server/infra issue). A single-use Turnstile token means
   * signin can't be safely retried, so we wait the stall out instead of aborting
   * at 15s (which RN surfaces as a bogus "Network error"). Lower this once the
   * backend connection stalls are fixed.
   */
  API_TIMEOUT_MS: 30000,
  /** Simulated network latency for mock responses, to mimic real loading UX. */
  MOCK_LATENCY_MS: 350,
  RECENT_SEARCHES_LIMIT: 10,
} as const;
