import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { CONFIG } from '@/constants';
import { logger } from '@/utils';
import type { ApiError } from '@/services/api';
import { clearSessionCookies } from './cookieJar';

/**
 * Axios instance for the unified kjubilee-api (`API docs/API.md`). Bearer-token
 * auth — the single host for every `/api/auth/*` call. Mirrors
 * services/api/client.ts: an in-memory bearer token + a normalized ApiError.
 * Adds transparent single-flight refresh on 401.
 */
export const authClient: AxiosInstance = axios.create({
  baseURL: CONFIG.API_AUTH_BASE,
  timeout: CONFIG.API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;

/** Set/clear the bearer token used on every auth-client request. */
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

// Injected by the auth wiring so this module stays free of redux/tokenStore imports.
interface RotatedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}
interface SessionHandlers {
  getRefreshToken: () => string | null;
  /** True when the held access token has lapsed (drives the proactive refresh). */
  isAccessTokenExpired: () => boolean;
  /** Persist the token set returned by a refresh. */
  persistTokens: (tokens: RotatedTokens) => void;
  onAuthFailure: () => void;
}

/**
 * Outcome of a refresh attempt. The distinction matters: only `invalid` means the
 * session is genuinely dead and the stored tokens should be discarded. `error` is
 * transient (no signal, timeout, 5xx) — the tokens MUST be kept, otherwise a
 * moment of bad connectivity signs the user out of a session that is still valid
 * server-side for a year.
 */
export type RefreshOutcome =
  | { result: 'ok'; accessToken: string }
  | { result: 'invalid' }
  | { result: 'error' };
let handlers: SessionHandlers | null = null;
export const configureAuthClient = (h: SessionHandlers): void => {
  handlers = h;
};

const toApiError = (error: AxiosError): ApiError => {
  const data = error.response?.data;
  // The global rate limiter answers 429 with a PLAIN TEXT body, so `data` is not
  // always an object — read the JSON fields only when it actually is one.
  const body =
    typeof data === 'object' && data !== null
      ? (data as { message?: string; error?: string })
      : null;
  return {
    status: error.response?.status ?? 0,
    message: body?.message ?? body?.error ?? error.message ?? 'Network request failed',
    raw: data,
  };
};

// The pre-auth handshake: nothing here has a session to renew, so a refresh-retry
// would be pointless at best and would spend a request from the shared
// rate-limit budget at worst.
const REFRESH_EXEMPT = [
  '/api/auth/lookup',
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/verify-signup',
  '/api/auth/verify-login',
  '/api/auth/send-signup-verification',
  '/api/auth/send-login-verification',
  '/api/auth/refresh',
];
const isExempt = (url?: string) => !!url && REFRESH_EXEMPT.some((p) => url.includes(p));

authClient.interceptors.request.use(async (config) => {
  // We are a pure Bearer client. RN's native cookie jar would otherwise replay a
  // server-set `jv_session` cookie on every request, making the server enforce
  // CSRF (→ 403 on signin/logout/etc.). Strip it BEFORE each request — awaited so
  // the jar is empty by the time the native layer builds the request. The app
  // never sends or needs a CSRF token. See `API docs/API.md`.
  await clearSessionCookies();
  // Proactive renewal: the access token only lives an hour, and several endpoints
  // (notably GET /api/auth/me) answer 200 rather than 401 when it has lapsed — so
  // waiting for a 401 is not enough to keep a session alive. Renew here instead.
  if (
    accessToken &&
    handlers?.isAccessTokenExpired() &&
    handlers.getRefreshToken() &&
    !isExempt(config.url)
  ) {
    await refreshSession(); // failures fall through; the 401 path below still applies
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  logger.debug('AUTH →', config.method?.toUpperCase(), config.url);
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh round-trip.
let refreshPromise: Promise<RefreshOutcome> | null = null;

async function runRefresh(): Promise<RefreshOutcome> {
  const refreshToken = handlers?.getRefreshToken();
  if (!refreshToken) return { result: 'invalid' };
  // Bare axios call (no interceptors) to avoid recursive refresh loops — so clear
  // the cookie here too, since the request interceptor doesn't run for it.
  await clearSessionCookies();
  try {
    // The API nests both tokens under `tokens`. It does NOT rotate the refresh
    // token (it echoes the same one back), so fall back to the token we sent if a
    // response ever omits it rather than dropping the session.
    const res = await axios.post<{ tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: string } }>(
      `${CONFIG.API_AUTH_BASE}/api/auth/refresh`,
      { refreshToken },
      {
        timeout: CONFIG.API_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
        // Classify the status ourselves instead of letting axios throw, so a 401
        // (dead session) is never confused with a 500/network blip (transient).
        validateStatus: () => true,
      },
    );
    // 401 = the refresh token was rejected; 400 = it was malformed. Both are
    // definitive — no amount of retrying will help.
    if (res.status === 401 || res.status === 400) return { result: 'invalid' };
    if (res.status < 200 || res.status >= 300) return { result: 'error' };

    const accessToken = res.data?.tokens?.accessToken;
    if (!accessToken) return { result: 'error' };
    const expiresAt = res.data?.tokens?.expiresAt;
    setAccessToken(accessToken);
    handlers?.persistTokens({
      accessToken,
      refreshToken: res.data?.tokens?.refreshToken ?? refreshToken,
      expiresAt,
    });
    return { result: 'ok', accessToken };
  } catch (e) {
    // Network error / timeout — transient. Keep the tokens.
    logger.warn('AUTH refresh transient failure — keeping session', e);
    return { result: 'error' };
  }
}

/**
 * Renew the access token, sharing one in-flight request between all callers.
 * Exposed so the app can refresh PROACTIVELY on cold start: `GET /api/auth/me`
 * answers 200 `{ authenticated:false }` (never 401) once the access token has
 * lapsed, so a reactive-only refresh would never fire at launch.
 */
export function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

authClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _netRetries?: number })
      | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !isExempt(original.url) && handlers) {
      original._retry = true;
      const outcome = await refreshSession();
      if (outcome.result === 'ok') {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${outcome.accessToken}`;
        return authClient(original);
      }
      // Only a definitive rejection ends the session. A transient failure falls
      // through to the normal error path with the tokens left intact, so the next
      // request (or the next launch) can try again.
      if (outcome.result === 'invalid') {
        logger.warn('AUTH refresh token rejected — signing out');
        handlers.onAuthFailure();
      } else {
        logger.warn('AUTH refresh unavailable — keeping session', original.url);
      }
      return Promise.reject(toApiError(error));
    }

    // No response AND no connection established (the server's intermittent connect
    // stalls / transient DNS). ERR_NETWORK means the request never reached the
    // server, so retrying is safe even for the single-use CAPTCHA token on signin.
    // (A timeout — ECONNABORTED — is NOT retried: the server may have received it.)
    if (error.code === 'ERR_NETWORK' && original && (original._netRetries ?? 0) < 2) {
      original._netRetries = (original._netRetries ?? 0) + 1;
      logger.warn(`AUTH retry ${original._netRetries}/2 after ERR_NETWORK`, original.url);
      await new Promise((r) => setTimeout(r, 500 * (original._netRetries ?? 1)));
      return authClient(original);
    }

    const apiError = toApiError(error);
    logger.error('AUTH ✗', apiError.status, apiError.message, error.code ?? '', original?.url ?? '');
    return Promise.reject(apiError);
  },
);
