import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { MUSIC_COLLAGE_POSTERS } from '../musicImages';

const { width: SCREEN_W } = Dimensions.get('window');

// Decorative, music-themed poster set (independent of the catalog so it always
// renders fast). See musicImages.ts for the curated source list.
const POSTERS = MUSIC_COLLAGE_POSTERS;

const COLUMNS = 3;
const GAP = 10;
const COL_W = (SCREEN_W * 1.5 - GAP * (COLUMNS + 1)) / COLUMNS; // wider than screen; tilt crops edges
const POSTER_H = Math.round(COL_W * 1.5);

type Direction = 'up' | 'down';

/** A single vertical strip of posters that loops seamlessly in one direction. */
const PosterColumn: React.FC<{ uris: string[]; direction: Direction; duration: number }> = ({
  uris,
  direction,
  duration,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const setHeight = uris.length * (POSTER_H + GAP);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: direction === 'up' ? [0, -setHeight] : [-setHeight, 0],
  });

  return (
    <View style={[styles.column, { width: COL_W }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {/* Rendered twice for a seamless wrap-around. */}
        {[...uris, ...uris].map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={[styles.poster, { width: COL_W, height: POSTER_H }]}
            contentFit="cover"
            transition={300}
          />
        ))}
      </Animated.View>
    </View>
  );
};

/**
 * Tilted, slowly auto-scrolling grid of posters used as the onboarding backdrop
 * (Netflix welcome style). Columns drift in alternating directions for depth.
 */
export const PosterCollage: React.FC = () => {
  const perCol = Math.ceil(POSTERS.length / COLUMNS);
  const cols = Array.from({ length: COLUMNS }, (_, c) => POSTERS.slice(c * perCol, (c + 1) * perCol));

  return (
    <View style={styles.tilt} pointerEvents="none">
      <View style={styles.row}>
        {cols.map((uris, idx) => (
          <PosterColumn
            key={idx}
            uris={uris}
            direction={idx % 2 === 0 ? 'up' : 'down'}
            duration={26000 + idx * 6000}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Shift up/left, rotate, and scale so the rotated grid fully covers the area.
  tilt: {
    position: 'absolute',
    top: -80,
    left: -SCREEN_W * 0.25,
    right: -SCREEN_W * 0.25,
    bottom: -80,
    transform: [{ rotate: '-14deg' }, { scale: 1.15 }],
  },
  row: { flexDirection: 'row', gap: GAP, justifyContent: 'center' },
  column: { gap: GAP },
  poster: { borderRadius: 8, backgroundColor: '#1a1a22' },
});
