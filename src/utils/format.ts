/** Format seconds as m:ss (or h:mm:ss for long durations). */
export function formatDuration(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const ss = s.toString().padStart(2, '0');
  if (h > 0) {
    const mm = m.toString().padStart(2, '0');
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

/**
 * Truncate a section title for a uniform UI: titles longer than `max` (29 by
 * default) are cut after the first `max` characters and suffixed with an
 * ellipsis. Shorter titles are returned unchanged.
 */
export function truncateTitle(title: string, max = 29): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max)}...`;
}

/**
 * Up to two uppercase initials for an avatar — "Sandeep Agarwal" -> "SA".
 * Prefers the explicit first/last pair, then the first two words of the display
 * name, then the email's local part (commonly `first.last`). Returns '' when
 * there is nothing usable, so callers can fall back to a person icon.
 */
export function userInitials(
  user?: { firstName?: string; lastName?: string; displayName?: string; email?: string } | null,
): string {
  // `Array.from` so an accented or non-Latin first letter survives intact.
  const head = (word: string): string => Array.from(word)[0]?.toUpperCase() ?? '';

  const first = user?.firstName?.trim() ?? '';
  const last = user?.lastName?.trim() ?? '';
  if (first && last) return head(first) + head(last);

  const raw = (user?.displayName || first || user?.email || '').trim();
  // Drop any domain: it would otherwise supply the second "word" (…@logix -> "SL").
  const source = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw;
  return source
    .split(/[\s._+-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(head)
    .join('');
}

/** Compact number formatting, e.g. 1200 -> "1.2K", 3_400_000 -> "3.4M". */
export function formatCount(n?: number): string {
  if (n == null) return '';
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Exact number with thousands separators, e.g. 1749 -> "1,749".
 *
 * Distinct from `formatCount`, which abbreviates. The website's hero prints a
 * station's track total in full ("1,749 tracks") because the exact size of a
 * catalog is the claim being made — "1.7K tracks" reads as an estimate.
 */
export function formatThousands(n?: number): string {
  if (n == null) return '';
  return `${n}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Lowercased and stripped of accents, for search matching.
 *
 * Without the fold, typing "Romana" finds nothing: the station is spelled
 * "Jubilee Praise (Română)", and `ă` is not `a` to `includes()`. The catalog is
 * full of these — ñ ê ç â ă ế ệ ù á — and a listener typing on a plain keyboard
 * has no way to reach them.
 *
 * NFD splits an accented letter into its base plus a combining mark, and the
 * range below is the Combining Diacritical Marks block. Non-Latin scripts
 * (Chinese, Arabic, Amharic, Bengali…) are untouched, which is correct: those
 * are searched in their own script, not transliterated.
 *
 * `normalize` is guarded because Hermes has not always shipped it; without it
 * the fold degrades to a plain lowercase rather than throwing.
 */
const CAN_NORMALIZE = typeof String.prototype.normalize === 'function';

export function foldForSearch(value: string): string {
  const base = CAN_NORMALIZE ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : value;
  return base.toLowerCase();
}
