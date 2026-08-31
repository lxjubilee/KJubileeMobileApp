import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

/**
 * The tuner scale: a linear rule across the whole HM band.
 *
 * Ticks are drawn in ten fixed-width SVG chunks rather than one wide surface.
 * The full band is over three thousand points across, and a single SVG that size
 * risks the max-texture limit on older Android GPUs — where it does not fail
 * loudly it simply renders blank.
 *
 * The numbers are NOT in those chunks. A label is centred on its tick, so one
 * sitting on a chunk boundary has half its glyphs outside that chunk's viewport,
 * and SVG clips there — "390" rendered as "30". They are RN Text in their own
 * absolutely-positioned layer instead, which cannot clip and costs 21 views for
 * the whole band.
 *
 * Station marks are not here either: they must be tappable and animate with the
 * tuned station, and an SVG child cannot take a press.
 */

/** Spacing of the scale. Every geometry in the dial derives from this. */
export const PX_PER_HZ = 34;
const CHUNK_HZ = 10;

const TICK_STEP = 0.2;
/**
 * The dial is the hero of this screen, so the face is sized to be the largest
 * thing on it after the readout. A short scale reads as a widget bolted to a
 * page; a tall one reads as an instrument the page is built around.
 */
const HEIGHT = 250;
/** Baseline the ticks hang from; labels sit in the band below it. */
const BASE = 200;
/**
 * How far the baseline sits above the FOOT of the face.
 *
 * Expressed from the bottom on purpose: it is the one measurement the face can
 * be resized around. `DialMarks` already anchors its stems to the bottom by the
 * same 50, so a shorter face keeps the ticks, the marks and the numbers in
 * register instead of clipping the labels off the end.
 */
export const BASELINE_GAP = HEIGHT - BASE;
/** Width reserved per label so it can centre without clipping its neighbours. */
const LABEL_W = 60;

/**
 * THE FIVE-FOLD ZONES — the band allocated in five twenty-unit blocks, one per
 * ministry office. Ranges and hues are the site's, which takes them in turn from
 * the Band Reallocation plan, so the dial and the plan cannot disagree about
 * where a frequency belongs. The hues are lifted about fifteen percent in
 * luminance from the canonical palette because that one is set for a white
 * sheet: on black, #8E2A3A in a five-point strip reads as a smudge.
 *
 * Drawn INSIDE the scale rather than over the face, so the colour travels with
 * the track — whatever sits under the needle is the office the tuned station is
 * actually in, at any scroll position.
 */
export const ZONES = [
  { lo: 300, hi: 320, key: 'crossing', label: 'The Crossing', color: '#2E86D9' },
  { lo: 320, hi: 340, key: 'nations', label: 'The Nations', color: '#8257C4' },
  { lo: 340, hi: 360, key: 'upper', label: 'The Upper Room', color: '#B03849' },
  { lo: 360, hi: 380, key: 'living', label: 'The Living Room', color: '#4A9459' },
  { lo: 380, hi: 400, key: 'table', label: 'The Table', color: '#BE8A15' },
] as const;

/**
 * The block flagships, keyed by the `hm` the catalog carries — and only these
 * two. Every other mark stays white.
 *
 * Colouring every mark by its block was tried on the web and was wrong: it
 * turned the scale into five bands of colour, which is what the strip
 * underneath already says, and left nothing marking the flagship at all. This
 * is a named list, not a rule — a block gets a coloured mark when somebody
 * decides it has a flagship, which is why three blocks have none.
 */
export const FLAGSHIP_MARK: Record<string, string> = {
  '308.70': '#2E86D9', // Year of Jubilee — The Crossing
  '350.00': '#B03849', // The Upper Room  — The Upper Room
};

/**
 * The foot of the scale, stacked downward from the baseline: the frequency
 * numbers, then the office strip, then the office name. Same order and much the
 * same spacing as the web's, which counts up from the bottom instead.
 */
const NUM_TOP = 6;
const ZONE_TOP = 26;
const ZONE_H = 5;
const ZONE_LABEL_TOP = 34;

interface Props {
  lo: number;
  hi: number;
  colors: { minor: string; major: string; label: string; text: string };
  /** Face height. Defaults to the full-size design; short screens pass less. */
  height?: number;
}

