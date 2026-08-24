// Local persona hero-banner slides keyed by Artist.id (manifest slug). Only the
// Jubilee Inspire family has these wide banners; every other artist has none and
// falls back to the portrait/CDN hero. React Native require() needs string
// literals, so this map is explicit rather than generated (mirrors personaImages).
// Root-level assets/ is bundled (see BrandLogo / personaImages).
const HERO_BANNER_IMAGES: Record<string, number> = {
  'amir-inspire': require('../../assets/hero-banner/Slide-Amir.webp'),
  'caleb-inspire': require('../../assets/hero-banner/Slide-Caleb.webp'),
  // The slide file spells it "Elina"; the artist id / portrait spell it "Eliana".
  'eliana-inspire': require('../../assets/hero-banner/Slide-Elina.webp'),
  'elias-inspire': require('../../assets/hero-banner/Slide-Elias.webp'),
  'imani-inspire': require('../../assets/hero-banner/Slide-Imani.webp'),
  'jubilee-inspire': require('../../assets/hero-banner/Slide-Inspire.webp'),
  'melody-inspire': require('../../assets/hero-banner/Slide-Melody.webp'),
  'nova-inspire': require('../../assets/hero-banner/Slide-Nova.webp'),
  'santiago-inspire': require('../../assets/hero-banner/Slide-Santiago.webp'),
  'tahoma-inspire': require('../../assets/hero-banner/Slide-Tahoma.webp'),
  'zariah-inspire': require('../../assets/hero-banner/Slide-Zariah.webp'),
  'zev-inspire': require('../../assets/hero-banner/Slide-Zev.webp'),
};

/** Local wide hero-banner slide for an artist id, or undefined to fall back. */
export function heroBannerImage(artistId?: string | null): number | undefined {
  return artistId ? HERO_BANNER_IMAGES[artistId] : undefined;
}
