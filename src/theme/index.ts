import { darkColors, ThemeColors } from './colors';
import { typography, fontWeights } from './typography';
import { spacing, radius, shadows } from './spacing';

export interface Theme {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  typography: typeof typography;
  fontWeights: typeof fontWeights;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
}

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  typography,
  fontWeights,
  spacing,
  radius,
  shadows,
};

/** Default theme used app-wide. Light theme can be added here later. */
export const defaultTheme = darkTheme;

export * from './colors';
export * from './typography';
export * from './spacing';
