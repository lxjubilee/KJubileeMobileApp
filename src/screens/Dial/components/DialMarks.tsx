import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RadioStation } from '@/services/radio';
import { PX_PER_HZ, DIAL_HEIGHT, MARK_BASE } from './DialScale';

/**
 * The stations, as marks on the scale.
 *
 * Separate from DialScale because these have to be pressable and they restyle
 * when the tuned station changes — an SVG child can take neither. Memoised for
 * the same reason the scale is: the screen re-renders on every scroll frame
 * while sweeping, and these must not be rebuilt on each one.
 *
 * A mark is the only white thing on the scale, so the eye reads it as "there is
 * something here" without a legend saying so. The tuned one is taller and takes
 * the brand accent.
 */

interface Props {
  stations: RadioStation[];
  activeIndex: number;
  lo: number;
  onPick: (index: number) => void;
  colors: { idle: string; active: string; glow: string };
}

const STEM_IDLE = 74;
const STEM_ON = 104;

export const DialMarks: React.FC<Props> = React.memo(
  ({ stations, activeIndex, lo, onPick, colors }) => (
    <>
      {stations.map((s, i) => {
        const on = i === activeIndex;
        const stem = on ? STEM_ON : STEM_IDLE;
        const tint = on ? colors.active : colors.idle;
        const left = (parseFloat(s.hm) - lo) * PX_PER_HZ;

        return (
          <Pressable
            key={s.slug}
            onPress={() => onPick(i)}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel={`Tune HM ${s.hm}, ${s.name}`}
            style={[styles.hit, { left: left - 18 }]}
          >
            {/* A soft halo behind the tuned mark so it reads as lit rather than
                just recoloured. Idle marks skip it — fifteen glows would be a
                light show, not an instrument.
                Kept faint: at rest this mark sits directly under the needle, and
                two confident glows stacked read as a solid blue bar rather than
                light. It earns its keep mid-sweep, when the two are apart. */}
            {on ? (
              <View
                style={[
                  styles.glow,
                  { backgroundColor: colors.glow, height: stem + 14, bottom: BOTTOM - 7 },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.stem,
                { backgroundColor: tint, height: stem, opacity: on ? 1 : 0.5 },
              ]}
            />
            <View
              style={[
                styles.dot,
                { backgroundColor: tint, opacity: on ? 1 : 0.5, bottom: BOTTOM + stem - 3 },
              ]}
            />
          </Pressable>
        );
      })}
    </>
  ),
);
DialMarks.displayName = 'DialMarks';

/** Marks rise from the same baseline the ticks hang from. */
const BOTTOM = DIAL_HEIGHT - MARK_BASE;

const styles = StyleSheet.create({
  hit: { position: 'absolute', bottom: 0, width: 36, height: '100%', alignItems: 'center' },
  stem: { position: 'absolute', bottom: BOTTOM, width: 2, borderRadius: 1 },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  glow: { position: 'absolute', width: 14, borderRadius: 7, opacity: 0.13 },
});
