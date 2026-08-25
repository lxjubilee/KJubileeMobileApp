import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { stationArt } from '@/assets/radio/stationArt';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import type { RadioStation } from '@/services/radio';

/**
 * A large featured card at the top of Home.
 *
 * The spec's brief for the hero is "one tap starts audio and docks the player" —
 * so the whole card tunes, and the play control is a target rather than the only
 * one. Cover art is bundled and keyed by slug; a station without one falls back
 * to its gradient pair, which is what the website paints when artwork 404s.
 */

interface Props {
  station: RadioStation;
  width: number;
  playing: boolean;
  onPress: (station: RadioStation) => void;
}

export const FeaturedStation: React.FC<Props> = React.memo(
  ({ station, width, playing, onPress }) => {
    const theme = useTheme();
    const c = theme.colors;
    const live = station.live;
    const art = stationArt(station.slug);

    return (
      <Pressable
        onPress={() => onPress(station)}
        disabled={!live}
        accessibilityRole="button"
        accessibilityLabel={
          live ? `Play ${station.name}, HM ${station.hm}` : `${station.name}, coming soon`
        }
        style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }, styles.wrap]}
      >
        <View style={styles.card}>
          {/* Gradient under the cover: it shows through for a station with no
              artwork, and covers the load-in for one that has it. */}
          <LinearGradient
            colors={station.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {art ? (
            <Image
              source={art}
              style={[StyleSheet.absoluteFill, !live && styles.dimmed]}
              contentFit="cover"
              contentPosition="top"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : null}
          {/* A scrim, or white type lands on whatever the photo happens to be. */}
          <LinearGradient
            colors={['rgba(0,0,0,0.28)', 'transparent', 'rgba(0,0,0,0.78)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.inner}>
          <View style={styles.top}>
            <View style={[styles.badge, { backgroundColor: playing ? c.accent : '#00000059' }]}>
              {live ? <View style={[styles.dot, { backgroundColor: playing ? '#FFFFFF' : c.danger }]} /> : null}
              <AppText style={styles.badgeText}>
                {playing ? 'PLAYING' : live ? 'ON AIR' : 'COMING SOON'}
              </AppText>
            </View>
          </View>

          <View>
            {/* Orbitron encodes its own weight — adding fontWeight makes Android
                drop the family and fall back to system sans. */}
            <Text allowFontScaling={false} style={styles.hm}>
              HM {station.hm}
            </Text>
            <AppText numberOfLines={1} style={styles.name}>
              {station.name}
            </AppText>
            <View style={styles.footer}>
              <AppText numberOfLines={1} style={styles.format}>
                {station.format}
                {station.host ? `  ·  ${station.host.name}` : ''}
              </AppText>
              {live ? (
                <View style={[styles.play, { backgroundColor: c.text }]}>
                  <Ionicons
                    name={playing ? 'pause' : 'play'}
                    size={20}
                    color={c.background}
                    style={playing ? undefined : styles.playGlyph}
                  />
                </View>
              ) : null}
            </View>
          </View>
          </View>
        </View>
      </Pressable>
    );
  },
);
FeaturedStation.displayName = 'FeaturedStation';

const styles = StyleSheet.create({
  wrap: { marginRight: 12 },
  // 16:9-ish, matching the shape of the cover art it carries.
  card: { height: 194, borderRadius: 14, overflow: 'hidden' },
  inner: { flex: 1, padding: 16, justifyContent: 'space-between' },
  dimmed: { opacity: 0.38 },
  top: { flexDirection: 'row' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    height: 22,
    borderRadius: 11,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9.5, letterSpacing: 1.3, color: '#FFFFFF' },
  hm: {
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  name: { fontSize: 22, color: '#FFFFFF', marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  format: { fontSize: 12.5, color: 'rgba(255,255,255,0.82)', flexShrink: 1, marginRight: 12 },
  play: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  // The play triangle's own bearing sits it left of centre in the circle.
  playGlyph: { marginLeft: 3 },
});
