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

export const darkColors: ColorPalette = {
  background: '#0B0B0F',
  backgroundElevated: '#15151C',
  surface: '#1C1C26',
  surfaceAlt: '#26263340',
  border: '#2A2A36',
  primary: '#7C4DFF', // KJubilee purple accent
  primaryMuted: '#4A2FA0',
  accent: '#007FFF', // KJubilee Azure blue — play CTAs & now-playing highlight
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
