import type { TFunction } from 'i18next';

/**
 * Localization helpers for admin-managed (config-driven) strings on Home.
 *
 * The mobile config (`GET /api/mobile/config`) returns category labels, section
 * names and music-type genre names as raw English strings — the backend has no
 * localized labels. These helpers translate the *display* text on the client
 * while the raw string stays the filter identity (see Home/index.tsx).
 *
 * Every helper falls back to the raw string via `defaultValue`, so any label an
 * admin renamed, or a page/genre/section not yet in the locale files, renders
 * as-is instead of showing a raw key.
 */

/**
 * Localize a category chip by its STABLE config key (`home`, `inspire_family`,
 * `family_friendly`, `children`, `music_type`, …). Keying on the config key —
 * not the display label — keeps translations working even if an admin renames a
 * category. Falls back to `rawLabel` when the key is unknown/empty.
 */
export function localizeCategory(t: TFunction, key: string | undefined, rawLabel: string): string {
  if (!key) return rawLabel;
  // Backend keys drift between `_` and `-` separators (e.g. it sends `music-type`
  // while the locale files key it as `music_type`). Normalize to underscore so the
  // separator style can't silently break a translation and fall back to English.
  const normalized = key.replace(/-/g, '_');
  return t(`categories.${normalized}`, { defaultValue: rawLabel });
}

/**
 * Turn a free-text title ("Praise & Worship", "Featured Artists") into a stable
 * i18n slug ("praise-worship", "featured-artists"): lowercase, drop `&`, collapse
 * any run of non-alphanumerics to a single hyphen, and trim leading/trailing ones.
 */
export function slugifyTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Localize a dynamic rail title (music-type genre names and section names both
 * surface as `rail.title`). Keyed on the slugified title under `railTitles.*`;
 * falls back to the raw title for anything not in the locale files (e.g. artist
 * names or custom admin sections).
 */
export function localizeTitle(t: TFunction, rawTitle: string): string {
  const slug = slugifyTitle(rawTitle);
  if (!slug) return rawTitle;
  return t(`railTitles.${slug}`, { defaultValue: rawTitle });
}
