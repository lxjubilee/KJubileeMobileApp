import articles from './stationArticles.json';

/**
 * Editorial copy for a station page, ported from the website's
 * `public/js/station-articles.js` by `scripts/build-station-articles.mjs`.
 *
 * Only 17 of the 105 stations have one. A station without an entry is not an
 * error — the screen falls back to the catalog's own description, which is what
 * the website's `articleFor()` does as well.
 */
export interface StationArticleSection {
  h: string | null;
  p: string[];
}

export interface StationArticle {
  /** The "For this: …" standfirst under the title. */
  need: string | null;
  /** The "What it stands on" pull-quote. */
  stands: string | null;
  sections: StationArticleSection[];
}

const BY_SLUG = articles as Record<string, StationArticle>;

export function stationArticle(slug: string): StationArticle | undefined {
  return BY_SLUG[slug];
}
