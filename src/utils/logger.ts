/* eslint-disable no-console */

/**
 * Thin logging wrapper. Centralizing log calls means we can later route to a
 * crash/analytics service (Sentry, etc.) without touching call sites.
 */
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[KJubilee]', ...args);
  },
  info: (...args: unknown[]) => console.info('[KJubilee]', ...args),
  warn: (...args: unknown[]) => console.warn('[KJubilee]', ...args),
  error: (...args: unknown[]) => console.error('[KJubilee]', ...args),
};
