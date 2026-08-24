import * as SecureStore from 'expo-secure-store';
import { logger } from '@/utils';
import { setAuthToken } from '@/services/api/client';
import { setAccessToken } from './authClient';
import type { AuthUser } from './authMappers';

/**
 * Encrypted token storage (Keychain/Keystore via expo-secure-store). Keeps an
 * in-memory mirror so the auth client always has the current access token
 * synchronously, and so the refresh interceptor can read the refresh token.
 *
 * Also caches the last known profile, so a cold start with no connectivity can
 * restore the session optimistically instead of bouncing the user to Sign In.
 */
const KEY_ACCESS = 'kjubilee.auth.accessToken';
const KEY_REFRESH = 'kjubilee.auth.refreshToken';
const KEY_EXPIRES = 'kjubilee.auth.expiresAt';
const KEY_USER = 'kjubilee.auth.user';

/**
 * Treat the access token as expired this far ahead of its real expiry, so a
 * request never leaves with a token that lapses in flight.
 */
const EXPIRY_SKEW_MS = 60 * 1000;

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
}

let memo: StoredTokens | null = null;
let memoUser: AuthUser | null = null;

/** Push the bearer token to BOTH axios instances (auth surface + data surface). */
function applyAccessToken(token: string | null): void {
  setAccessToken(token);
  setAuthToken(token);
}

export const tokenStore = {
  /** In-memory accessors (sync) used by the auth client. */
  getAccessToken: (): string | null => memo?.accessToken ?? null,
  getRefreshToken: (): string | null => memo?.refreshToken ?? null,
  getExpiresAt: (): string | null => memo?.expiresAt ?? null,

  /**
   * True when the access token has lapsed (or is about to). Drives the PROACTIVE
   * refresh on cold start — `GET /api/auth/me` returns 200 `{authenticated:false}`
   * rather than 401 for an expired token, so waiting for a 401 would never renew
   * it and the session would be discarded despite a valid refresh token.
   * An absent expiry is treated as expired: refreshing is cheap, a false sign-out
   * is not.
   */
  isAccessTokenExpired: (skewMs: number = EXPIRY_SKEW_MS): boolean => {
    if (!memo?.accessToken) return true;
    if (!memo.expiresAt) return true;
    const at = new Date(memo.expiresAt).getTime();
    if (Number.isNaN(at)) return true;
    return at - skewMs <= Date.now();
  },

  /** Last known profile, used to restore a session offline. */
  getUser: (): AuthUser | null => memoUser,

  async saveUser(user: AuthUser): Promise<void> {
    memoUser = user;
    try {
      await SecureStore.setItemAsync(KEY_USER, JSON.stringify(user));
    } catch (e) {
      logger.warn('tokenStore.saveUser failed', e);
    }
  },

  /** Load tokens from secure storage into memory + the client. Returns them. */
  async load(): Promise<StoredTokens | null> {
    try {
      const [accessToken, refreshToken, expiresAt, user] = await Promise.all([
        SecureStore.getItemAsync(KEY_ACCESS),
        SecureStore.getItemAsync(KEY_REFRESH),
        SecureStore.getItemAsync(KEY_EXPIRES),
        SecureStore.getItemAsync(KEY_USER),
      ]);
      if (user) {
        try { memoUser = JSON.parse(user) as AuthUser; } catch { memoUser = null; }
      }
      if (accessToken && refreshToken) {
        memo = { accessToken, refreshToken, expiresAt: expiresAt ?? undefined };
        applyAccessToken(accessToken);
        return memo;
      }
    } catch (e) {
      logger.warn('tokenStore.load failed', e);
    }
    return null;
  },

  async save(tokens: StoredTokens): Promise<void> {
    memo = tokens;
    applyAccessToken(tokens.accessToken);
    try {
      await Promise.all([
        SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken),
        SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken),
        tokens.expiresAt
          ? SecureStore.setItemAsync(KEY_EXPIRES, tokens.expiresAt)
          : SecureStore.deleteItemAsync(KEY_EXPIRES),
      ]);
    } catch (e) {
      logger.warn('tokenStore.save failed', e);
    }
  },

  /**
   * Persist the token set returned by a refresh. The API is non-rotating (it
   * echoes the same refresh token back), but we store whatever it returns so a
   * future move to rotation needs no client change. `expiresAt` MUST be kept
   * current — it is what drives the proactive refresh.
   */
  async updateTokens(accessToken: string, refreshToken: string, expiresAt?: string): Promise<void> {
    memo = { accessToken, refreshToken, expiresAt: expiresAt ?? memo?.expiresAt };
    applyAccessToken(accessToken);
    try {
      await Promise.all([
        SecureStore.setItemAsync(KEY_ACCESS, accessToken),
        SecureStore.setItemAsync(KEY_REFRESH, refreshToken),
        expiresAt
          ? SecureStore.setItemAsync(KEY_EXPIRES, expiresAt)
          : Promise.resolve(),
      ]);
    } catch (e) {
      logger.warn('tokenStore.updateTokens failed', e);
    }
  },

  async clear(): Promise<void> {
    memo = null;
    memoUser = null;
    applyAccessToken(null);
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(KEY_ACCESS),
        SecureStore.deleteItemAsync(KEY_REFRESH),
        SecureStore.deleteItemAsync(KEY_EXPIRES),
        SecureStore.deleteItemAsync(KEY_USER),
      ]);
    } catch (e) {
      logger.warn('tokenStore.clear failed', e);
    }
  },
};
