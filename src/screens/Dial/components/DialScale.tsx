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
/** Width reserved per label so it can centre without clipping its neighbours. */
const LABEL_W = 60;

interface Props {
  lo: number;
  hi: number;
  colors: { minor: string; major: string; label: string; text: string };
}

const Chunk: React.FC<{ from: number; lo: number; colors: Props['colors'] }> = ({
  from,
  lo,
  colors,
}) => {
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
        y1={BASE - h}
        x2={x + 0.5}
        y2={BASE}
        stroke={stroke}
        strokeWidth={1}
      />,
    );
  }

  return (
    <Svg width={width} height={HEIGHT} style={[styles.chunk, { left: (from - lo) * PX_PER_HZ }]}>
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
export const DialScale: React.FC<Props> = React.memo(({ lo, hi, colors }) => {
  const chunks: number[] = [];
  for (let from = lo; from < hi; from += CHUNK_HZ) chunks.push(from);

  const labels: number[] = [];
  for (let hz = Math.ceil(lo / 5) * 5; hz <= hi; hz += 5) labels.push(hz);

  return (
    <View pointerEvents="none" style={styles.root}>
      {chunks.map((from) => (
        <Chunk key={from} from={from} lo={lo} colors={colors} />
      ))}
      {labels.map((hz) => (
        <Text
          key={hz}
          allowFontScaling={false}
          style={[styles.label, { color: colors.text, left: (hz - lo) * PX_PER_HZ - LABEL_W / 2 }]}
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
  label: {
    position: 'absolute',
    top: BASE + 6,
    width: LABEL_W,
    textAlign: 'center',
    // Orbitron encodes its own weight — adding fontWeight makes Android drop the
    // family and fall back to system sans.
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
