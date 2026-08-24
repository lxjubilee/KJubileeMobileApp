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
