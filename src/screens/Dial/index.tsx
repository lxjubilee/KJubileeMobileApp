import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen, AppText } from '@/components/common';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import { storage, STORAGE_KEYS } from '@/services/storage';
import {
  getAllStations,
  getStations,
  getBandTotals,
  groupThousands,
  toggle,
  tune,
  BAND_LO,
  BAND_HI,
} from '@/services/radio';
import type { MainTabParamList } from '@/navigation/types';
import { DialScale, PX_PER_HZ, DIAL_HEIGHT } from './components/DialScale';
import { DialMarks } from './components/DialMarks';
import { RotaryDial } from './components/RotaryDial';

/**
 * The Dial — a tuner, not a directory.
 *
 * Every other surface answers "which station shall I choose". This one answers
 * "what else is out there": the listener moves across the band and a station
 * arrives. Ported from the web `/dial` (KJubilee.com `public/player.html`).
 *
 * Two faces, one engine:
 *
 *   - `linear`  the web dial's scale, swept with a thumb. Momentum carries it,
 *               and it settles onto the nearest station.
 *   - `rotary`  a physical-radio knob with the band wrapped around an arc and a
 *               red needle. Turned rather than thrown.
 *
 * Both drive the same tuning path, so the choice is cosmetic and can be made
 * per listener — it persists across launches.
 *
 * Two rules from the web page are kept deliberately:
 *
 *   - NEXT PLAYS. Stepping the dial without hearing anything would make this a
 *     list with extra steps. Every tune starts audio.
 *   - Only stations that can actually play are on the band. A dial that stops
 *     on a frequency carrying nothing teaches the listener that next is
 *     unreliable, and next *is* the interface here.
 *
 * Performance note: the screen re-renders on every frame while sweeping, because
 * the readout has to track the needle. Everything expensive under that — the
 * scale's lines, the station marks — is memoised with stable props so those
 * frames only touch a few text nodes.
 */

type DialStyle = 'linear' | 'rotary';

/**
 * FITTING THE DIAL ONTO A SHORT SCREEN.
 *
 * This screen is a fixed column — it must not scroll, because the sweep and the
 * knob both want the vertical drag for themselves. So on a short phone it has to
 * shrink rather than overflow, and at 360x640dp it overflowed badly enough to
 * push the transport off the bottom: no play button, and no way to reach one.
 *
 * These are measured, not guessed. Everything on the screen that is NOT the
 * tuner comes to about 509dp at full size — against roughly 544dp of usable
 * height on a 640dp device, which leaves the dial nothing. `COMPACT` trims the
 * type and the spacing to about 355dp, which buys the face ~190dp and fits.
 */
const CHROME_FULL = 509;
const CHROME_COMPACT = 430;
/** Bottom tab bar, which is outside this screen's own height. */
const TAB_BAR = 56;
/** Below this much usable height the full-size layout cannot fit. */
const COMPACT_BELOW = 620;
/** The face never goes under this, however short the screen. */
const MIN_FACE = 120;

/**
 * The band's numbers — outreach, towers, songs, stations on air — are built and
 * ready (see `services/radio/bandTotals.ts` and `scripts/build-totals.mjs`) but
 * not shown yet.
 *
 * WHY THEY ARE OFF. "Stations on air" is derived from this app's own tunable
 * list, which is the only honest way to print it — the site learned that when
 * its own figure sat at 41 while its dial carried 43. But the app's catalog is
 * behind the network: it tunes 17 frequencies where the site broadcasts 43,
 * because 15 stations carry `tenant: null` here and 11 more are not in the
 * catalog at all. So the figure would read "17 ON AIR" beside a website saying
 * 43 — correct about the app, and wrong about the band.
 *
 * Flip to `true` once the catalog is re-synced from production; nothing else
 * needs to change, and the other three figures are already live-sourced.
 */
const SHOW_BAND_NUMBERS = false;

