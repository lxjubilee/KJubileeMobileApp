import { TextStyle } from 'react-native';

/**
 * Typography scale. Using a fixed set of named variants keeps text consistent
 * across screens and makes a global type change a one-file edit.
 */
export type TypographyVariant =
  | 'displayLg'
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption';

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const typography: Record<TypographyVariant, TextStyle> = {
  displayLg: { fontSize: 34, lineHeight: 40, fontWeight: fontWeights.bold },
  display: { fontSize: 28, lineHeight: 34, fontWeight: fontWeights.bold },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: fontWeights.bold },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: fontWeights.semibold },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: fontWeights.semibold },
  body: { fontSize: 15, lineHeight: 21, fontWeight: fontWeights.regular },
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: fontWeights.regular },
  label: { fontSize: 13, lineHeight: 16, fontWeight: fontWeights.semibold },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: fontWeights.medium },
};
