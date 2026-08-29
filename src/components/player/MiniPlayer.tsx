import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/context';
import { usePlayer, useRadio, useSafeProgress } from '@/hooks';
import {
  getSchedule,
  getStationBySlug,
  getStations,
  pause,
  tune,
  toggle as toggleRadio,
} from '@/services/radio';
import { radioBarDismissal } from './radioBarDismissal';
import { stationArt } from '@/assets/radio/stationArt';
import { AppText } from '../common/AppText';
import { Artwork } from '../common/Artwork';
import { IconButton } from '../common/IconButton';

interface MiniPlayerProps {
  /** Opens the full Music Player (wired by the navigation wrapper). */
  onPress: () => void;
}

/**
 * Persistent now-playing bar shown above the tab bar on every screen. Renders
 * nothing when nothing is loaded. Tapping it opens the full player.
 *
 * ONE BAR, TWO SOURCES. It used to read `usePlayer()` alone and return null on
 * an empty queue — and radio never fills that queue, so the whole footer simply
 * vanished during a broadcast, which is the state the app is in most of the
 * time. The music queue still wins when it holds something (it is the more
 * specific thing the user just started); radio is the fallback.
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const theme = useTheme();
  const { currentTrack, isPlaying, isBuffering, toggle, next, stop } = usePlayer();
  const radio = useRadio();
  const { position, duration } = useSafeProgress(500);

  if (!currentTrack) return <RadioBar theme={theme} radio={radio} />;

  const pct = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: theme.colors.miniPlayer, borderRadius: theme.radius.md },
      ]}
    >
      <View style={styles.content}>
        <Artwork
          uri={currentTrack.artwork}
          style={[styles.art, { borderRadius: theme.radius.sm }]}
          iconSize={20}
        />
        <View style={styles.meta}>
          <AppText variant="h3" numberOfLines={1}>
            {currentTrack.title}
          </AppText>
          <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
            {currentTrack.artistName}
          </AppText>
        </View>
        {isBuffering ? (
          <View style={[styles.control, styles.spinner]}>
            <ActivityIndicator size="small" color={theme.colors.text} />
          </View>
        ) : (
          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            onPress={toggle}
            style={styles.control}
          />
        )}
        <IconButton name="play-skip-forward" size={22} onPress={next} style={styles.control} />
        {/* Close: stop playback and dismiss the bar. */}
        <IconButton name="close" size={22} onPress={stop} style={styles.control} />
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct * 100}%`, backgroundColor: theme.colors.text },
          ]}
        />
      </View>
    </Pressable>
  );
};

/**
 * The broadcast half of the bar, laid out after the website's `#kj-player`:
 * artwork with the frequency struck across it, the station in bold, the track
 * as `Title (Album)`, then `HM 305.40 (Angel Songs)`, and a STREAMING lamp.
 *
 * Two of the site's controls are deliberately absent. Volume belongs to the
 * hardware keys on a phone, and "fullscreen" is what tapping the bar already
 * does. There is no seek bar either — and that is not an omission: a live
 * broadcast has no position the listener can move.
 */
