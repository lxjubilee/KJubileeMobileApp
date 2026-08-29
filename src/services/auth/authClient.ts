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
  // The Jubilee ID door. `/api/sso/login` answers 401 for a WRONG PASSWORD — a
  // pre-auth answer, not a lapsed session. Without this the door's own rejection
  // drove a refresh attempt and, finding no refresh token, fired `onAuthFailure`
  // and logged a session that never existed as "signed out".
  '/api/sso/',
  // Account settings, for the same reason one layer up. `POST /api/account/password`
  // answers 401 with "That password doesn't match" when the CURRENT password is
  // wrong — the session behind it is perfectly good. Treating that as a lapsed
  // session would turn a typo into a sign-out, i.e. Change Password would work
  // as a logout button.
  '/api/account/',
];
const isExempt = (url?: string) => !!url && REFRESH_EXEMPT.some((p) => url.includes(p));

/**
 * Endpoints whose failures are already handled by their caller and must not be
 * logged at error level. Nothing here affects control flow — the promise still
 * rejects and the caller still catches.
 */
const QUIET_ON_FAILURE = ['/api/analytics/'];
const isQuiet = (config?: { url?: string }) =>
  !!config?.url && QUIET_ON_FAILURE.some((p) => config.url!.includes(p));

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

/**
 * Both refresh response shapes the server has been observed to use — nested
 * under `tokens` per `API docs/API.md`, and flat like `/api/sso/login`.
 */
interface RefreshResponseBody {
  tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: string };
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

// Single-flight refresh: concurrent 401s share one refresh round-trip.
let refreshPromise: Promise<RefreshOutcome> | null = null;

async function runRefresh(): Promise<RefreshOutcome> {
  const refreshToken = handlers?.getRefreshToken();
  if (!refreshToken) return { result: 'invalid' };
  // Bare axios call (no interceptors) to avoid recursive refresh loops — so clear
  // the cookie here too, since the request interceptor doesn't run for it.
  await clearSessionCookies();
  try {
    // Two response shapes are accepted, because the deployed endpoint does not
    // match the one `API docs/API.md` describes:
    //   nested — { tokens: { accessToken, refreshToken, expiresAt } }   (API.md)
    //   flat   — { token, refreshToken, expiresAt }                     (live, and
    //            the same shape /api/sso/login returns)
    // Reading only the nested form made a SUCCESSFUL 200 refresh look like a
    // failure: `tokens.accessToken` was undefined, so this returned `error`, the
    // caller treated it as a network blip, and the session was dropped anyway.
    const res = await axios.post<RefreshResponseBody>(
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
    logger.debug('AUTH refresh ->', res.status);
    if (res.status === 401 || res.status === 400) return { result: 'invalid' };
    if (res.status < 200 || res.status >= 300) return { result: 'error' };

    const body = res.data ?? {};
    const nextAccess = body.tokens?.accessToken ?? body.accessToken ?? body.token;
    if (!nextAccess) {
      // 2xx with nothing usable: a contract change, not a dead session. Keep the
      // tokens so the next launch can try again rather than signing the user out.
      logger.warn('AUTH refresh: 2xx with no access token — keys:', Object.keys(body).join(','));
      return { result: 'error' };
    }
    const expiresAt = body.tokens?.expiresAt ?? body.expiresAt;
    setAccessToken(nextAccess);
    handlers?.persistTokens({
      accessToken: nextAccess,
      // Non-rotating today (it echoes the same token back), but store whatever
      // came back so a move to rotation needs no client change.
      refreshToken: body.tokens?.refreshToken ?? body.refreshToken ?? refreshToken,
      expiresAt,
    });
    return { result: 'ok', accessToken: nextAccess };
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
        // Say which of the two it was. "Refresh token rejected" on a session that
        // never had a refresh token sent a real diagnosis down the wrong path for
        // a long time: the actual fault was an unauthenticated request, because
        // the stored JWT had not been loaded yet.
        logger.warn(
          handlers.getRefreshToken()
            ? 'AUTH refresh token rejected by server — signing out'
            : `AUTH 401 with no refresh token (session token absent or expired) — signing out: ${original.url}`,
        );
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
    // Fire-and-forget callers opt out of the red box. `logger.error` opens LogBox
    // in a dev build, so a swallowed failure on a best-effort endpoint still looks
    // like a crash — the trap `authService.signOut` documents, met again by the
    // analytics beacons against an endpoint that does not exist yet. The request
    // still rejects; only the volume changes.
    if (isQuiet(original)) {
      logger.debug('AUTH ✗ (quiet)', apiError.status, original?.url ?? '');
    } else {
      logger.error('AUTH ✗', apiError.status, apiError.message, error.code ?? '', original?.url ?? '');
    }
    return Promise.reject(apiError);
  },
);
