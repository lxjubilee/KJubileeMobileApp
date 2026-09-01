import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkColors } from '@/theme';
import { useAppActive } from '@/hooks/useAppActive';

/**
 * The broadcast-status pill, ported from kjubilee.com.
 *
 * Source of truth is `public/css/pages/home.css` — `.cover-live`, `.cover-soon`
 * and the `pulse` keyframes. Values are transcribed rather than eyeballed:
 *
 *   .cover-live  gap 5 · padding 3/8 · radius 100 · bg rgba(0,0,0,.55)
 *                border 1px #46D07A · 9.5px/700 · letter-spacing .08em
 *   ::before     5x5 dot, #46D07A, animation: pulse 1.8s ease-in-out infinite
 *   svg          9x9, fill currentColor
 *   @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.25 } }
 *
 * Worth stating plainly because the badge reads as though it has one: there is
 * NO box-shadow in the CSS. The halo in a screenshot is green-on-near-black
 * plus JPEG ringing. The whole effect is an opacity pulse on the dot, and
 * adding a glow here would diverge from the site rather than match it.
 *
 * `playing` maps to the site's `:hover` state (`.cover-live[data-kj-play]:hover`),
 * which inverts the pill — green fill, dark ink. A phone has no hover, and
 * "this one is sounding right now" is the nearest true meaning for it.
 */

/** `--onair` in the site's palette. */
export const ON_AIR_GREEN = darkColors.onAir;
/** `--onair-ink` — the text colour once the pill is filled. */
const ON_AIR_INK = darkColors.accentInk;

/** One full cycle of the site's `pulse` keyframes. */
const PULSE_MS = 1800;
/** letter-spacing .08em at 9.5px. RN wants absolute units, the web em-relative. */
const TRACKING = 9.5 * 0.08;

export type OnAirState = 'onAir' | 'playing' | 'soon';

interface Props {
  state: OnAirState;
  /**
   * The pill's text. Passed in rather than derived so each surface keeps the
   * wording it already had — the hero has room for "COMING SOON", a 152pt tile
   * does not.
   */
  label: string;
  style?: StyleProp<ViewStyle>;
}

export const OnAirBadge: React.FC<Props> = React.memo(({ state, label, style }) => {
  const soon = state === 'soon';
  const playing = state === 'playing';
  const opacity = useRef(new Animated.Value(1)).current;
  // Not merely to save power: an indefinite native-driver loop that spans a
  // screen-off crashes the app on resume. See `useAppActive`.
  const appActive = useAppActive();

  useEffect(() => {
    if (soon || !appActive) return undefined;
    // `useNativeDriver` is the whole reason this is safe to run on every visible
    // card at once: the loop is handed to the UI thread and never touches JS
    // again, so it cannot compete with playback or a scroll gesture.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      opacity.setValue(1);
    };
  }, [soon, appActive, opacity]);

  const fg = soon ? 'rgba(255,255,255,0.62)' : playing ? ON_AIR_INK : ON_AIR_GREEN;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: soon ? 'rgba(0,0,0,0.5)' : playing ? ON_AIR_GREEN : 'rgba(0,0,0,0.55)',
          borderColor: soon ? 'rgba(255,255,255,0.22)' : ON_AIR_GREEN,
        },
        style,
      ]}
      // One label for the whole pill; the dot and glyph are decoration.
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {soon ? null : (
        <>
          <Animated.View style={[styles.dot, { backgroundColor: fg, opacity }]} />
          <Ionicons name="play" size={9} color={fg} />
        </>
      )}
      <Text allowFontScaling={false} style={[styles.label, { color: fg }]}>
        {label}
      </Text>
    </View>
  );
});
OnAirBadge.displayName = 'OnAirBadge';

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    // The site uses 100px, i.e. "however round it needs to be".
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: {
    fontSize: 9.5,
    // Explicit, and deliberately close to the font size: the default line box
    // is far taller than a 3pt-padded pill, which pushes the text off-centre.
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: TRACKING,
    // Android reserves room for the font's own ascent/descent; without this the
    // label sits low no matter how the flex box is aligned. Ignored on iOS.
    includeFontPadding: false,
    textAlignVertical: 'center',
    // letterSpacing is applied after the final character too.
    marginRight: -TRACKING,
  },
});