export const DialScreen: React.FC = () => {
  const theme = useTheme();
  const radio = useRadio();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MainTabParamList, 'DialTab'>>();

  // What this screen actually has to lay out in, once the system bars and the
  // tab bar underneath have taken theirs.
  const usable = height - insets.top - insets.bottom - TAB_BAR;
  const compact = usable < COMPACT_BELOW;
  /** The face is whatever is left after the chrome, capped at the design size. */
  const faceH = Math.max(
    MIN_FACE,
    Math.min(DIAL_HEIGHT, usable - (compact ? CHROME_COMPACT : CHROME_FULL)),
  );
  const askedHm = route.params?.hm;

  const stations = useMemo(() => getStations(), []);
  /**
   * The band's own numbers. Computed once: none of it changes as the dial
   * turns, because it describes the band rather than a station, and the
   * outreach figure is pinned to the UTC date so it must not move mid-session.
   */
  const totals = useMemo(() => getBandTotals(), []);
  const scrollRef = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest scroll offset. A ref, not state — every frame would re-render. */
  const offset = useRef(0);
  /**
   * True from thumb-down until the scroll settles.
   *
   * Load-bearing: `onScroll` fires for programmatic movement too — the initial
   * `contentOffset` and every `scrollTo` — so without this the readout latches
   * into its swept state on mount and never shows a station name again.
   */
  const dragging = useRef(false);

  const [face, setFace] = useState<DialStyle>('linear');
  const [index, setIndex] = useState(() => {
    const i = stations.findIndex((s) => s.slug === radio.slug);
    return i >= 0 ? i : Math.max(0, stations.findIndex((s) => s.slug === 'jubilee-radio'));
  });
  /** The frequency under the needle mid-sweep, or null when settled. */
  const [sweep, setSweep] = useState<number | null>(null);
  /**
   * Said under the readout when the frequency someone asked for is not the one
   * the needle ended up on, and cleared as soon as they tune anywhere else.
   */
  const [notOnAir, setNotOnAir] = useState<string | null>(null);

  const station = stations[index] ?? stations[0];
  const here = radio.slug === station.slug;
  const sounding = here && radio.playing;

  // Mirrors for the knob's gesture handlers, which must read the live values
  // without re-subscribing (see onKnobRelease).
  const sweepRef = useRef<number | null>(null);
  sweepRef.current = sweep;
  const stationHmRef = useRef(station.hm);
  stationHmRef.current = station.hm;

  const xOf = useCallback((hz: number) => (hz - BAND_LO) * PX_PER_HZ, []);

  // Remembered per listener: which face someone prefers is a taste that should
  // survive a relaunch, not a setting to re-make every session.
  useEffect(() => {
    void storage.getItem<DialStyle>(STORAGE_KEYS.DIAL_STYLE).then((saved) => {
      if (saved === 'linear' || saved === 'rotary') setFace(saved);
    });
  }, []);

  const chooseFace = useCallback((next: DialStyle) => {
    setFace(next);
    setSweep(null);
    void storage.setItem(STORAGE_KEYS.DIAL_STYLE, next);
  }, []);

  // ---- tuning ------------------------------------------------------------

  const goTo = useCallback(
    (i: number, animated: boolean) => {
      const next = (i + stations.length) % stations.length;
      setIndex(next);
      setSweep(null);
      scrollRef.current?.scrollTo({ x: xOf(parseFloat(stations[next].hm)), animated });
      return stations[next];
    },
    [stations, xOf],
  );

  const step = useCallback(
    (delta: number) => {
      setNotOnAir(null);
      const s = goTo(index + delta, true);
      void tune(s.slug);
    },
    [goTo, index],
  );

  const pick = useCallback(
    (i: number) => {
      setNotOnAir(null);
      const s = goTo(i, true);
      void tune(s.slug);
    },
    [goTo],
  );

  /**
   * Settle onto the station nearest a frequency.
   *
   * Nearest wins outright rather than requiring proximity: the band is sparse,
   * and letting the needle rest between marks would park the listener on
   * silence with no indication of which way to go.
   */
  const settleAt = useCallback(
    (hz: number) => {
      let best = 0;
      let bestGap = Infinity;
      stations.forEach((s, i) => {
        const gap = Math.abs(parseFloat(s.hm) - hz);
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      });
      const s = goTo(best, true);
      // A settle landing back where it started is a no-op — re-tuning a station
      // that is already sounding would restart it for no reason.
      if (!(radio.slug === s.slug && radio.playing)) void tune(s.slug);
    },
    [goTo, radio.playing, radio.slug, stations],
  );

  // ---- opening on a frequency someone asked for --------------------------

  /** Acted on once per arrival, so a re-render does not re-tune the radio. */
  const handledHm = useRef<string | null>(null);

  /**
   * `kjubilee.com/hm308.70` — the address a station is given on air.
   *
   * Resolved against the WHOLE catalogue rather than the tunable subset, because
   * the two answers a listener can get differ in kind and only one is an error.
   * A frequency that is assigned but still in build is not a broken link — it is
   * a real station that has not signed on — and silently parking them elsewhere
   * would read as the app losing their tap. So it is named, and the dial settles
   * on the nearest frequency that can actually play, which leaves back and next
   * meaningful from there.
   *
   * A frequency the network does not assign at all is left alone: the dial keeps
   * whatever it opened on, which is the station already sounding.
   */
  useEffect(() => {
    if (!askedHm || handledHm.current === askedHm) return;
    handledHm.current = askedHm;

    const hz = parseFloat(askedHm);
    if (!Number.isFinite(hz)) return;

    const asked = getAllStations().find((s) => Math.abs(parseFloat(s.hm) - hz) < 0.005);
    if (!asked) return;

    const live = stations.findIndex((s) => s.slug === asked.slug);
    if (live >= 0) {
      setNotOnAir(null);
      // `false`: this is where the dial OPENS, so there is nothing to animate
      // from — sliding across the band on arrival would look like a glitch.
      const s = goTo(live, false);
      void tune(s.slug);
      return;
    }

    setNotOnAir(`HM ${asked.hm} ${asked.name} is assigned but not on air yet.`);
    settleAt(hz);
  }, [askedHm, goTo, settleAt, stations]);

  // ---- linear face: sweeping --------------------------------------------

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.x;
    if (!dragging.current) return;
    // Rounded to the dial's own resolution: a readout flickering through
    // hundredths is noise, and this is the value the listener reads.
    setSweep(Math.round((BAND_LO + offset.current / PX_PER_HZ) * 100) / 100);
  }, []);

  const settleScroll = useCallback(() => {
    dragging.current = false;
    settleAt(BAND_LO + offset.current / PX_PER_HZ);
  }, [settleAt]);

  const clearSettle = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
  }, []);

  // A drag can end with or without momentum, and only `onScrollEndDrag` fires in
  // the first case. Arm a short timer there and disarm it if momentum begins, so
  // exactly one settle runs either way.
  const onScrollEndDrag = useCallback(() => {
    clearSettle();
    settleTimer.current = setTimeout(settleScroll, 90);
  }, [clearSettle, settleScroll]);

  useEffect(() => clearSettle, [clearSettle]);

  // ---- rotary face: turning ---------------------------------------------

  const onKnobSweep = useCallback((hz: number) => {
    setSweep(Math.round(hz * 100) / 100);
  }, []);

  const onKnobRelease = useCallback(() => {
    // Read the live value from a ref, not from a setState updater. React runs
    // updater functions during render, so settling from inside one meant
    // setting state on this component mid-render — "Cannot update a component
    // while rendering a different component". A ref sidesteps the stale-closure
    // problem that tempted me there without touching the render phase.
    const target = sweepRef.current ?? parseFloat(stationHmRef.current);
    setSweep(null);
    settleAt(target);
  }, [settleAt]);

  // Follow the engine onto a station tuned somewhere else (a lock-screen
  // control, a future footer player) rather than contradicting what is audible.
  useEffect(() => {
    if (!radio.slug) return;
    const i = stations.findIndex((s) => s.slug === radio.slug);
    if (i >= 0 && i !== index) goTo(i, true);
    // `index` is intentionally absent: including it re-runs this on every local
    // tune and fights the scroll that tune just started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.slug, stations, goTo]);

  // ---- the live pulse ----------------------------------------------------

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!sounding) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sounding, pulse]);

  // ---- render ------------------------------------------------------------

  const c = theme.colors;

  // Stable props, or the memo on the scale and the marks buys nothing.
  const scaleColors = useMemo(
    () => ({ minor: c.border, major: c.textMuted, label: c.textSecondary, text: c.textMuted }),
    [c.border, c.textMuted, c.textSecondary],
  );
  const markColors = useMemo(
    () => ({ idle: c.text, active: c.accent, glow: c.accent }),
    [c.text, c.accent],
  );
  const rotaryColors = useMemo(
    () => ({
      face: c.backgroundElevated,
      tick: c.border,
      tickMajor: c.textSecondary,
      label: c.textMuted,
      needle: c.danger,
      station: c.text,
      active: c.accent,
      glow: c.accent,
    }),
    [c.backgroundElevated, c.border, c.textSecondary, c.textMuted, c.danger, c.text, c.accent],
  );

  const shown = sweep ?? parseFloat(station.hm);
  const onAir = radio.loading
    ? 'TUNING'
    : radio.error
      ? 'OFF AIR'
      : sounding
        ? 'ON AIR'
        : here
          ? 'PAUSED'
          : 'OFF';

  // The knob answers to the same budget as the flat face, so neither can
  // outgrow the space the transport needs below it.
  const knobSize = Math.min(width - 56, 330, faceH + (compact ? 40 : 80));

  return (
    <Screen>
      {/* The tuned station's own colours, washed behind the readout. It makes
          the screen belong to whatever is playing, and it is real catalog data
          rather than decoration — every station ships a gradient pair. */}
      <LinearGradient
        pointerEvents="none"
        colors={[`${station.gradient[1]}66`, `${station.gradient[0]}22`, 'transparent']}
        locations={[0, 0.45, 1]}
        style={styles.backdrop}
      />

      <View style={[styles.stage, compact && cs.stage]}>
        {/* Which face to tune with. In the flow and labelled rather than a pair
            of icons floating in a corner: two tuner styles is a choice worth
            finding, and an unlabelled glyph over a dark backdrop is neither
            visible nor obviously a control. */}
        <View style={[styles.faceSwitch, { borderColor: c.border }]}>
          {(['linear', 'rotary'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => chooseFace(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: face === f }}
              style={[styles.faceBtn, face === f && { backgroundColor: c.surface }]}
            >
              <Ionicons
                name={f === 'linear' ? 'reorder-four-outline' : 'disc-outline'}
                size={15}
                color={face === f ? c.text : c.textMuted}
              />
              <AppText style={[styles.faceLabel, { color: face === f ? c.text : c.textMuted }]}>
                {f === 'linear' ? 'SWEEP' : 'KNOB'}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* ---- readout ---- */}
        <View style={styles.readout}>
          <AppText style={[styles.band, compact && cs.band, { color: c.textMuted }]}>HEAVENLY MODULATION</AppText>

          {/* Plain Text, not AppText: the typography variants carry a fontWeight,
              and a fontWeight alongside a custom family makes Android drop the
              family and fall back to system sans (the trap BrandLogo documents).
              Their lineHeight would also clip a readout this size. */}
          <View style={styles.freqRow}>
            <Text allowFontScaling={false} style={[styles.hm, compact && cs.hm, { color: c.textMuted }]}>
              HM
            </Text>
            <Text
              allowFontScaling={false}
              style={[styles.freq, compact && cs.freq, { color: c.text, textShadowColor: `${c.accent}80` }]}
            >
              {shown.toFixed(2)}
            </Text>
          </View>

          <AppText numberOfLines={1} style={[styles.station, compact && cs.station, { color: c.text }]}>
            {sweep == null ? station.name : 'Tuning…'}
          </AppText>
          <AppText numberOfLines={1} style={[styles.sub, compact && cs.sub, { color: c.textSecondary }]}>
            {station.format}
            {station.host ? `  ·  ${station.host.name}` : ''}
          </AppText>

          <View style={[styles.pill, compact && cs.pill, { borderColor: sounding ? `${c.danger}66` : c.border }]}>
            {radio.loading ? (
              <ActivityIndicator size="small" color={c.textMuted} />
            ) : (
              <Animated.View
                style={[
                  styles.pillDot,
                  {
                    backgroundColor: sounding ? c.danger : c.textMuted,
                    opacity: sounding
                      ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] })
                      : 1,
                  },
                ]}
              />
            )}
            <AppText style={[styles.pillText, { color: sounding ? c.danger : c.textMuted }]}>
              {onAir}
            </AppText>
          </View>
        </View>

        {/* Said once, under the readout, and only when the frequency asked for
            is not the one now under the needle. */}
        {notOnAir ? (
          <AppText style={[styles.notOnAir, { color: c.textMuted }]}>
            {notOnAir} The dial is on the nearest frequency that is playing.
          </AppText>
        ) : null}

        {/* ---- the tuner ---- */}
        {face === 'linear' ? (
          <View style={styles.dialWrap}>
            <View style={[styles.dial, { height: faceH, borderColor: c.border }]}>
              {/* A lit face: the glass is brighter at the centre, where the
                  needle is, and falls away to the case at the edges. */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.015)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />

              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                decelerationRate="normal"
                contentOffset={{ x: xOf(parseFloat(station.hm)), y: 0 }}
                // Half a screen of padding either side lets the lowest and
                // highest frequencies reach the needle, fixed at the centre.
                contentContainerStyle={{
                  width: (BAND_HI - BAND_LO) * PX_PER_HZ + width,
                  paddingHorizontal: width / 2,
                }}
                onScroll={onScroll}
                onScrollBeginDrag={() => {
                  dragging.current = true;
                  clearSettle();
                }}
                onScrollEndDrag={onScrollEndDrag}
                onMomentumScrollBegin={clearSettle}
                onMomentumScrollEnd={settleScroll}
              >
                <View style={[styles.track, { height: faceH }]}>
                  <DialScale lo={BAND_LO} hi={BAND_HI} colors={scaleColors} height={faceH} />
                  <DialMarks
                    stations={stations}
                    activeIndex={index}
                    lo={BAND_LO}
                    onPick={pick}
                    colors={markColors}
                  />
                </View>
              </ScrollView>

              {/* The scale fades at both edges so it reads as a band continuing
                  past the window rather than a bar that stops. */}
              <LinearGradient
                pointerEvents="none"
                colors={[c.background, `${c.background}00`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fade, styles.fadeLeft]}
              />
              <LinearGradient
                pointerEvents="none"
                colors={[`${c.background}00`, c.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fade, styles.fadeRight]}
              />

              {/* Light around the needle, not a beam down the face: white and
                  faint is what a lit tuner needle looks like. Blue stays on the
                  marks and the equalizer, where it identifies rather than
                  decorates. */}
              <LinearGradient
                pointerEvents="none"
                colors={['#FFFFFF00', '#FFFFFF2B', '#FFFFFF00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.needleGlow}
              />
              <View pointerEvents="none" style={[styles.needle, { backgroundColor: c.text }]} />
              <View pointerEvents="none" style={[styles.needleCap, { borderTopColor: c.text }]} />
            </View>

            {/* The station's own story — what a listener wants to know having
                just landed on an unfamiliar frequency. An error takes the slot
                when there is one; it matters more. */}
            <AppText
              // One line on a short screen: three of these is 57dp, and the
              // same sentence is on the station's own page.
              numberOfLines={compact ? 1 : 3}
              style={[styles.story, compact && cs.story, { color: radio.error ? c.danger : c.textMuted }]}
            >
              {radio.error ?? station.description}
            </AppText>
          </View>
        ) : (
          <View style={styles.dialWrap}>
            <RotaryDial
              size={knobSize}
              lo={BAND_LO}
              hi={BAND_HI}
              hz={shown}
              stations={stations}
              activeSlug={station.slug}
              playing={sounding}
              onSweep={onKnobSweep}
              onRelease={onKnobRelease}
              onTogglePlay={() => void toggle(station.slug)}
              colors={rotaryColors}
            />
            <AppText
              numberOfLines={2}
              style={[styles.story, { color: radio.error ? c.danger : c.textMuted }]}
            >
              {radio.error ?? 'Turn the knob to tune'}
            </AppText>
          </View>
        )}

        {/* ---- transport ---- */}
        <View style={styles.bottom}>
          <View style={[styles.controls, compact && cs.controls]}>
            <View style={styles.control}>
              <Pressable
                onPress={() => step(-1)}
                accessibilityRole="button"
                accessibilityLabel="Previous station"
                style={({ pressed }) => [
                  styles.tbtn,
                  compact && cs.tbtn,
                  { borderColor: c.border, opacity: pressed ? 0.55 : 1 },
                ]}
              >
                <Ionicons name="play-skip-back" size={22} color={c.textSecondary} />
              </Pressable>
              <AppText style={[styles.tbtnLabel, compact && cs.tbtnLabel, { color: c.textMuted }]}>BACK</AppText>
            </View>

            {/* The rotary face carries play in the middle of its knob, the way
                the instrument it imitates does — a second one here would be the
                same control twice. */}
            {face === 'linear' ? (
              <View style={styles.control}>
                <Pressable
                  onPress={() => void toggle(station.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={sounding ? 'Pause' : 'Play'}
                  style={({ pressed }) => [
                    styles.tbtn,
                    styles.play,
                    compact && cs.play,
                    { backgroundColor: c.text, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons
                    name={sounding ? 'pause' : 'play'}
                    size={32}
                    color={c.background}
                    style={sounding ? undefined : styles.playGlyph}
                  />
                </Pressable>
                <AppText style={[styles.tbtnLabel, compact && cs.tbtnLabel, { color: c.textMuted }]}>
                  {sounding ? 'PAUSE' : 'PLAY'}
                </AppText>
              </View>
            ) : null}

            <View style={styles.control}>
              <Pressable
                onPress={() => step(1)}
                accessibilityRole="button"
                accessibilityLabel="Next station"
                style={({ pressed }) => [
                  styles.tbtn,
                  compact && cs.tbtn,
                  { borderColor: c.border, opacity: pressed ? 0.55 : 1 },
                ]}
              >
                <Ionicons name="play-skip-forward" size={22} color={c.textSecondary} />
              </Pressable>
              <AppText style={[styles.tbtnLabel, compact && cs.tbtnLabel, { color: c.textMuted }]}>NEXT</AppText>
            </View>
          </View>

          {/* Now playing. A live broadcast has no scrubber to show, so the bars
              stand in for one — they say "this is moving" where a progress bar
              would, without implying a position the listener could seek to. */}
          <View style={[styles.nowRow, compact && cs.nowRow, { borderColor: c.border }]}>
            {sounding ? <Equalizer color={c.accent} phase={pulse} /> : null}
            <AppText numberOfLines={1} style={[styles.nowText, { color: c.textSecondary }]}>
              {radio.track ? `${radio.track.title} — ${radio.track.artist}` : 'Nothing on air'}
            </AppText>
          </View>

          {/* The band's numbers, as the site prints them in the dial's corners.
              Portrait has no corners to spare and the stage is a fixed column,
              so they close the screen instead — and the three counts share one
              line rather than stacking as they do on the web, which is the
              difference between fitting on a 360dp phone and being cut off by
              the tab bar. Order is the web's: towers lead, being the largest and
              the one describing the whole band's reach; stations on air closes,
              being the modest one. */}
          {SHOW_BAND_NUMBERS ? (
            <View style={styles.bandNumbers}>
              <AppText allowFontScaling={false} style={[styles.reachNum, { color: c.accent }]}>
                {groupThousands(totals.potentialOutreach)}
              </AppText>
              <AppText style={[styles.reachLabel, { color: c.textMuted }]}>
                POTENTIAL OUTREACH
              </AppText>
              <AppText
                allowFontScaling={false}
                numberOfLines={1}
                style={[styles.countLine, { color: c.textMuted }]}
              >
                {groupThousands(totals.towers)} TOWERS  ·  {groupThousands(totals.songs)} SONGS  ·{' '}
                {groupThousands(totals.stationsOnAir)} ON AIR
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
};

/** Three bars breathing off the shared pulse — no extra timers. */
const Equalizer: React.FC<{ color: string; phase: Animated.Value }> = ({ color, phase }) => (
  <View style={styles.eq}>
    {[0, 1, 2].map((i) => (
      <Animated.View
        key={i}
        style={[
          styles.eqBar,
          {
            backgroundColor: color,
            transform: [
              {
                scaleY: phase.interpolate({
                  inputRange: [0, 1],
                  // Staggered so the three do not pump in unison.
                  outputRange: i === 1 ? [1, 0.35] : [0.4, 1],
                }),
              },
            ],
          },
        ]}
      />
    ))}
  </View>
);

/**
 * Short-screen overrides, layered on top of `styles` — never a separate layout.
 *
 * Only type sizes and spacing: nothing here moves an element or changes what is
 * on the screen, so the compact dial is the same instrument, read closer.
 */
const cs = StyleSheet.create({
  stage: { paddingTop: 6, paddingBottom: 4 },
  band: { marginBottom: 8 },
  hm: { fontSize: 13, lineHeight: 17, marginTop: 10, marginRight: 7 },
  freq: { fontSize: 44, lineHeight: 52 },
  station: { fontSize: 19, marginTop: 8 },
  sub: { fontSize: 12.5, marginTop: 3 },
  pill: { marginTop: 10 },
  story: { marginTop: 12, paddingHorizontal: 26 },
  controls: { gap: 26 },
  tbtn: { width: 42, height: 42, borderRadius: 21 },
  play: { width: 60, height: 60, borderRadius: 30 },
  tbtnLabel: { marginTop: 6 },
  nowRow: { marginTop: 8 },
});

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, height: 420 },

  faceSwitch: {
    alignSelf: 'center',
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
  },
  faceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    height: 30,
    borderRadius: 8,
  },
  faceLabel: { fontSize: 10, letterSpacing: 1.6 },

  // space-between over three blocks: the readout takes the top, the tuner sits
  // at the optical centre, and the transport anchors the bottom. Filling the
  // screen this way beats centring one stack and leaving a third of it empty.
  stage: { flex: 1, justifyContent: 'space-between', paddingTop: 12, paddingBottom: 8 },

  readout: { alignItems: 'center', paddingHorizontal: 24 },
  band: { fontSize: 11, letterSpacing: 4.5, marginBottom: 14 },
  freqRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hm: {
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    marginTop: 14,
    marginRight: 9,
  },
  freq: {
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 62,
    lineHeight: 72,
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  station: { fontSize: 24, marginTop: 12, textAlign: 'center' },
  sub: { fontSize: 14, marginTop: 5, textAlign: 'center' },

  // Sits between the readout and the glass, where the eye already is after
  // reading the frequency it did not ask for.
  bandNumbers: { marginTop: 14, alignItems: 'center', paddingHorizontal: 16 },
  // Not Orbitron: it is the dial's own face, but a wide display family puts a
  // 13-digit figure past the edge of a 360dp screen at any readable size.
  reachNum: { fontSize: 24, letterSpacing: 0.5, fontWeight: '800' },
  reachLabel: { fontSize: 10, letterSpacing: 2, marginTop: 1 },
  countLine: { fontSize: 11, letterSpacing: 1, marginTop: 8 },
  notOnAir: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, letterSpacing: 2.2 },

  dialWrap: { alignItems: 'center' },
  dial: {
    height: DIAL_HEIGHT,
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Explicit height, not flex: a flex child inside a horizontal ScrollView has
  // no cross-axis size to stretch to, and the scale fills this absolutely.
  track: { width: (BAND_HI - BAND_LO) * PX_PER_HZ, height: DIAL_HEIGHT },

  fade: { position: 'absolute', top: 0, bottom: 0, width: 80 },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },

  needle: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  needleGlow: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 26, marginLeft: -13 },
  needleCap: {
    position: 'absolute',
    left: '50%',
    top: 0,
    marginLeft: -7,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  story: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 22,
    paddingHorizontal: 34,
  },

  bottom: { alignItems: 'center', paddingHorizontal: 20 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 38 },
  control: { alignItems: 'center' },
  tbtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: { width: 88, height: 88, borderRadius: 44, borderWidth: 0 },
  // The play triangle's own bearing sits it left of centre in the circle.
  playGlyph: { marginLeft: 4 },
  tbtnLabel: { fontSize: 10, letterSpacing: 2.2, marginTop: 11 },

  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 26,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  nowText: { fontSize: 12.5, flexShrink: 1 },
  eq: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 14 },
  eqBar: { width: 2.5, height: 14, borderRadius: 1.5 },
});

export default DialScreen;