const RadioBar: React.FC<{
  theme: ReturnType<typeof useTheme>;
  radio: ReturnType<typeof useRadio>;
}> = ({ theme, radio }) => {
  const c = theme.colors;
  const dismissed = useSyncExternalStore(
    radioBarDismissal.subscribe,
    radioBarDismissal.get,
    radioBarDismissal.get,
  );
  // Not the `onPress` the music bar takes. That one opens MusicPlayer, which
  // reads the album queue — empty during a broadcast, so it would open onto
  // nothing. The station's own page is the full view of what is sounding.
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const station = radio.slug ? getStationBySlug(radio.slug) : undefined;

  /**
   * Where the current entry is, derived from the clock.
   *
   * NOT from track-player's `useProgress`, which was the obvious choice and
   * reports `duration: 0` for these files — they stream progressively off the
   * CDN and RNTP has no duration to give until it has one, so the bar sat
   * empty. The day file has both numbers up front and `dayFor()` caches it per
   * tenant for fifteen minutes, so this costs a map lookup after the first
   * track and re-derives from the clock every second regardless.
   */
  const [entry, setEntry] = useState<{ startsAt: number; durationSec: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tenant = station?.tenant;
  const trackTitle = radio.track?.title;

  useEffect(() => {
    let alive = true;
    if (!tenant) {
      setEntry(null);
      return () => {
        alive = false;
      };
    }
    getSchedule(tenant)
      .then((sc) => {
        const on = sc?.entries.find((e) => e.current);
        if (alive) setEntry(on ? { startsAt: on.startsAt, durationSec: on.durationSec } : null);
      })
      .catch(() => alive && setEntry(null));
    return () => {
      alive = false;
    };
  }, [tenant, trackTitle]);

  useEffect(() => {
    if (!entry) return undefined;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [entry]);

  const pct = entry
    ? Math.min(1, Math.max(0, (nowMs - entry.startsAt) / (entry.durationSec * 1000)))
    : 0;

  // Every hook above this line runs on every render — the schedule tick has to
  // keep its slot in the list whether or not the bar is on screen, so the exit
  // comes last.
  if (!station || dismissed) return null;

  const art = stationArt(station.slug);
  const track = radio.track;

  /**
   * Step one station along the dial.
   *
   * NOT previous/next track — a broadcast has no next track to jump to, and
   * offering one would be a control that lies. The website had this same
   * argument with itself and wrote the conclusion down in
   * `kj-footer-player.js`: the buttons were pulled once for being queue-like,
   * then restored, because ON AIR is sorted by frequency and stepping it is
   * turning the dial one station — exactly what the buttons either side of a
   * tuner's play button have always done.
   *
   * They wrap, in the site's words, "because a band with an end you can fall
   * off is not a band".
   */
  const step = (dir: 1 | -1): void => {
    const live = getStations();
    if (!live.length) return;
    const at = live.findIndex((st) => st.slug === station.slug);
    const next = live[((at < 0 ? 0 : at + dir) + live.length) % live.length];
    void tune(next.slug);
  };

  return (
    <Pressable
      onPress={() => navigation.navigate('StationDetail', { slug: station.slug })}
      accessibilityRole="button"
      accessibilityLabel={`${station.name}. ${track ? `${track.title} by ${track.artist}` : ''}`}
      style={[
        styles.container,
        { backgroundColor: c.miniPlayer, borderRadius: theme.radius.md },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.art, { borderRadius: theme.radius.sm, overflow: 'hidden' }]}>
          {art ? <Image source={art} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          {/* The frequency reads over the artwork, as it does on the site's
              thumb — it is the station's identity, so it travels with the art
              rather than queueing behind the name for horizontal space. */}
          <View style={styles.hmStrip}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.hmText}>
              {station.hm}
            </Text>
          </View>
        </View>

        <View style={styles.meta}>
          <AppText variant="h3" numberOfLines={1}>
            {station.name}
          </AppText>
          <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
            {track ? `${track.title}${track.album ? ` (${track.album})` : ''}` : 'Tuning…'}
          </AppText>
          <View style={styles.stationLine}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.freq, { color: c.accent }]}
            >
              HM {station.hm}
            </Text>
            <AppText variant="bodySm" color="textMuted" numberOfLines={1} style={styles.format}>
              ({station.format})
            </AppText>
          </View>
        </View>

        <IconButton
          name="play-skip-back"
          size={20}
          onPress={() => step(-1)}
          style={styles.step}
          accessibilityLabel="Previous station"
        />
        {radio.loading ? (
          <View style={[styles.control, styles.spinner]}>
            <ActivityIndicator size="small" color={c.text} />
          </View>
        ) : (
          <IconButton
            name={radio.playing ? 'pause' : 'play'}
            size={26}
            onPress={() => void toggleRadio(station.slug)}
            style={styles.control}
            accessibilityLabel={radio.playing ? 'Pause' : 'Play'}
          />
        )}
        <IconButton
          name="play-skip-forward"
          size={20}
          onPress={() => step(1)}
          style={styles.step}
          accessibilityLabel="Next station"
        />
        {/* Close means CLOSE. It used to call `pause()` alone, which silenced
            the station and left the bar sitting there — the button looked
            broken because nothing it was named for happened. Stopping as well
            as hiding is the honest reading: a hidden bar with a station still
            sounding behind it would leave no way to stop it. */}
        <IconButton
          name="close"
          size={22}
          onPress={() => {
            void pause();
            radioBarDismissal.dismiss();
          }}
          style={styles.control}
          accessibilityLabel="Close player"
        />
      </View>

      {/* The position of the track that is sounding.
          NOT a seek bar — there is nowhere to seek to on a broadcast, so it
          takes no touches. */}
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View
          style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: c.accent }]}
        />
      </View>

      {/* The site's `STREAMING` lamp, in place of the seek bar a broadcast
          cannot have. It reports; it is not a control. */}
      <View style={[styles.streamRow, { borderTopColor: c.border }]}>
        <View
          style={[
            styles.streamDot,
            { backgroundColor: radio.playing ? c.onAir : c.textMuted },
          ]}
        />
        <Text
          allowFontScaling={false}
          style={[styles.streamText, { color: radio.playing ? c.onAir : c.textMuted }]}
        >
          {radio.error ? 'OFF AIR' : radio.playing ? 'STREAMING' : 'PAUSED'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden', marginHorizontal: 8 },
  content: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  art: { width: 44, height: 44, backgroundColor: '#222' },
  meta: { flex: 1, marginLeft: 10 },
  control: { paddingHorizontal: 6 },
  // Tighter than the play control and visually secondary to it — stepping the
  // dial is a deliberate act, not something to hit while reaching for pause.
  step: { paddingHorizontal: 3, opacity: 0.75 },
  spinner: { width: 26, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 2, width: '100%' },
  progressFill: { height: 2 },

  hmStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingVertical: 1,
  },
  hmText: {
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 8.5,
    // Explicit: the default line box is far taller than a 1pt-padded strip, so
    // the digits sit low without it.
    lineHeight: 11,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },

  stationLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  freq: { fontFamily: 'Orbitron_600SemiBold', fontSize: 10, lineHeight: 14 },
  // Yields the row so a long format name truncates rather than pushing the
  // frequency off the bar.
  format: { flexShrink: 1 },

  streamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 6,
    paddingTop: 5,
  },
  streamDot: { width: 5, height: 5, borderRadius: 2.5 },
  streamText: { fontSize: 8.5, lineHeight: 11, fontWeight: '700', letterSpacing: 0.9 },
});