const Chunk: React.FC<{
  from: number;
  lo: number;
  colors: Props['colors'];
  height: number;
}> = ({ from, lo, colors, height }) => {
  const base = height - BASELINE_GAP;
  const width = CHUNK_HZ * PX_PER_HZ;
  const ticks: React.ReactNode[] = [];

  // A tick every 0.2, taller on whole numbers, tallest every 5. Numbering every
  // whole number is unreadable at this spacing; numbering every ten leaves the
  // eye nothing to count by between labels.
  const steps = Math.round(CHUNK_HZ / TICK_STEP);
  for (let i = 0; i < steps; i++) {
    const hz = Math.round((from + i * TICK_STEP) * 10) / 10;
    const x = (hz - from) * PX_PER_HZ;
    const whole = Math.abs(hz - Math.round(hz)) < 0.001;
    const five = whole && Math.round(hz) % 5 === 0;
    const h = five ? 30 : whole ? 21 : 11;
    const stroke = five ? colors.label : whole ? colors.major : colors.minor;

    ticks.push(
      <Line
        key={hz}
        // A stroke sitting exactly on an integer coordinate straddles the pixel
        // and renders as a soft two-pixel line; the half-offset lands it on one.
        x1={x + 0.5}
        y1={base - h}
        x2={x + 0.5}
        y2={base}
        stroke={stroke}
        strokeWidth={1}
      />,
    );
  }

  return (
    <Svg width={width} height={height} style={[styles.chunk, { left: (from - lo) * PX_PER_HZ }]}>
      {ticks}
    </Svg>
  );
};

/**
 * Memoised, and the caller must pass a stable `colors` object.
 *
 * The screen re-renders on every scroll frame while the listener sweeps (the
 * readout has to follow the needle). Without this, each of those frames rebuilt
 * five hundred SVG lines and twenty-one labels, which is the difference between
 * a dial that glides and one that stutters.
 */
export const DialScale: React.FC<Props> = React.memo(({ lo, hi, colors, height = HEIGHT }) => {
  const chunks: number[] = [];
  for (let from = lo; from < hi; from += CHUNK_HZ) chunks.push(from);

  const labels: number[] = [];
  for (let hz = Math.ceil(lo / 5) * 5; hz <= hi; hz += 5) labels.push(hz);

  const base = height - BASELINE_GAP;

  return (
    <View pointerEvents="none" style={styles.root}>
      {/* First, so every tick and mark paints over the colour rather than under
          it. Clipped to the drawn band: the zones span the whole 300–400
          allocation, and a face showing less must not draw past its own end. */}
      {ZONES.filter((z) => z.hi > lo && z.lo < hi).map((z) => {
        const from = Math.max(z.lo, lo);
        const to = Math.min(z.hi, hi);
        return (
          <React.Fragment key={z.key}>
            <View
              style={[
                styles.zone,
                {
                  backgroundColor: z.color,
                  left: (from - lo) * PX_PER_HZ,
                  width: (to - from) * PX_PER_HZ,
                  top: base + ZONE_TOP,
                },
              ]}
            />
            {/* Left-aligned to the boundary rather than centred, so the name
                marks where the office BEGINS. Tiny on purpose: it is a legend
                for the band, not a label for a station, and anything larger
                competes with the frequency numbers directly above it. */}
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.zoneLabel,
                { color: z.color, left: (from - lo) * PX_PER_HZ, top: base + ZONE_LABEL_TOP },
              ]}
            >
              {z.label.toUpperCase()}
            </Text>
          </React.Fragment>
        );
      })}
      {chunks.map((from) => (
        <Chunk key={from} from={from} lo={lo} colors={colors} height={height} />
      ))}
      {labels.map((hz) => (
        <Text
          key={hz}
          allowFontScaling={false}
          style={[
            styles.label,
            {
              color: colors.text,
              left: (hz - lo) * PX_PER_HZ - LABEL_W / 2,
              // Follows the baseline down when the face is shortened.
              top: base + NUM_TOP,
            },
          ]}
        >
          {hz}
        </Text>
      ))}
    </View>
  );
});
DialScale.displayName = 'DialScale';

export const DIAL_HEIGHT = HEIGHT;
export const MARK_BASE = BASE;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  chunk: { position: 'absolute', top: 0 },
  zone: { position: 'absolute', height: ZONE_H },
  zoneLabel: {
    position: 'absolute',
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 8,
    lineHeight: 9,
    letterSpacing: 0.64,
    paddingLeft: 3,
    opacity: 0.85,
  },
  label: {
    position: 'absolute',
    width: LABEL_W,
    textAlign: 'center',
    // Orbitron encodes its own weight — adding fontWeight makes Android drop the
    // family and fall back to system sans.
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
