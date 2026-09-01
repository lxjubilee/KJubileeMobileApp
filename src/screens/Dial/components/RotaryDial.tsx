import React, { useCallback, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RadioStation } from '@/services/radio';

/**
 * The rotary tuner — the second dial face.
 *
 * A physical-radio metaphor: the band is wrapped around an arc, a red needle
 * points at the frequency, and the listener turns a knob to move it. Where the
 * linear face is a sweep you throw with a thumb, this one is an instrument you
 * grip; the same engine sits behind both.
 *
 * The arc opens at the bottom and runs clockwise from lower-left to lower-right,
 * which is how a tuner scale has always been drawn — lowest frequency on the
 * left, highest on the right, with the useful part of the band across the top.
 */

/** Angles in degrees, screen convention: 0° points right, 90° points down. */
const START_DEG = 135;
const SWEEP_DEG = 270;

/**
 * The diameter the face was drawn at — the size `knobSize` caps out on.
 *
 * Every ring, gap and glyph below is expressed against this and scaled by `k`,
 * so the dial is the SAME DRAWING at every diameter rather than a fixed-size
 * scale with a proportional knob inside it. It was the latter: the ring offsets
 * were constants in points while the knob stayed at 0.26 × size, so the clear
 * air between the numbers and the knob closed as the face shrank — at 200 the
 * label ring fell 10pt INSIDE the knob.
 *
 * That was latent, not what anyone saw. The visible clipping came from the Svg
 * and the knob having stopped sharing a centre (see the Svg below); the numbers
 * on one side of the dial were eaten while the other side stayed clear. Both
 * are fixed, and the guaranteed clearance further down means neither can come
 * back through some size this screen has not been tried at.
 */
const DESIGN_SIZE = 330;

/** Numbers stay readable when the face is small, so they stop shrinking here. */
const MIN_LABEL_SIZE = 9;

/** Air between the knob's lit rim and the nearest edge of a band number. */
const LABEL_CLEARANCE = 6;

const rad = (deg: number) => (deg * Math.PI) / 180;

interface Props {
  size: number;
  lo: number;
  hi: number;
  /** Frequency the needle points at — the swept value, not the tuned station. */
  hz: number;
  stations: RadioStation[];
  activeSlug: string | null;
  playing: boolean;
  onSweep: (hz: number) => void;
  /** Fired when the knob is released, so the caller can settle onto a station. */
  onRelease: () => void;
  onTogglePlay: () => void;
  colors: {
    face: string;
    tick: string;
    tickMajor: string;
    label: string;
    needle: string;
    station: string;
    active: string;
    glow: string;
  };
}

