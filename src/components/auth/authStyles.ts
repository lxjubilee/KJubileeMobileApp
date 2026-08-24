/**
 * Layout metrics shared by every auth screen.
 *
 * These values were copy-pasted (near byte-identically) into the `StyleSheet` of
 * all five auth screens. Colors still come from `useTheme()` — the palette in
 * `src/theme/colors` already matches what those screens hardcoded — so only the
 * geometry and the two border tints, which have no theme token, live here.
 */
export const AUTH_METRICS = {
  /** Horizontal gutter of the content column. */
  gutter: 22,
  contentPaddingTop: 18,
  /** Breathing room under the tallest step so the last control clears the home bar. */
  contentPaddingBottom: 60,
  /** Text fields and the DOB box. `minHeight`, so large dynamic type grows it. */
  fieldHeight: 56,
  /** Primary call-to-action. */
  ctaHeight: 52,
  radius: 6,
  fieldFontSize: 16,
} as const;

/** Field border: white at full strength while focused, translucent at rest. */
export const AUTH_BORDER = {
  focused: '#FFFFFF',
  idle: 'rgba(255,255,255,0.45)',
  /** Fill behind every field — slightly lifted off the near-black background. */
  fill: 'rgba(255,255,255,0.04)',
} as const;