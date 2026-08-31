import React from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/context';

/**
 * Wordmark span colors, mirrored from the KJubilee.com web header: the outer
 * spans are white and the middle highlight is the brand azure blue (kept in
 * sync with `theme.colors.accent`).
 */
const WHITE = '#FFFFFF';
// `.logo-accent{color:var(--accent)}` on the web header.

interface BrandLogoProps {
  /**
   * Diameter of the circular logo image. Defaults to the height of the text
   * beside it — the wordmark plus the tagline when one is shown — so the mark
   * squares off against the block rather than floating next to it.
   */
  size?: number;
  /** Show "The Jubilee Radio Network" under the wordmark, as the web header does. */
  tagline?: boolean;
  /** Style applied to the wordmark text (used for fontSize / letterSpacing). */
  textStyle?: StyleProp<TextStyle>;
  /** Optional style for the wrapping row. */
  style?: StyleProp<ViewStyle>;
}

/**
 * App wordmark: the circular KJubilee logo followed by the "kJubilee.com"
 * text in the Orbitron brand font (loaded in App.tsx, matching the web header)
 * — lowercase "k" + ".com" white, "Jubilee" blue.
 *
 * Pass `textStyle` to control the size per header; `fontWeight` and `color`
 * from it are stripped because the Orbitron_600SemiBold family already encodes
 * the weight (a fontWeight makes Android drop the custom font) and the spans
 * set color.
 */
/** Gap between the wordmark and the tagline under it. */
const TAG_GAP = 2;
/**
 * How much of the text block's height the mark takes. Full height read heavy
 * against the type, so it is pulled in a little and centred on the block.
 */
const MARK_SCALE = 0.88;

export const BrandLogo: React.FC<BrandLogoProps> = ({ size, tagline = false, textStyle, style }) => {
  const theme = useTheme();
  const { fontWeight, fontStyle, color, ...textRest } =
    StyleSheet.flatten<TextStyle>(textStyle) ?? {};

  // `.k{font-size:calc(1em - 2pt)}` on the web, against a 32px wordmark — a
  // ratio rather than a fixed subtraction, so it holds at every size this is
  // rendered at (20 in the auth header, scroll-interpolated on Home).
  const base = typeof textRest.fontSize === 'number' ? textRest.fontSize : 20;

  // The mark is sized from the text rather than by a constant, so it keeps
  // spanning wordmark-top to tagline-bottom at any font size. Both line heights
  // are pinned rather than left to the platform's default, otherwise the number
  // below would only be right on whichever OS was measured.
  const wordLine =
    typeof textRest.lineHeight === 'number' ? textRest.lineHeight : Math.round(base * 1.15);
  const tagSize = Math.round(base * 0.5);
  const tagLine = Math.round(tagSize * 1.3);
  const textBlock = tagline ? wordLine + TAG_GAP + tagLine : wordLine;
  const markSize = size ?? Math.round(textBlock * MARK_SCALE);

  return (
    <View style={[styles.row, style]}>
      <Image
        source={require('../../../assets/KJubilee-app-logo.png')}
        style={[styles.logo, { width: markSize, height: markSize }]}
        resizeMode="contain"
      />
      <View style={styles.stack}>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[textRest, styles.wordmark, { lineHeight: wordLine }]}
        >
          <Text style={[styles.white, { fontSize: Math.round(base * 0.92) }]}>K</Text>
          <Text style={{ color: theme.colors.accent }}>Jubilee</Text>
          <Text style={styles.white}>.com</Text>
        </Text>
        {tagline ? (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[styles.tagline, { fontSize: tagSize, lineHeight: tagLine }]}
          >
            The Jubilee Radio Network
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // `flexShrink` so a narrow header squeezes the wordmark rather than letting it
  // run into whatever sits beside it; the logo itself keeps its full diameter.
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  logo: { marginRight: 8, flexShrink: 0 },
  // Orbitron_600SemiBold already encodes weight 600 — no fontWeight (it makes
  // Android drop the custom font and fall back to the system sans-serif).
  wordmark: { fontFamily: 'Orbitron_600SemiBold', flexShrink: 1 },
  // Column so the tagline sits under the wordmark rather than beside it; the
  // row above still centres the mark against the pair.
  stack: { flexShrink: 1 },
  // Not Orbitron — the web sets the tagline in the body face, and Orbitron at
  // this size is unreadable.
  tagline: { marginTop: TAG_GAP, letterSpacing: 0.3, flexShrink: 1, color: WHITE },
  white: { color: WHITE },
  // colour applied at the call site from the theme
});
