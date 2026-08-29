import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, OnAirBadge } from '@/components/common';
import { useTheme } from '@/context';
import { stationArt } from '@/assets/radio/stationArt';
import type { RadioStation } from '@/services/radio';

/**
 * One station as a list row — the unit of the All Stations list.
 *
 * A row, not a tile, because this surface answers "where is the specific one I
 * want": the dial number has to be scannable down a column, and a station needs
 * to show its format, host and language at once. Tiles are Home's job.
 */

export const ROW_HEIGHT = 72;
const THUMB_W = 68;

interface Props {
  station: RadioStation;
  playing: boolean;
  onPress: (station: RadioStation) => void;
}

export const StationRow: React.FC<Props> = React.memo(({ station, playing, onPress }) => {
  const theme = useTheme();
  const c = theme.colors;
  const live = station.live;
  const art = stationArt(station.slug);

  return (
    <Pressable
      onPress={() => onPress(station)}
      disabled={!live}
      accessibilityRole="button"
      accessibilityState={{ disabled: !live }}
      accessibilityLabel={
        live
          ? `${station.name}, HM ${station.hm}, ${station.format}, ${station.lang}`
          : `${station.name}, coming soon`
      }
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.thumb, { borderColor: playing ? c.accent : 'transparent' }]}>
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
            transition={140}
            cachePolicy="memory-disk"
          />
        ) : null}
      </View>

      <View style={styles.body}>
        <AppText numberOfLines={1} style={[styles.name, { color: live ? c.text : c.textMuted }]}>
          {station.name}
        </AppText>
        <View style={styles.metaRow}>
          {/* Orbitron carries its own weight — a fontWeight here makes Android
              drop the family and fall back to system sans. */}
          <Text
            allowFontScaling={false}
            style={[styles.hm, { color: live ? c.textSecondary : c.textMuted }]}
          >
            {station.hm}
          </Text>
          <AppText numberOfLines={1} style={[styles.meta, { color: c.textMuted }]}>
            {`· ${station.format}${station.lang ? ` · ${station.lang}` : ''}`}
          </AppText>
        </View>
      </View>

      {/* The shared badge, identical to Home's and to the site's `.cover-live`.
          This row used to draw its own — a static dot in `danger` red — so the
          same station reported ON AIR in red here and in green one tab away.
          Red also said the wrong thing: it is the palette's ERROR colour, and
          the site's on-air green (#46D07A) is a different token for a reason.

          `alignSelf` because the component defaults to `flex-start` for the
          overlay it was built for; in a 72pt row it needs centring. */}
      <OnAirBadge
        state={playing ? 'playing' : live ? 'onAir' : 'soon'}
        label={playing ? 'PLAYING' : live ? 'ON AIR' : 'COMING SOON'}
        style={styles.badge}
      />
    </Pressable>
  );
});
StationRow.displayName = 'StationRow';

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  thumb: {
    width: THUMB_W,
    height: Math.round((THUMB_W / 16) * 9),
    borderRadius: 6,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  dimmed: { opacity: 0.38 },
  body: { flex: 1 },
  name: { fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  hm: { fontFamily: 'Orbitron_600SemiBold', fontSize: 12, lineHeight: 16, marginRight: 5 },
  meta: { fontSize: 12, flexShrink: 1 },
  badge: { alignSelf: 'center' },
});
