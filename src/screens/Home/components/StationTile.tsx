import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import { stationArt } from '@/assets/radio/stationArt';
import type { RadioStation } from '@/services/radio';

/**
 * A station, as a tile on Home.
 *
 * The cover is bundled art keyed by slug (see scripts/build-station-art.mjs).
 * The catalog carries no image field — the website addresses these by slug
 * instead — so a station with no file falls back to its gradient pair, which is
 * what the site paints when artwork 404s.
 *
 * Tiles are 16:9 because the artwork is: cropping a 1672x941 cover to a square
 * throws away a third of every image.
 *
 * Most of the network is announced but not on air. Those tiles are dimmed,
 * labelled, and not pressable — showing the breadth of the network without
 * offering a tap that would do nothing.
 */

export const TILE_W = 184;
/** The covers are 1672x941, so tiles keep 16:9 rather than cropping a third off. */
const ASPECT = 16 / 9;

interface Props {
  station: RadioStation;
  /** Defaults to the shelf width; the "See all" grid passes its column width. */
  width?: number;
  /** True when this station is the one currently sounding. */
  playing?: boolean;
  onPress: (station: RadioStation) => void;
}

export const StationTile: React.FC<Props> = React.memo(
  ({ station, width = TILE_W, playing, onPress }) => {
  const theme = useTheme();
  const c = theme.colors;
  const live = station.live;
  const art = stationArt(station.slug);
  const height = Math.round(width / ASPECT);

  return (
    <Pressable
      onPress={() => onPress(station)}
      disabled={!live}
      accessibilityRole="button"
      accessibilityState={{ disabled: !live }}
      accessibilityLabel={
        live
          ? `${station.name}, HM ${station.hm}, ${station.format}`
          : `${station.name}, coming soon`
      }
      style={({ pressed }) => [styles.wrap, { width, opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[styles.art, { width, height, borderColor: playing ? c.accent : 'transparent' }]}>
        {/* The gradient sits under the cover, so it shows through for a station
            with no artwork and covers the load-in for one that has it. */}
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
            transition={160}
            cachePolicy="memory-disk"
          />
        ) : null}

        {/* A scrim under the dial number — cover art is arbitrary, and white
            type on a bright photo is unreadable without one. */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.overlay}>
          <View style={styles.top}>
            <View style={[styles.badge, { backgroundColor: playing ? c.accent : '#00000073' }]}>
              {live ? (
                <View style={[styles.dot, { backgroundColor: playing ? '#FFFFFF' : c.danger }]} />
              ) : null}
              <AppText style={styles.badgeText}>
                {playing ? 'PLAYING' : live ? 'LIVE' : 'SOON'}
              </AppText>
            </View>
          </View>

          {/* Orbitron carries its own weight — a fontWeight here makes Android
              drop the family and fall back to system sans. */}
          <Text allowFontScaling={false} style={styles.hm}>
            {station.hm}
          </Text>
        </View>
      </View>

      <AppText numberOfLines={1} style={[styles.name, { color: live ? c.text : c.textMuted }]}>
        {station.name}
      </AppText>
      <AppText numberOfLines={1} style={[styles.format, { color: c.textMuted }]}>
        {live ? station.format : 'Coming soon'}
      </AppText>
    </Pressable>
  );
  },
);
StationTile.displayName = 'StationTile';

const styles = StyleSheet.create({
  wrap: { marginRight: 12 },
  art: {
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  // Announced-but-not-on-air reads as "not yet" rather than "broken".
  dimmed: { opacity: 0.38 },
  overlay: { flex: 1, padding: 9, justifyContent: 'space-between' },
  top: { flexDirection: 'row' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    height: 19,
    borderRadius: 10,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 8.5, letterSpacing: 1.1, color: '#FFFFFF' },
  hm: {
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 19,
    lineHeight: 24,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  name: { fontSize: 13.5, marginTop: 8 },
  format: { fontSize: 11.5, marginTop: 2 },
});
