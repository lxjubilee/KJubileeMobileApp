import { Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';
import { logger } from '@/utils';

/**
 * Album sharing + share-link parsing.
 *
 * The canonical share URL is an https link to the KJubilee.com album page,
 * carrying the album code (`c`):
 *
 *   https://kjubilee.com/album?c=<ALBUM_CODE>
 *
 * That one URL renders a rich preview (the web page's Open Graph tags), opens
 * the app to the album when installed (universal / App Links on kjubilee.com),
 * and falls back to the store otherwise (the web page redirects). `album.id` /
 * `track.albumId` IS the album code.
 *
 * Sharing is album-level: there is no per-track web page, so a shared link
 * always resolves to an album.
 */

const WEB_HOST = 'kjubilee.com';

/** Minimal album shape needed to build a share. */
export interface AlbumShareInput {
  /** Album code (Album.id / Track.albumId). */
  code: string;
  title: string;
  artistName: string;
}

export function buildAlbumShareUrl(code: string): string {
  return `https://${WEB_HOST}/album?c=${encodeURIComponent(code)}`;
}

/** Open the native share sheet (WhatsApp, Messenger, Email, SMS, …) for an album. */
export async function shareAlbum(album: AlbumShareInput): Promise<void> {
  const url = buildAlbumShareUrl(album.code);
  const heading = `${album.title} — ${album.artistName}`;
  try {
    if (Platform.OS === 'ios') {
      // iOS uses `url` for the link preview; `message` is the accompanying text.
      await Share.share({ message: heading, url });
    } else {
      // Android ignores `url`; fold it into the message.
      await Share.share({ message: `${heading}\n${url}` });
    }
  } catch (e) {
    // Sharing throws if the user dismisses the sheet — not an error worth surfacing.
    logger.warn('shareAlbum failed', e);
  }
}

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

/**
 * Parse an incoming deep link into an album code. Accepts the canonical web URL,
 * the custom-scheme variants, and the legacy `kjubilee://track/<id>` form
 * (id is `<code>-<index>-<n>`) so older shares still resolve to their album.
 */
export function parseShareLink(url: string): { albumCode: string } | null {
  if (!url) return null;
  let parsed: Linking.ParsedURL;
  try {
    parsed = Linking.parse(url);
  } catch {
    return null;
  }

  const q = (parsed.queryParams ?? {}) as Record<string, string | string[] | undefined>;
  const flat = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const segs = [parsed.hostname ?? '', ...(parsed.path ?? '').split('/')].filter(Boolean);

  // 1) …/album?c=<CODE>
  const c = flat(q.c) ?? flat(q.code);
  if (c) return { albumCode: String(c) };

  // 2) …/album/<CODE>
  const ai = segs.indexOf('album');
  if (ai >= 0 && segs[ai + 1]) return { albumCode: decodeURIComponent(segs[ai + 1]) };

  // 3) legacy …/track/<code>-<index>-<n>  ->  resolve to the album
  const ti = segs.indexOf('track');
  if (ti >= 0 && segs[ti + 1]) {
    const id = decodeURIComponent(segs[ti + 1]);
    const parts = id.split('-');
    return { albumCode: parts.length >= 3 ? parts.slice(0, -2).join('-') : id };
  }

  return null;
}