export const RotaryDial: React.FC<Props> = ({
  size,
  lo,
  hi,
  hz,
  stations,
  activeSlug,
  playing,
  onSweep,
  onRelease,
  onTogglePlay,
  colors,
}) => {
  // Radii, outermost first. Each ring needs clear air around it: ticks, then
  // the station dots, then the numbers, then the knob. Crowding any two of them
  // together is what makes a printed dial look like a diagram.
  //
  // Every offset is × k, so those gaps hold their proportion at any diameter —
  // see DESIGN_SIZE. At k = 1 these are the original numbers exactly.
  const c = size / 2;
  const k = size / DESIGN_SIZE;
  const rOuter = c - 2 * k;
  const rTickOut = c - 8 * k;
  /** Where a major tick ends; minor ticks stop `8 * k` short of it. */
  const rTickIn = c - 30 * k;
  const rDot = c - 40 * k;
  /** Floored so the band numbers stay legible on a short face. */
  const labelSize = Math.max(MIN_LABEL_SIZE, 12 * k);
  /**
   * Half a three-digit label, measured rather than guessed: Orbitron's digits
   * advance 0.82em, so "320" is 2.46em wide. At the nine- and three-o'clock
   * ends of the arc that half-width points straight at the knob, which is what
   * actually has to clear it.
   */
  const labelHalfW = labelSize * 1.23;
  /** Numbers must stay inside the station-dot ring, or they collide with it. */
  const rLabelMax = rDot - labelSize * 0.5;
  /**
   * The knob is never allowed to grow past the room the numbers need.
   *
   * At the drawn size this is slack and the knob is exactly 0.26 x size, as it
   * has always been. It only bites below ~180, where the floor on `labelSize`
   * means the type has stopped shrinking with the face while the knob has not.
   */
  const knobR = Math.min(size * 0.26, rLabelMax - labelHalfW - LABEL_CLEARANCE);
  /**
   * The numbers sit where the drawing puts them, unless that would run them
   * into the knob — then they move out just far enough to clear it, without
   * ever passing the dot ring.
   */
  const rLabel = Math.max(
    c - 58 * k,
    Math.min(knobR + labelHalfW + LABEL_CLEARANCE, rLabelMax),
  );
  // Strokes scale too, but never below a hairline — a tick that thins to 0.3pt
  // stops rendering as a line and starts rendering as a smudge.
  const wTickMajor = Math.max(1, 2 * k);
  const wTickMinor = Math.max(0.75, k);

  const angleOf = useCallback(
    (f: number) => START_DEG + ((f - lo) / (hi - lo)) * SWEEP_DEG,
    [lo, hi],
  );
  const pt = useCallback(
    (deg: number, r: number) => ({ x: c + r * Math.cos(rad(deg)), y: c + r * Math.sin(rad(deg)) }),
    [c],
  );

  // ---- the turn gesture --------------------------------------------------

  /** Knob centre in window coordinates, so pageX/pageY can be turned into an angle. */
  const centre = useRef({ x: 0, y: 0 });
  const wrapRef = useRef<View>(null);
  const lastAngle = useRef(0);
  const hzRef = useRef(hz);
  hzRef.current = hz;
  // The callbacks are read through refs so the responder below can be built
  // once. Rebuilding it whenever the parent re-rendered — which it does on
  // every frame of a turn, and again whenever the engine reports a new track —
  // risks tearing down the very gesture that is in flight.
  const onSweepRef = useRef(onSweep);
  onSweepRef.current = onSweep;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const measure = useCallback((_e: LayoutChangeEvent) => {
    // measureInWindow rather than the layout event's own x/y: those are relative
    // to the parent, and the gesture reports absolute page coordinates.
    wrapRef.current?.measureInWindow((x, y, w, h) => {
      centre.current = { x: x + w / 2, y: y + h / 2 };
    });
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { pageX, pageY } = e.nativeEvent;
          lastAngle.current =
            (Math.atan2(pageY - centre.current.y, pageX - centre.current.x) * 180) / Math.PI;
        },
        onPanResponderMove: (e) => {
          const { pageX, pageY } = e.nativeEvent;
          const now =
            (Math.atan2(pageY - centre.current.y, pageX - centre.current.x) * 180) / Math.PI;

          // Track the *delta* rather than mapping the touch angle straight to a
          // frequency: jumping the needle to wherever a thumb lands would make
          // the knob a tap target, not something you turn. Normalising into
          // (-180, 180] keeps the wrap across ±180° from spinning the band.
          let d = now - lastAngle.current;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          lastAngle.current = now;

          const next = hzRef.current + (d / SWEEP_DEG) * (hi - lo);
          onSweepRef.current(Math.min(hi, Math.max(lo, next)));
        },
        onPanResponderRelease: () => onReleaseRef.current(),
        onPanResponderTerminate: () => onReleaseRef.current(),
      }),
    [hi, lo],
  );

  // ---- scale -------------------------------------------------------------

  const { ticks, labels } = useMemo(() => {
    const t: React.ReactNode[] = [];
    const l: React.ReactNode[] = [];
    for (let f = lo; f <= hi + 0.001; f += 2) {
      const deg = angleOf(f);
      const major = Math.round(f) % 10 === 0;
      const a = pt(deg, rTickOut);
      const b = pt(deg, major ? rTickIn : rTickIn + 8 * k);
      t.push(
        <Line
          key={`t${f}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={major ? colors.tickMajor : colors.tick}
          strokeWidth={major ? wTickMajor : wTickMinor}
          strokeLinecap="round"
        />,
      );
      if (major) {
        const p = pt(deg, rLabel);
        l.push(
          <SvgText
            key={`l${f}`}
            x={p.x}
            // SVG text hangs off its baseline, so it has to be dropped by about
            // a third of its size to sit on the ring rather than above it. This
            // was a flat +4, correct only while the type was 12pt.
            y={p.y + labelSize * 0.34}
            fill={colors.label}
            fontSize={labelSize}
            fontFamily="Orbitron_600SemiBold"
            textAnchor="middle"
          >
            {String(Math.round(f))}
          </SvgText>,
        );
      }
    }
    return { ticks: t, labels: l };
  }, [lo, hi, angleOf, pt, rTickOut, rTickIn, rLabel, k, labelSize, wTickMajor, wTickMinor, colors]);

  // Every station gets a dot on the arc, so the occupied frequencies are legible
  // before the listener turns anything — the band is mostly empty, and a knob
  // with no marks gives no clue where to aim.
  const marks = useMemo(
    () =>
      stations.map((s) => {
        const p = pt(angleOf(parseFloat(s.hm)), rDot);
        const on = s.slug === activeSlug;
        return (
          <Circle
            key={s.slug}
            cx={p.x}
            cy={p.y}
            r={Math.max(on ? 3 : 1.75, (on ? 4.5 : 2.5) * k)}
            fill={on ? colors.active : colors.station}
            opacity={on ? 1 : 0.55}
          />
        );
      }),
    [stations, activeSlug, angleOf, pt, rDot, k, colors],
  );

  // The needle spans knob to ticks, passing through the dot ring — so when it
  // rests on a station it visibly points at that station's mark rather than
  // stopping short of it.
  const needleFrom = pt(angleOf(hz), knobR + 10 * k);
  const needleTo = pt(angleOf(hz), rTickIn - 4 * k);

  return (
    <View
      ref={wrapRef}
      onLayout={measure}
      style={[styles.wrap, { width: size, height: size }]}
      {...pan.panHandlers}
    >
      {/* NOT absoluteFill. The knob below centres itself in this wrapper, while an
          absolutely-filled Svg anchors its own `size`-unit drawing at the box's
          top-left and scales it to whatever box it is given — so the moment the
          two disagreed, the face and the knob stopped sharing a centre. Measured
          on a Galaxy S25: the tick ring centred 17dp left and 19dp above the
          knob, which ate the labels on one side of the dial and left the other
          side clear. In flow, both are centred by the same wrapper and cannot
          drift apart, whatever box this ends up in. */}
      <Svg width={size} height={size}>
        {/* The case the scale is printed on. */}
        <Circle cx={c} cy={c} r={rOuter} fill={colors.face} />
        {ticks}
        {labels}
        {marks}
        <Line
          x1={needleFrom.x}
          y1={needleFrom.y}
          x2={needleTo.x}
          y2={needleTo.y}
          stroke={colors.needle}
          strokeWidth={Math.max(2, 3 * k)}
          strokeLinecap="round"
        />
      </Svg>

      {/* The knob. Concentric gradients rather than one fill: a single flat disc
          reads as a circle, and it is the banding between bright and dark arcs
          that makes a metal knob look turned. */}
      <View pointerEvents="box-none" style={styles.knobLayer}>
        <LinearGradient
          colors={['#6E6E74', '#C9C9CF', '#8A8A92', '#E6E6EB', '#7A7A82']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.knob, { width: knobR * 2, height: knobR * 2, borderRadius: knobR }]}
        >
          <LinearGradient
            colors={['#F2F2F5', '#A9A9B2', '#DCDCE2', '#8E8E97']}
            start={{ x: 0.85, y: 0.05 }}
            end={{ x: 0.15, y: 0.95 }}
            style={[
              styles.knobInner,
              {
                width: knobR * 1.55,
                height: knobR * 1.55,
                borderRadius: knobR,
              },
            ]}
          >
            <Pressable
              onPress={onTogglePlay}
              accessibilityRole="button"
              accessibilityLabel={playing ? 'Pause' : 'Play'}
              hitSlop={8}
              style={({ pressed }) => [
                styles.power,
                {
                  width: knobR * 0.66,
                  height: knobR * 0.66,
                  borderRadius: knobR,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {/* The glyph carries the colour, not a disc behind it. The knob's
                  own brushed face is the surface here; a filled circle on top of
                  it read as a second control sitting on the knob rather than as
                  the knob's centre. The glow moves to the glyph for the same
                  reason — there is no longer a solid shape to cast one, and the
                  readout above is lit the same way. */}
              <Ionicons
                name={playing ? 'pause' : 'play'}
                size={knobR * 0.46}
                color={colors.active}
                style={[
                  styles.glyphGlow,
                  { textShadowColor: colors.glow },
                  playing ? null : styles.playGlyph,
                ]}
              />
            </Pressable>
          </LinearGradient>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  knobLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  knob: { alignItems: 'center', justifyContent: 'center' },
  knobInner: { alignItems: 'center', justifyContent: 'center' },
  // No fill and no elevation: a shadow cast by a transparent view draws
  // nothing on iOS and a faint artefact on Android.
  power: { alignItems: 'center', justifyContent: 'center' },
  glyphGlow: { textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  // The play triangle's own bearing sits it left of centre in the circle.
  playGlyph: { marginLeft: 2 },
});
