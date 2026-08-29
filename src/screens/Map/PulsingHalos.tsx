import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Circle, G } from 'react-native-svg';
import type { City } from './types';
import { hashLabel, radiusFor } from './types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  cities: City[];
  scale: number;
  color: string;
}

/**
 * The breathing halos under the towers that carry stations.
 *
 * EVERY TOWER BREATHES AT ITS OWN RATE. One shared animation makes them blink
 * in lockstep, which reads as a screensaver rather than as a network — so each
 * gets its own period and its own head start, spread widely enough that no two
 * neighbours visibly agree. 4.5–11.5 seconds, offset by up to a full period,
 * seeded from the city's own name so the rhythm is stable across relaunches.
 * All of that is the site's own scheme, ported so the two maps agree.
 *
 * ONLY THE 72 THAT CARRY STATIONS. The site animates all 347 with CSS, which is
 * free; here every frame of every animation is JS work driving an SVG prop, and
 * there is no native driver for `opacity` on a react-native-svg node. Animating
 * the relays as well would quadruple that cost to say nothing extra — the halo
 * has only ever distinguished the cities something broadcasts from.
 *
 * The values are created ONCE and deliberately do not depend on `scale`: pan and
 * zoom re-render this subtree, and rebuilding the animations there would restart
 * every one of them mid-breath on every drag frame.
 */
export const PulsingHalos: React.FC<Props> = ({ cities, scale, color }) => {
  const pulses = useRef<Animated.Value[]>([]);
  if (pulses.current.length !== cities.length) {
    pulses.current = cities.map(() => new Animated.Value(0));
  }

  const timing = useMemo(
    () =>
      cities.map((city) => {
        const h = hashLabel(`${city.city}, ${city.cc}`);
        return {
          duration: (4.5 + (h % 7000) / 1000) * 1000,
          delay: ((h >>> 13) % 11500) / 1000 * 1000,
        };
      }),
    [cities],
  );

  useEffect(() => {
    const loops = pulses.current.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(timing[i].delay),
          Animated.timing(value, {
            toValue: 1,
            duration: timing[i].duration / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: timing[i].duration / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [timing]);

  return (
    <G>
      {cities.map((city, i) => (
        <AnimatedCircle
          key={`pulse:${city.city}|${city.cc}`}
          cx={city.x}
          cy={city.y}
          r={(radiusFor(city) * 1.9) / scale}
          fill={color}
          opacity={pulses.current[i].interpolate({
            inputRange: [0, 1],
            // Shallow on purpose: this is standing infrastructure, and a halo
            // that swings to nothing and back reads as a fault light.
            outputRange: [0.1, 0.26],
          })}
        />
      ))}
    </G>
  );
};
