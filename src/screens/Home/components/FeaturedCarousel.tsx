import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type PanResponderGestureState,
} from 'react-native';
import { useTheme } from '@/context';
import type { RadioStation } from '@/services/radio';
import { FeaturedStation, featuredHeight } from './FeaturedStation';

/**
 * The featured hero, reproducing kjubilee.com's carousel.
 *
 * The website does NOT slide. Its slides are stacked absolutely and cross-faded
 * (`public/css/pages/home.css`):
 *
 *   .hero-shot{position:absolute;inset:0;opacity:0;transition:opacity .7s ease}
 *   .hero-shot.is-live{opacity:1}
 *
 * and the copy animates on its own track, independent of the artwork:
 *
 *   .hero-content{animation:heroIn .5s ease both}
 *   @keyframes heroIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
 *
 * `public/js/pages/home.js` advances every 8000ms (`startHero`), and every manual
 * move — dot or arrow — runs `stopHero(); paintHero(i); startHero()`, i.e. the
 * timer restarts from the interaction rather than firing early.
 *
 * This file previously used a paging FlatList, which was a different animation
 * wearing the same interval. It is now the site's: no horizontal travel, an
 * opacity cross-fade underneath and a short rise-and-fade on the copy above.
 *
 * Every slide stays mounted, exactly as the site keeps every `.hero-shot` in the
 * DOM. That is what makes the cross-fade possible at all — both frames have to
 * be on screen at once — and it is also why the artwork never reloads or shows a
 * blank frame mid-transition.
 */

/** `setInterval(..., 8000)` in startHero. */
const ADVANCE_MS = 8000;
/** `transition:opacity .7s` on .hero-shot. */
const FADE_MS = 700;
/**
 * CSS `ease`. React Native's `Easing.ease` is bezier(.42,0,1,1) — that is CSS
 * `ease-in`, a different curve — so the CSS keyword is spelled out here rather
 * than approximated by the similarly-named constant.
 */
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

/** Past this fraction of the width, a drag counts as a deliberate swipe. */
const SWIPE_RATIO = 0.18;
/** …or past this flick speed, however short the travel. */
const SWIPE_VELOCITY = 0.3;

interface Props {
  stations: RadioStation[];
  width: number;
  playingSlug: string | null;
  /** The track sounding right now, when one is. */
  nowPlaying: { title: string; artist: string; album: string } | null;
  /** Paused while Home is off-screen, so the timer does not run on another tab. */
  active: boolean;
  onPress: (station: RadioStation) => void;
  /** Transport for the slide's own button; never navigates. */
  onToggle: (station: RadioStation) => void;
}

export const FeaturedCarousel: React.FC<Props> = ({
  stations,
  width,
  playingSlug,
  nowPlaying,
  active,
  onPress,
  onToggle,
}) => {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const count = stations.length;
  const height = featuredHeight(width);

  // One opacity per slide. Built once for the given length; the featured list is
  // static for the life of the screen.
  const opacities = useMemo(
    () => stations.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );
  const running = useRef<Animated.CompositeAnimation | null>(null);

  /** Cross-fade to `i`. Interrupts any fade already in flight. */
  useEffect(() => {
    running.current?.stop();
    const fade = Animated.parallel(
      opacities.map((value, i) =>
        Animated.timing(value, {
          toValue: i === index ? 1 : 0,
          duration: FADE_MS,
          easing: EASE,
          useNativeDriver: true,
        }),
      ),
    );
    running.current = fade;
    // Interrupting mid-fade leaves each value wherever it stood and animates on
    // from there, so a fast swipe can never strand two slides both visible.
    fade.start();
    return () => fade.stop();
  }, [index, opacities]);

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  /**
   * Auto-advance. Keyed on `index`, so any change — a swipe, a dot, or the
   * previous tick — restarts the countdown. That is `stopHero(); startHero()`
   * on the website, expressed as a dependency rather than a pair of calls.
   */
  useEffect(() => {
    if (!active || count < 2) return undefined;
    const timer = setTimeout(() => go(index + 1), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, active, count, go]);

  // Swipe. The website has no touch gesture at all — only arrows and dots — so
  // there is no drag-follow to copy: a cross-fade has nothing to drag. The
  // gesture therefore commits on release, and claims the touch only when it is
  // clearly horizontal, leaving vertical scrolling to the page underneath.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g: PanResponderGestureState) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g: PanResponderGestureState) => {
          const far = Math.abs(g.dx) > width * SWIPE_RATIO;
          const fast = Math.abs(g.vx) > SWIPE_VELOCITY;
          if (!far && !fast) return;
          go(index + (g.dx < 0 ? 1 : -1));
        },
      }),
    [index, width, go],
  );

  if (!count) return null;

  return (
    <View style={{ width, height }} {...panResponder.panHandlers}>
      {stations.map((station, i) => (
        <Animated.View
          key={station.slug}
          style={[StyleSheet.absoluteFill, { opacity: opacities[i] }]}
          // Only the visible slide takes touches; the stack underneath must not
          // swallow a press meant for the one on top.
          pointerEvents={i === index ? 'auto' : 'none'}
        >
          <FeaturedStation
            station={station}
            width={width}
            playing={station.slug === playingSlug}
            nowPlaying={station.slug === playingSlug ? nowPlaying : null}
            active={i === index}
            onPress={onPress}
            onToggle={onToggle}
          />
        </Animated.View>
      ))}

      {count > 1 ? (
        // Overlaid on the banner's lower edge, where the website puts them.
        <View style={styles.dots} pointerEvents="box-none">
          {stations.map((s, i) => {
            const on = i === index;
            return (
              <Pressable
                key={s.slug}
                onPress={() => setIndex(i)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Show ${s.name}`}
                accessibilityState={{ selected: on }}
                style={[
                  styles.dot,
                  {
                    width: on ? 22 : 6,
                    backgroundColor: on ? theme.colors.accent : 'rgba(255,255,255,0.34)',
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  // The active dot widens into a pill, as it does on the website.
  dot: { height: 6, borderRadius: 3 },
});
