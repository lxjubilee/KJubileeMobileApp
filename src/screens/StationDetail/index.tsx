import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, AppText, IconButton } from '@/components/common';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import {
  getStationBySlug,
  getAllStations,
  getSchedule,
  toggle,
  tune,
} from '@/services/radio';
import type { RadioStation, Schedule } from '@/services/radio';
import { stationArt } from '@/assets/radio/stationArt';
import { StationTile } from '@/screens/Home/components/StationTile';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

/**
 * The station page — what a listener reads about a station.
 *
 * The app had no such surface: tapping a tile went straight to the Dial, which
 * plays a station but says nothing about it. The website's tiles have always
 * linked to a station page, and the spec (8.2) treats it as core.
 *
 * The schedule is the reason it is worth opening. Because a station is a
 * published day file rather than a stream, the whole day is already on the
 * device — so "on now" and the next dozen tracks cost one fetch and no API.
 * A live stream cannot offer this at all: nothing downstream of it knows what
 * comes next.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
const HEADER_HEIGHT = 38;

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const StationDetailScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'StationDetail'>['route']>();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const radio = useRadio();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const station = useMemo(() => getStationBySlug(params.slug), [params.slug]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const here = radio.slug === station?.slug;
  const sounding = here && radio.playing;

  // Re-read the guide when the engine reports a new track: the entry that was
  // "on now" has just become the one before it.
  const trackTitle = radio.track?.title;

  useEffect(() => {
    if (!station?.tenant) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    getSchedule(station.tenant)
      .then((s) => {
        if (!alive) return;
        setSchedule(s);
        setScheduleError(s ? null : 'Nothing scheduled right now.');
      })
      .catch(() => alive && setScheduleError('Could not load the schedule.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [station?.tenant, trackTitle]);

  /** Stations that share this one's host, else its format — "more like this". */
  const related = useMemo(() => {
    if (!station) return [];
    const all = getAllStations().filter((s) => s.slug !== station.slug);
    const byHost = station.host ? all.filter((s) => s.host?.id === station.host?.id) : [];
    const byFormat = all.filter((s) => s.format === station.format);
    const seen = new Set<string>();
    return [...byHost, ...byFormat]
      .filter((s) => (seen.has(s.slug) ? false : (seen.add(s.slug), true)))
      .slice(0, 10);
  }, [station]);

  const onPlay = useCallback(() => {
    if (!station?.live) return;
    if (here) void toggle(station.slug);
    else void tune(station.slug);
  }, [station, here]);

  if (!station) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText color="textMuted">Station not found.</AppText>
        </View>
      </Screen>
    );
  }

  const c = theme.colors;
  const art = stationArt(station.slug);
  const heroH = Math.round((width / 16) * 9);
  const onNow = schedule?.entries.find((e) => e.current);
  const upNext = schedule?.entries.filter((e) => !e.current) ?? [];

  return (
    <Screen safeArea={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
      >
        {/* ---- hero ---- */}
        <View style={{ height: heroH }}>
          <LinearGradient
            colors={station.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {art ? (
            <Image
              source={art}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              // Top-anchored for the same reason the tiles are: a centred crop
              // takes the top off whoever is on the cover.
              contentPosition="top"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : null}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', c.background]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: station.live ? `${c.danger}22` : c.surface, borderColor: station.live ? `${c.danger}66` : c.border },
              ]}
            >
              {station.live ? <View style={[styles.dot, { backgroundColor: c.danger }]} /> : null}
              <AppText style={[styles.badgeText, { color: station.live ? c.danger : c.textMuted }]}>
                {sounding ? 'PLAYING' : station.live ? 'ON AIR' : 'COMING SOON'}
              </AppText>
            </View>
            <AppText style={[styles.pill, { color: c.textMuted }]}>{station.pill}</AppText>
          </View>

          {/* Orbitron encodes its own weight — a fontWeight makes Android drop
              the family and fall back to system sans. */}
          <Text allowFontScaling={false} style={[styles.hm, { color: c.textSecondary }]}>
            HM {station.hm}
          </Text>
          <AppText style={[styles.name, { color: c.text }]}>{station.name}</AppText>
          <AppText style={[styles.format, { color: c.textSecondary }]}>
            {station.format} · {station.lang}
            {station.tracks ? ` · ${station.tracks.toLocaleString()} tracks` : ''}
          </AppText>

          {station.live ? (
            <Pressable
              onPress={onPlay}
              accessibilityRole="button"
              accessibilityLabel={sounding ? 'Pause' : 'Play'}
              style={({ pressed }) => [
                styles.playBtn,
                { backgroundColor: c.text, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons
                name={sounding ? 'pause' : 'play'}
                size={20}
                color={c.background}
                style={sounding ? undefined : styles.playGlyph}
              />
              <AppText style={[styles.playText, { color: c.background }]}>
                {sounding ? 'Pause' : 'Listen live'}
              </AppText>
            </Pressable>
          ) : null}

          {/* ---- on now ---- */}
          {station.live ? (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <AppText style={[styles.cardLabel, { color: c.textMuted }]}>ON NOW</AppText>
              {loading ? (
                <ActivityIndicator size="small" color={c.textMuted} style={styles.loader} />
              ) : onNow ? (
                <>
                  <AppText numberOfLines={2} style={[styles.nowTitle, { color: c.text }]}>
                    {onNow.title}
                  </AppText>
                  <AppText numberOfLines={1} style={[styles.nowArtist, { color: c.textSecondary }]}>
                    {onNow.artist}
                  </AppText>
                  {/* A live broadcast has no seek bar, but it does have a known
                      position inside the current entry — so the bar reports,
                      it does not invite a drag. */}
                  <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: c.accent,
                          width: `${Math.min(100, (onNow.into / onNow.durationSec) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </>
              ) : (
                <AppText style={[styles.muted, { color: c.textMuted }]}>
                  {scheduleError ?? 'Nothing scheduled right now.'}
                </AppText>
              )}
            </View>
          ) : null}

          {/* ---- up next ---- */}
          {upNext.length ? (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: c.text }]}>Up Next</AppText>
              {upNext.map((e) => (
                <View key={e.key} style={[styles.row, { borderColor: c.border }]}>
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={[styles.rowTime, { color: c.textMuted }]}
                  >
                    {clock(e.startsAt)}
                  </Text>
                  <View style={styles.rowBody}>
                    <AppText numberOfLines={1} style={[styles.rowTitle, { color: c.text }]}>
                      {e.title}
                    </AppText>
                    <AppText numberOfLines={1} style={[styles.rowArtist, { color: c.textMuted }]}>
                      {e.artist}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* ---- story ---- */}
          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: c.text }]}>About</AppText>
            <AppText style={[styles.story, { color: c.textSecondary }]}>
              {station.description}
            </AppText>
          </View>

          {/* ---- host ---- */}
          {station.host ? (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: c.text }]}>Hosted by</AppText>
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <AppText style={[styles.hostName, { color: c.text }]}>{station.host.name}</AppText>
                <AppText style={[styles.hostFocus, { color: c.textMuted }]}>
                  {station.host.focus}
                </AppText>
              </View>
            </View>
          ) : null}

          {/* ---- related ---- */}
          {related.length ? (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: c.text }]}>Related stations</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {related.map((s: RadioStation) => (
                  <StationTile
                    key={s.slug}
                    station={s}
                    playing={radio.playing && radio.slug === s.slug}
                    onPress={(picked) =>
                      navigation.push('StationDetail', { slug: picked.slug })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Pinned back button — outside the scroll so it never scrolls away. */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, marginTop: -34 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9.5, letterSpacing: 1.3 },
  pill: { fontSize: 11, letterSpacing: 1 },

  hm: { fontFamily: 'Orbitron_600SemiBold', fontSize: 15, lineHeight: 20, marginTop: 14 },
  name: { fontSize: 28, marginTop: 4 },
  format: { fontSize: 13.5, marginTop: 6 },

  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
    marginTop: 18,
  },
  playGlyph: { marginLeft: 3 },
  playText: { fontSize: 15 },

  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginTop: 20 },
  cardLabel: { fontSize: 9.5, letterSpacing: 1.6 },
  loader: { alignSelf: 'flex-start', marginTop: 10 },
  nowTitle: { fontSize: 17, marginTop: 8 },
  nowArtist: { fontSize: 13, marginTop: 3 },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  muted: { fontSize: 13, marginTop: 8 },

  section: { marginTop: 28 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowTime: { fontFamily: 'Orbitron_600SemiBold', fontSize: 11.5, lineHeight: 16, width: 66 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14.5 },
  rowArtist: { fontSize: 12, marginTop: 2 },

  story: { fontSize: 14, lineHeight: 21 },
  hostName: { fontSize: 16 },
  hostFocus: { fontSize: 13, marginTop: 4 },

  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
});

export default StationDetailScreen;
