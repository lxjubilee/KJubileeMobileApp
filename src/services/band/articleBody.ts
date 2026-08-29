import { logger } from '@/utils';

/**
 * The prose of one Heavenly Band essay, fetched rather than bundled.
 *
 * WHY IT IS NOT IN THE BUNDLE. The 113 essays come to roughly 950KB of text —
 * five times worldMap.json, the largest thing the app ships — and every byte
 * would be parsed at a cold start whether or not anyone opened an article. The
 * site shipped them inline once and moved them out for exactly this reason; its
 * own note says a visitor who opened the dial and pressed play "paid for all of
 * it and read none of it".
 *
 * The body is plain text, one string per paragraph. No HTML and no markdown —
 * which is why the app needs no renderer for it, only the paragraph loop the
 * station article already uses.
 */

const SITE = 'https://kjubilee.com';

/**
 * Bodies already read, kept for the session.
 *
 * Going back to the list and into the same essay is the common move, and the
 * article cannot change under us mid-session — the file is regenerated when the
 * site publishes, not while someone is reading. A plain Map is enough; there is
 * no eviction because 113 essays is the ceiling and nobody reads them all.
 */
const CACHE = new Map<string, string[]>();

/** In-flight requests, so a double-tap does not fetch the same essay twice. */
const PENDING = new Map<string, Promise<string[]>>();

export function cachedArticleBody(slug: string): string[] | undefined {
  return CACHE.get(slug);
}

/**
 * Resolve an essay's paragraphs.
 *
 * Rejects rather than returning an empty array on failure: the screen has to
 * tell "this essay has no body" apart from "the network is down", because only
 * one of those is worth offering a retry for.
 */
export async function fetchArticleBody(slug: string): Promise<string[]> {
  const cached = CACHE.get(slug);
  if (cached) return cached;

  const inFlight = PENDING.get(slug);
  if (inFlight) return inFlight;

  const request = (async () => {
    const url = `${SITE}/data/hm-articles/${encodeURIComponent(slug)}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    const doc = (await res.json()) as { slug?: string; body?: unknown };
    const body = Array.isArray(doc.body) ? doc.body.filter((p): p is string => typeof p === 'string') : [];
    if (!body.length) throw new Error(`${slug} came back with no paragraphs`);
    CACHE.set(slug, body);
    return body;
  })();

  PENDING.set(slug, request);
  try {
    return await request;
  } catch (e) {
    // Logged at debug: the screen surfaces this itself with a retry, so an
    // error-level line would be noise for a state the reader can already see.
    logger.debug('[bandArticle] body unavailable', slug, (e as Error)?.message ?? e);
    throw e;
  } finally {
    PENDING.delete(slug);
  }
}
