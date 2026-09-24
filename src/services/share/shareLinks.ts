import * as Linking from 'expo-linking';

/**
 * A frequency, as the site lets people write one.
 *
 * The whole conceit of KJubilee is that a station has a frequency rather than a
 * slug — something you can print on a card or say out loud on air — so
 * `kjubilee.com/hm308.70` is a station's real address. This mirrors the rule in
 * the web's `middleware.js`: case is ignored, the separator may be a space, dot,
 * underscore or dash, and a single decimal is padded, so someone reading
 * "HM 308.7" off a card lands where the catalogue writes it, 308.70.
 *
 * Deliberately NOT validated against the catalogue here, exactly as the web
 * declines to: the Dial resolves it against the same station data every other
 * screen reads, and can tell "assigned but not on air yet" apart from "no such
 * frequency" — a distinction this parser has no way to make.
 */
const FREQUENCY_SEGMENT = /^hm[\s._-]?(\d{3})(?:[.,](\d{1,2}))?$/i;

/**
 * Parse an incoming deep link into a dial frequency, as `'308.70'`.
 *
 * Accepts the address a listener is given (`…/hm308.70`, `kjubilee://hm308-7`)
 * and the `?hm=` form the web's own 307 redirect lands on, so a link that has
 * already bounced through the site still resolves here.
 */
export function parseFrequencyLink(url: string): { hm: string } | null {
  if (!url) return null;
  let parsed: Linking.ParsedURL;
  try {
    parsed = Linking.parse(url);
  } catch {
    return null;
  }

  const q = (parsed.queryParams ?? {}) as Record<string, string | string[] | undefined>;
  const raw = Array.isArray(q.hm) ? q.hm[0] : q.hm;
  if (raw) {
    const n = Number(String(raw).replace(',', '.'));
    if (Number.isFinite(n)) return { hm: n.toFixed(2) };
  }

  // The custom scheme puts the first segment in `hostname`, https puts it in
  // `path` — check both rather than guessing which shape arrived.
  const segs = [parsed.hostname ?? '', ...(parsed.path ?? '').split('/')].filter(Boolean);
  for (const seg of segs) {
    const m = FREQUENCY_SEGMENT.exec(decodeURIComponent(seg));
    if (m) return { hm: `${m[1]}.${m[2] ? m[2].padEnd(2, '0') : '00'}` };
  }

  return null;
}
