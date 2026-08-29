import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text } from 'react-native';
import { useFonts, Orbitron_600SemiBold } from '@expo-google-fonts/orbitron';
import { darkColors } from '@/theme';

interface SplashScreenProps {
  /** Called once the intro animation completes and the app should be revealed. */
  onFinish: () => void;
}

/** Wordmark span colors — "K" + ".com" white, "Jubilee" blue (matches header). */
const WHITE = '#FFFFFF';
// This mounts OUTSIDE ThemeProvider (App.tsx renders it as a sibling), so the
// palette is imported rather than read from the hook.
const BLUE = darkColors.accent;

/**
 * Netflix-style intro splash: the KJubilee logo and "KJubilee.com" wordmark
 * (Orbitron brand font) settle in (scale + fade), hold, then zoom toward the
 * viewer while the black overlay fades out, revealing the app. Uses RN Animated
 * (native driver) so it runs in Expo Go.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const scale = useRef(new Animated.Value(1.25)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Gate the intro on the Orbitron brand font: the wordmark stays hidden (group
  // opacity starts at 0) until the font is ready, so it never flashes in the
  // system fallback font. A short safety timeout starts the intro anyway if the
  // (bundled, normally-instant) font ever fails to report — the splash must
  // always reveal the app. `useFonts` dedupes with App's own font load.
  const [fontLoaded, fontError] = useFonts({ Orbitron_600SemiBold });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (fontLoaded || fontError) {
      setReady(true);
      return undefined;
    }
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, [fontLoaded, fontError]);

  useEffect(() => {
    if (!ready) return undefined; // hold the intro until the brand font is ready
    const animation = Animated.sequence([
      // 1. Logo + wordmark settle in.
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 45,
          useNativeDriver: true,
        }),
      ]),
      // 2. Hold.
      Animated.delay(550),
      // 3. Zoom into the wordmark while the overlay fades to reveal the app.
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 14,
          duration: 650,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 650,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [ready, scale, opacity, overlayOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity }]} pointerEvents="none">
      <Animated.View style={[styles.group, { opacity, transform: [{ scale }] }]}>
        <Image
          source={require('../../assets/KJubilee-app-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {ready ? (
          <Text style={styles.wordmark} allowFontScaling={false}>
            <Text style={styles.white}>K</Text>
            <Text style={styles.blue}>Jubilee</Text>
            <Text style={styles.white}>.com</Text>
          </Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  group: { alignItems: 'center' },
  logo: { width: 132, height: 132, marginBottom: 18 },
  // Orbitron_600SemiBold already encodes weight 600 — no fontWeight (it makes
  // Android drop the custom font and fall back to the system sans-serif).
  wordmark: {
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 30,
    letterSpacing: 1,
    // Glow tracks the wordmark highlight (BLUE) so the halo isn't off-brand.
    textShadowColor: 'rgba(0,127,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  white: { color: WHITE },
  blue: { color: BLUE },
});
