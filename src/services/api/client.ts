import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { CONFIG, ENV } from '@/constants';
import { logger } from '@/utils';

/**
 * Shared axios instance for the jubileeverse API. Interceptors centralize:
 *  - auth header injection (kept in sync by tokenStore)
 *  - request/response logging in dev
 *  - error normalization into a consistent ApiError
 *  - transparent single-flight refresh on 401 (delegated to the auth client)
 */
export interface ApiError {
  status: number;
  message: string;
  raw?: unknown;
}

let authToken: string | null = null;

/** Registers/clears the bearer token. Called by tokenStore on every change. */
export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

/**
 * Renews the access token. Injected by the auth wiring (`initAuthClient`) so this
 * module stays free of auth/token imports. Resolves to a fresh access token, or
 * null when the session could not be renewed.
 */
type TokenRefresher = () => Promise<string | null>;
let refreshAccessToken: TokenRefresher | null = null;
export const configureApiClient = (refresher: TokenRefresher): void => {
  refreshAccessToken = refresher;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: CONFIG.API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  logger.debug('API →', config.method?.toUpperCase(), config.url);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // The access token lives an hour; renew once and replay rather than failing
    // the call (or, worse, leaving the app on a stale token until the next launch).
    // The refresher is single-flight in the auth client, so concurrent 401s here
    // share one round-trip. It never signs the user out on its own — a definitively
    // dead session is handled by the auth client's own failure path.
    if (error.response?.status === 401 && original && !original._retry && refreshAccessToken) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }

    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      message:
        (error.response?.data as { message?: string })?.message ??
        error.message ??
        'Network request failed',
      raw: error.response?.data,
    };
    logger.error('API ✗', apiError.status, apiError.message);
    return Promise.reject(apiError);
  },
);
