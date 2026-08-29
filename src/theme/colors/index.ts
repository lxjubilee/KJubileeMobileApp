/**
 * Color tokens. Dark theme is the default and only theme shipped now, but the
 * shape is a palette object so a `lightColors` sibling can be added later and
 * selected by the ThemeProvider without touching any component.
 */
export interface ColorPalette {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  primary: string;
  primaryMuted: string;
  accent: string;
  /** Lighter azure, for a hover/pressed lift on an accent surface. `--accent-hi`. */
  accentHi: string;
  /**
   * Ink for text and glyphs sitting ON an accent fill. White fails contrast on
   * azure (2.6:1); this passes at 7.2:1, which is why the site pairs every
   * accent-filled chip and button with a near-black.
   */
  accentInk: string;
  /**
   * Broadcast green. Not a brand colour and deliberately outside the blue
   * system — the site's own CSS calls it "the one colour on the page that
   * carries a meaning of its own rather than a brand".
   */
  onAir: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  icon: string;
  iconMuted: string;
  success: string;
  danger: string;
  overlay: string;
  tabBar: string;
  miniPlayer: string;
  skeleton: string;
}

/**
 * Mirrors the `:root` custom properties in the website's
 * `public/css/pages/home.css`, so the two surfaces share one blue-on-black
 * system rather than drifting apart.
 */
export const darkColors: ColorPalette = {
  // Four values off the site's pure `#000`, and kept that way on purpose: the
  // hero's bottom scrim terminates on exactly rgba(11,11,15,…), so moving this
  // would open a seam under the banner for an imperceptible gain.
  background: '#0B0B0F',
  backgroundElevated: '#15151C',
  surface: '#1C1C26',
  surfaceAlt: '#26263340',
  border: '#2A2A36',
  // `primary` was a purple (#7C4DFF) the website has no equivalent for. It is not
  // decorative: both navigators hand it to React Navigation, so it tinted ripples
  // and focus rings app-wide. Pointed at the brand azure rather than deleted,
  // because the navigation theme requires the key.
  primary: '#3DA5FF',
  primaryMuted: '#1B6FB8', // `--accent-lo`
  // `--accent`. Raised from #007FFF to the site's value, which is also the better
  // of the two here: 7.51:1 on this background against 5.13:1.
  accent: '#3DA5FF',
  accentHi: '#7CC4FF',
  accentInk: '#04121F',
  onAir: '#46D07A',
  text: '#FFFFFF',
  textSecondary: '#C7C7D1',
  textMuted: '#8A8A99',
  icon: '#FFFFFF',
  iconMuted: '#8A8A99',
  success: '#1DB954',
  danger: '#FF4D5E',
  overlay: 'rgba(0,0,0,0.6)',
  tabBar: '#0E0E14',
  miniPlayer: '#1A1A24',
  skeleton: '#22222E',
};

export type ThemeColors = ColorPalette;
