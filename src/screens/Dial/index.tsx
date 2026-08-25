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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, AppText } from '@/components/common';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { getStations, toggle, tune, BAND_LO, BAND_HI } from '@/services/radio';
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

export const DialScreen: React.FC = () => {
  const theme = useTheme();
  const radio = useRadio();
  const { width } = useWindowDimensions();

  const stations = useMemo(() => getStations(), []);
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
      const s = goTo(index + delta, true);
      void tune(s.slug);
    },
    [goTo, index],
  );

  const pick = useCallback(
    (i: number) => {
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

  const knobSize = Math.min(width - 56, 330);

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

      <View style={styles.stage}>
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
          <AppText style={[styles.band, { color: c.textMuted }]}>HEAVENLY MODULATION</AppText>

          {/* Plain Text, not AppText: the typography variants carry a fontWeight,
              and a fontWeight alongside a custom family makes Android drop the
              family and fall back to system sans (the trap BrandLogo documents).
              Their lineHeight would also clip a readout this size. */}
          <View style={styles.freqRow}>
            <Text allowFontScaling={false} style={[styles.hm, { color: c.textMuted }]}>
              HM
            </Text>
            <Text
              allowFontScaling={false}
              style={[styles.freq, { color: c.text, textShadowColor: `${c.accent}80` }]}
            >
              {shown.toFixed(2)}
            </Text>
          </View>

          <AppText numberOfLines={1} style={[styles.station, { color: c.text }]}>
            {sweep == null ? station.name : 'Tuning…'}
          </AppText>
          <AppText numberOfLines={1} style={[styles.sub, { color: c.textSecondary }]}>
            {station.format}
            {station.host ? `  ·  ${station.host.name}` : ''}
          </AppText>

          <View style={[styles.pill, { borderColor: sounding ? `${c.danger}66` : c.border }]}>
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

        {/* ---- the tuner ---- */}
        {face === 'linear' ? (
          <View style={styles.dialWrap}>
            <View style={[styles.dial, { borderColor: c.border }]}>
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
                <View style={styles.track}>
                  <DialScale lo={BAND_LO} hi={BAND_HI} colors={scaleColors} />
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
              numberOfLines={3}
              style={[styles.story, { color: radio.error ? c.danger : c.textMuted }]}
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
          <View style={styles.controls}>
            <View style={styles.control}>
              <Pressable
                onPress={() => step(-1)}
                accessibilityRole="button"
                accessibilityLabel="Previous station"
                style={({ pressed }) => [
                  styles.tbtn,
                  { borderColor: c.border, opacity: pressed ? 0.55 : 1 },
                ]}
              >
                <Ionicons name="play-skip-back" size={22} color={c.textSecondary} />
              </Pressable>
              <AppText style={[styles.tbtnLabel, { color: c.textMuted }]}>BACK</AppText>
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
                <AppText style={[styles.tbtnLabel, { color: c.textMuted }]}>
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
                  { borderColor: c.border, opacity: pressed ? 0.55 : 1 },
                ]}
              >
                <Ionicons name="play-skip-forward" size={22} color={c.textSecondary} />
              </Pressable>
              <AppText style={[styles.tbtnLabel, { color: c.textMuted }]}>NEXT</AppText>
            </View>
          </View>

          {/* Now playing. A live broadcast has no scrubber to show, so the bars
              stand in for one — they say "this is moving" where a progress bar
              would, without implying a position the listener could seek to. */}
          <View style={[styles.nowRow, { borderColor: c.border }]}>
            {sounding ? <Equalizer color={c.accent} phase={pulse} /> : null}
            <AppText numberOfLines={1} style={[styles.nowText, { color: c.textSecondary }]}>
              {radio.track ? `${radio.track.title} — ${radio.track.artist}` : 'Nothing on air'}
            </AppText>
          </View>
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
