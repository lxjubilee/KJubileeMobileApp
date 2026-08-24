import { NativeModules } from 'react-native';
import { CONFIG } from '@/constants';
import { logger } from '@/utils';

/**
 * Keeps the app a *pure Bearer client* against the unified kjubilee-api.
 *
 * The API authenticates with JWT Bearer tokens, but it ALSO sets a `jv_session`
 * (and `jv_csrf`) cookie on signin/verify responses. React Native's native cookie
 * jar captures those and auto-attaches them to every later request to the host —
 * which makes the server treat us as a cookie client and enforce CSRF, returning
 * `403 CSRF token missing or invalid` on mutations like logout/change-password.
 *
 * Per `API docs/API.md`, Bearer-only clients are CSRF-exempt, so we simply strip
 * those cookies from the jar. The app NEVER sends a CSRF token.
 *
 * NOTE: On Android the real fix is native — `NoCookieOkHttpClientFactory` installs
 * a no-op OkHttp CookieJar, so cookies are never stored/sent and this JS clearing
 * is just a harmless no-op (the native cookies module isn't bundled there). This
 * path is the cross-platform fallback (e.g. iOS) when that module *is* linked.
 */
type CookieManagerLike = {
  clearByName?: (url: string, name: string) => Promise<boolean>;
  get?: (url: string) => Promise<Record<string, { value?: string } | undefined>>;
  set?: (
    url: string,
    cookie: { name: string; value: string; path?: string; expires?: string },
  ) => Promise<boolean>;
};

let manager: CookieManagerLike | null | undefined;

function getManager(): CookieManagerLike | null {
  if (manager === undefined) {
    const linked = !!(NativeModules.RNCookieManagerIOS || NativeModules.RNCookieManagerAndroid);
    if (linked) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        manager = require('@react-native-cookies/cookies').default as CookieManagerLike;
      } catch (e) {
        logger.debug('cookieJar: native module failed to load', e);
        manager = null;
      }
    } else {
      // Not bundled here — fine on Android, where NoCookieOkHttpClientFactory
      // already disables cookies natively. Debug-level so it isn't alarming.
      logger.debug('cookieJar: native cookie module not present — relying on native cookie jar');
      manager = null;
    }
  }
  return manager ?? null;
}

/** Remove one cookie: clearByName, then verify and overwrite-as-expired if needed. */
async function removeCookie(m: CookieManagerLike, url: string, name: string): Promise<void> {
  try {
    if (m.clearByName) await m.clearByName(url, name);
  } catch (e) {
    logger.warn(`cookieJar: clearByName(${name}) failed`, e);
  }
  // clearByName is unreliable on some Android versions — verify, and if the cookie
  // is still there, force-expire it (targeted; avoids nuking unrelated cookies).
  try {
    const cookies = m.get ? await m.get(url) : undefined;
    if (cookies?.[name]?.value && m.set) {
      await m.set(url, { name, value: '', path: '/', expires: '1970-01-01T00:00:00.000Z' });
    }
  } catch (e) {
    logger.warn(`cookieJar: expire(${name}) failed`, e);
  }
}

/**
 * Strip the server-set session/csrf cookies so requests stay Bearer-only.
 *
 * Awaited in the auth request path, so the cookie is gone BEFORE the request
 * goes out. A generous timeout only guards against a truly stuck native promise
 * (clearing normally takes well under a second) so it can't block for the full
 * request timeout.
 */
export async function clearSessionCookies(): Promise<void> {
  const m = getManager();
  if (!m) return;
  const url = CONFIG.API_AUTH_BASE;
  const work = (async () => {
    await removeCookie(m, url, 'jv_session');
    await removeCookie(m, url, 'jv_csrf');
  })();
  await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, 5000))]);
}
