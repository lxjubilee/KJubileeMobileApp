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
import { Screen, AppText } from '@/components/common';
import { FloatingMiniPlayer } from '@/components/player';
import { personaImage } from '@/assets/personaImages';
import { stationArticle } from '@/assets/radio/stationArticles';
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
import { heroArt, stationArt } from '@/assets/radio/stationArt';
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
/**
 * Roughly the footer player's height — the site's `--kj-player-h`, which its
 * hero subtracts so the bar never eats into the picture.
 */
const PLAYER_ALLOWANCE = 118;

/** Rows drawn under Up Next. See `upNext`. */
const UP_NEXT_LIMIT = 4;

const HEADER_HEIGHT = 38;

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const StationDetailScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'StationDetail'>['route']>();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const radio = useRadio();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const station = useMemo(() => getStationBySlug(params.slug), [params.slug]);
  const article = useMemo(() => stationArticle(params.slug), [params.slug]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const here = radio.slug === station?.slug;
  const sounding = here && radio.playing;

  // Re-read the guide when the engine reports a new track: the entry that was
  // "on now" has just become the one before it.
  const trackTitle = radio.track?.title;

  /**
   * Opening a station page tunes it.
   *
   * Playback used to depend on whoever navigated here having called `tune`
   * first, so arriving any other way — a deep link, a back-and-forward — left a
   * station page that never sounded. Keyed on the slug so returning to a page
   * already sounding does not restart it mid-track.
   */
  useEffect(() => {
    if (!station?.live) return;
    if (radio.slug === station.slug && radio.playing) return;
    void tune(station.slug);
    // `radio.playing` is read, not depended on: adding it would re-tune the
    // moment playback paused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station?.slug, station?.live]);

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
  /**
   * Hero-resolution, not the tile copy.
   *
   * The tile asset is 640x360. `cover` on a portrait hero scales to fill the
   * HEIGHT, so on a 1080-wide phone that 360px was being stretched to ~1420 —
   * a 3.9x upscale, which is what the blur was. The master is 1672x941 and
   * brings that to ~1.5x. `heroArt` falls back to the tile copy on its own for
   * a station with no master, so this is safe for every slug.
   */
  const art = heroArt(station.slug) ?? stationArt(station.slug);
  /**
   * A tall box, not a 16:9 strip.
   *
   * The site is explicit about both halves of this, and we had both wrong:
   *
   *   .kja-hero { min-height: calc(100dvh - topbar - player) }
   *     "The hero is the full width of the viewport and MOST OF ITS HEIGHT ...
   *      so arriving on a station feels like arriving somewhere."
   *   .kja-hero-photo { object-position: top center }
   *     "the covers are 16:9 in A MUCH TALLER BOX and a centred crop takes the
   *      faces off."
   *
   * `(width / 16) * 9` made the box the same shape as the source art, so there
   * was no crop to anchor and nothing to arrive at — the banner read as a strip
   * of scenery rather than a portrait, which is what "not properly visible"
   * was.
   *
   * The viewport rule is kept but capped. Taken literally on a 20:9 phone it
   * yields a hero 1.66× as tall as it is wide, well past anything the site
   * renders on a real screen; the cap holds it at the ~1.15 the reference
   * actually shows, and the viewport rule still wins on a short screen.
   */
  const heroH = Math.round(Math.min(height - PLAYER_ALLOWANCE, width * 1.15));
  // Still needed, but only to know where the list of what is COMING starts —
  // the entry itself is no longer drawn here. The footer bar reports it, and
  // reports the position with it.
  const onNow = schedule?.entries.find((e) => e.current);
  /**
   * The next four, not the rest of the day.
   *
   * A day file carries hours of entries, and rendering all of them made a
   * three-line-per-row list the tallest thing on the page — the station itself
   * scrolled away beneath its own timetable. Four is what fits above the fold
   * next to the transport. The DATA is untouched: same `getSchedule()` entries,
   * just fewer drawn.
   */
  const upNext = (schedule?.entries.filter((e) => !e.current) ?? []).slice(0, UP_NEXT_LIMIT);

  return (
    <Screen safeArea={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 124 + insets.bottom }}
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
          {/* A scrim for the floating back pill, so it stays legible over a
              bright corner of the artwork. */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            locations={[0, 0.35]}
            style={styles.heroTopScrim}
          />

          {/* `.kja-hero-overlay` — the site's own gradient, and the reason its
              title block reads as sitting on a dark panel: it reaches .97 at
              the foot, so the picture is still there behind the words without
              competing with them. `align-items:flex-end` on the hero is the
              `justifyContent: 'flex-end'` below. */}
          <LinearGradient
            colors={['transparent', 'rgba(6,6,12,0.86)', 'rgba(6,6,12,0.97)', c.background]}
            // The site's stops are .86 at 45% and .97 at the foot. Reaching
            // near-solid by the chips is the point: the reference has the
            // frequency and the title on flat dark, and a lead paragraph read
            // through someone's shoulder is the "not properly visible" being
            // fixed here, not just the crop.
            locations={[0, 0.42, 0.62, 1]}
            style={styles.heroOverlay}
          >
            {/* No status badge here. The website's station hero carries none —
                its `.cover-live` pill belongs to the cards — and the transport
                below already says whether this station is sounding. */}

            {/* The site's own meta row (`.kja-meta`): the format as a filled
                chip, the host as a second chip, then `HM 308.70 · Five-Fold` in
                plain text. The host chip is not a link here — there is no
                member screen on mobile to send it to. */}
            <View style={styles.metaRow}>
              <View style={[styles.tab, { backgroundColor: c.accent }]}>
                <AppText style={[styles.tabText, { color: c.accentInk }]}>
                  {station.format.toUpperCase()}
                </AppText>
              </View>
              {station.host ? (
                <View style={[styles.tabOutline, { borderColor: c.accent }]}>
                  <AppText style={[styles.tabText, { color: c.accent }]}>
                    {station.host.name.split(' ')[0].toUpperCase()}
                  </AppText>
                </View>
              ) : null}
            </View>

            {/* Orbitron encodes its own weight — a fontWeight makes Android
                drop the family and fall back to system sans. */}
            <Text allowFontScaling={false} style={[styles.hm, { color: c.textSecondary }]}>
              HM {station.hm}
              <Text style={styles.hmBand}>{`  ·  ${station.pill}`}</Text>
            </Text>
            <AppText style={[styles.name, { color: c.text }]}>{station.name}</AppText>
            {article?.need ? (
              <AppText style={[styles.need, { color: c.textSecondary }]}>
                <AppText style={[styles.needLabel, { color: c.textMuted }]}>For this: </AppText>
                {article.need}
              </AppText>
            ) : null}
          </LinearGradient>
        </View>

        <View style={styles.body}>

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
              {/* The button says what pressing it WILL DO. "Listen live" on a
                  station that is already sounding — which, since the page tunes
                  on open, is how it always arrives — is a claim the reader has
                  to test by pressing it. */}
              <AppText style={[styles.playText, { color: c.background }]}>
                {sounding ? 'Pause' : 'Play'}
              </AppText>
            </Pressable>
          ) : null}

          {/* ---- on now: DELETED ----
              It said station, track, artist and position — and the footer bar,
              a few hundred pixels below it, said the same four things about the
              same broadcast. The site can afford both because its `.kja-now`
              widget lives in a SIDEBAR, beside the article and nowhere near the
              thin strip at the foot of the window; stacking that column into one
              mobile scroll put the duplicate directly under its original.

              The position bar moved to the footer player, which had nowhere else
              to report it. Nothing else here was lost. */}

          {/* ---- story ----
              The catalog's description leads, as it does on the site: it is the
              sentence the station was defined by, and the written sections
              elaborate rather than repeat it. A station with no article (88 of
              105) simply stops after the lead. */}
          <View style={styles.section}>
            {/* The site drops the first letter with
                  `p.kja-lead::first-letter{float:left;font-size:4rem;color:var(--accent)}`.
                React Native has neither `::first-letter` nor float, so the text
                cannot wrap around a dropped capital. A nested <Text> is the
                honest equivalent: the letter is large and accent-blue on the
                same line and the rest flows past it — it simply will not indent
                the lines beneath, which for a one-to-two line lead is not
                visible anyway. */}
            <AppText style={[styles.lead, { color: c.textSecondary }]}>
              <Text style={[styles.dropCap, { color: c.accent }]}>
                {station.description.charAt(0)}
              </Text>
              {station.description.slice(1)}
            </AppText>
            {(article?.sections ?? []).map((sec, i) => (
              <View key={sec.h ?? i} style={styles.bodySection}>
                {sec.h ? (
                  <AppText style={[styles.sectionTitle, { color: c.text }]}>{sec.h}</AppText>
                ) : null}
                {sec.p.map((par, j) => (
                  <AppText
                    key={j}
                    // Paragraphs after the first need their own space; without
                    // it two <p>s read as one run-on block, which is what the
                    // web's default paragraph margin quietly prevents.
                    style={[styles.story, j > 0 && styles.storyGap, { color: c.textSecondary }]}
                  >
                    {par}
                  </AppText>
                ))}
              </View>
            ))}
          </View>

          {/* ---- what it stands on ---- */}
          {article?.stands ? (
            <View style={[styles.callout, { borderLeftColor: c.accent, backgroundColor: c.surface }]}>
              <View style={styles.calloutLabel}>
                <Ionicons name="star-outline" size={13} color={c.accent} />
                <AppText style={[styles.calloutLabelText, { color: c.accent }]}>
                  WHAT IT STANDS ON
                </AppText>
              </View>
              <AppText style={[styles.calloutText, { color: c.text }]}>{article.stands}</AppText>
            </View>
          ) : null}

          {/* ---- host ---- */}
          {station.host ? (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: c.text }]}>Hosted by</AppText>
              <View
                style={[
                  styles.card,
                  styles.byline,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                {personaImage(`${station.host.id}-inspire`) ? (
                  <Image
                    source={personaImage(`${station.host.id}-inspire`)}
                    style={styles.bylineAvatar}
                    contentFit="cover"
                  />
                ) : null}
                <View style={styles.bylineText}>
                  <AppText style={[styles.hostName, { color: c.text }]}>
                    {station.host.name}
                  </AppText>
                  <AppText style={[styles.hostFocus, { color: c.textMuted }]}>
                    {station.host.focus}
                  </AppText>
                </View>
              </View>
            </View>
          ) : null}

          {/* Up Next sits AFTER the article, not before it.
              The description is a LEAD — a dropped capital opening a paragraph
              that the reader meets three screens down, below a timetable, is
              not leading anything. What is coming up is the more useful thing
              on the page, but it is not the thing that introduces the station. */}
          {/* ---- up next ---- */}
          {station.live ? (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: c.text }]}>Up Next</AppText>
              {/* The schedule's loading and failure states live here now. They
                  used to belong to the ON NOW card, and deleting that card
                  without rehoming them would have made a failed schedule fetch
                  show as an empty gap with nothing said about it. */}
              {loading ? (
                <ActivityIndicator size="small" color={c.textMuted} style={styles.loader} />
              ) : !upNext.length ? (
                <AppText style={[styles.muted, { color: c.textMuted }]}>
                  {scheduleError ?? 'Nothing else scheduled today.'}
                </AppText>
              ) : null}
              {upNext.map((e, i) => (
                <View
                  key={e.key}
                  style={[
                    styles.row,
                    // An accent rule on the first row only — the one that is
                    // literally next. The rest are spaced, not ruled: a divider
                    // per row turned a four-item list into eight horizontal
                    // lines competing with the artwork above it.
                    { borderLeftColor: i === 0 ? c.accent : 'transparent' },
                  ]}
                >
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={[styles.rowTime, { color: i === 0 ? c.accent : c.textMuted }]}
                  >
                    {clock(e.startsAt)}
                  </Text>
                  <View style={styles.rowBody}>
                    <AppText numberOfLines={1} style={[styles.rowTitle, { color: c.text }]}>
                      {e.title}
                    </AppText>
                    {/* Most entries credit the station itself ("Torah Sings" /
                        "Torah Sings"), which is a line of nothing. Shown only
                        where it actually names someone else. */}
                    {e.artist && e.artist !== station.name ? (
                      <AppText numberOfLines={1} style={[styles.rowArtist, { color: c.textMuted }]}>
                        {e.artist}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {station.live ? null : (
            <View style={[styles.banner, { borderLeftColor: c.textMuted, backgroundColor: c.surface }]}>
              <AppText style={[styles.bannerText, { color: c.textSecondary }]}>
                <AppText style={[styles.bannerLead, { color: c.text }]}>Not on air yet. </AppText>
                {`HM ${station.hm} ${station.name} is assigned and named; its catalogue is still being built.`}
              </AppText>
            </View>
          )}

          {/* ---- facts ----
              Was a seven-row table. Five of those rows — Frequency, Format,
              Band, Language, Status — restated the hero directly above it, word
              for word, and a table whose job is to repeat the headline is
              furniture. The site can carry it because it sits in a sidebar the
              eye takes in ALONGSIDE the hero rather than after it.

              Two figures were genuinely new, so they survive as a line. */}
          {station.tracks || station.reach ? (
            <View style={styles.section}>
              <AppText style={[styles.factLine, { color: c.textMuted }]}>
                {[
                  station.tracks ? `${station.tracks.toLocaleString()} songs in rotation` : null,
                  station.reach ? `${station.reach} projected reach` : null,
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </AppText>
            </View>
          ) : null}

          {/* ---- related ---- */}
          {related.length ? (
            <View style={styles.section}>
              <AppText style={[styles.sectionTitle, { color: c.text }]}>More on the dial</AppText>
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
        {/* A scrim, not a bar. The header floats over the hero at rest, so a
            solid ground would cut the artwork in half — but with nothing behind
            it the Up Next rows scrolled up through the status bar and collided
            with the system clock. A fade holds both: invisible against the dark
            top of the hero, opaque enough to keep body text off the clock. */}
        <LinearGradient
          colors={['rgba(11,11,15,1)', 'rgba(11,11,15,0.86)', 'rgba(11,11,15,0)']}
          // Solid across the status bar, then fading through the pill row: a
          // half-lit heading sliding behind the system clock reads as breakage,
          // and 0.92 alone was not enough to hide one.
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="All stations"
          style={({ pressed }) => [
            styles.backPill,
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={c.text} />
          <AppText style={[styles.backPillText, { color: c.text }]}>All stations</AppText>
        </Pressable>
      </View>

      {/* The footer bar rides over this page too, as it does on the site. */}
      <FloatingMiniPlayer />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // The hero's own gradient now lands on the page background, so there is no
  // fade left for the body to be pulled up into.
  body: { paddingHorizontal: 16 },

  // `.kja-hero-overlay { padding: 120px 0 34px }` — the tall top padding is
  // what makes the gradient a long fade rather than a band, and the box is
  // bottom-anchored inside the hero (`align-items: flex-end`).
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    paddingTop: 120,
    paddingBottom: 22,
    paddingHorizontal: 16,
  },
  heroTopScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },


  // A labelled pill, not a bare chevron: it floats over artwork rather than a
  // toolbar, so it needs its own ground to stay legible, and the label says
  // where back goes.
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingLeft: 8,
    paddingRight: 12,
    height: 32,
    borderRadius: 16,
    marginLeft: 12,
  },
  backPillText: { fontSize: 13, lineHeight: 16 },

  pill: { fontSize: 11, letterSpacing: 1 },

  // Stands in for `::first-letter{float:left;font-size:4rem}`. Line height is
  // pinned to the lead's own so the enlarged glyph does not open a gap above
  // the first line — RN grows the whole line box to the tallest span otherwise.
  dropCap: { fontSize: 30, lineHeight: 25, fontWeight: '700' },

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
  loader: { alignSelf: 'flex-start', marginTop: 10 },
  muted: { fontSize: 13, marginTop: 8 },

  factLine: { fontSize: 13, lineHeight: 19 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  tabOutline: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  tabText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.66 },
  hmBand: { fontFamily: undefined, fontSize: 13, fontWeight: '500' },
  need: { fontSize: 16, lineHeight: 24, marginTop: 10 },
  needLabel: { fontSize: 16, lineHeight: 24 },
  lead: { fontSize: 16, lineHeight: 25 },
  bodySection: { marginTop: 20 },
  storyGap: { marginTop: 12 },
  callout: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 22,
  },
  calloutLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  calloutLabelText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  calloutText: { fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
  banner: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 20,
  },
  bannerText: { fontSize: 13.5, lineHeight: 20 },
  bannerLead: { fontSize: 13.5, lineHeight: 20, fontWeight: '700' },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bylineAvatar: { width: 46, height: 46, borderRadius: 23 },
  bylineText: { flexShrink: 1 },

  section: { marginTop: 28 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    // Held on every row, transparent on all but the first, so the four titles
    // stay on one vertical line instead of the marked row jutting out.
    borderLeftWidth: 2,
    paddingLeft: 10,
  },
  // Fixed width and a tabular face, so the times stack into a rail the eye can
  // run down rather than a ragged left edge.
  rowTime: { fontFamily: 'Orbitron_600SemiBold', fontSize: 11.5, lineHeight: 16, width: 60 },
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
