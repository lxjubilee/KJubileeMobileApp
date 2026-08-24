export { cdnUrl } from './cdn';
export { formatDuration, formatCount, truncateTitle, userInitials } from './format';
export { logger } from './logger';
export {
  EMAIL_RE,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_AGE,
  normalizeEmail,
  isEmail,
  isPasswordLongEnough,
  passwordsMatch,
  ageFrom,
  isOldEnough,
  toIsoDate,
  fromIsoDate,
} from './validation';

/** Resolve helper: keep entities by an ordered list of ids. */
export function pickByIds<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const map = new Map(items.map((i) => [i.id, i]));
  return ids.map((id) => map.get(id)).filter((x): x is T => Boolean(x));
}

/** Promise-based delay used to simulate latency for mock data sources. */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Generate a locally-unique id with a short prefix (e.g. `pl_lq3f8k2a`). */
export const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Fisher–Yates shuffle — returns a new array, leaving the input untouched. */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
