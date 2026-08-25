import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '@/context';
import type { RadioStation } from '@/services/radio';
import { FeaturedStation } from './FeaturedStation';

/**
 * The featured strip, matching the website's hero.
 *
 * kjubilee.com auto-advances its hero every 8 seconds and marks position with a
 * row of dots (index.html, startHero). It cross-fades rather than slides; this
 * slides, because a phone carousel that a thumb can drag has to move with the
 * thumb, and a fade would fight that.
 *
 * The auto-advance exists for a reason worth keeping: nothing on a phone invites
 * a horizontal swipe. Without it a listener may never learn there are five more
 * stations behind the first.
 */

/** The website's interval. Long enough to read a card, short enough to cycle. */
const ADVANCE_MS = 8000;

interface Props {
  stations: RadioStation[];
  width: number;
  playingSlug: string | null;
  /** Paused while Home is off-screen, so the timer does not run on another tab. */
  active: boolean;
  onPress: (station: RadioStation) => void;
}

export const FeaturedCarousel: React.FC<Props> = ({
  stations,
  width,
  playingSlug,
  active,
  onPress,
}) => {
  const theme = useTheme();
  const listRef = useRef<FlatList<RadioStation>>(null);
  const [index, setIndex] = useState(0);
  /** True from thumb-down until the scroll settles; suspends the timer. */
  const touching = useRef(false);
  const stride = width + 12;

  const goTo = useCallback(
    (i: number) => {
      setIndex(i);
      listRef.current?.scrollToIndex({ index: i, animated: true });
    },
    [],
  );

  useEffect(() => {
    if (!active || stations.length < 2) return undefined;
    const timer = setInterval(() => {
      // A drag in progress owns the carousel; advancing under the thumb would
      // fight the gesture.
      if (touching.current) return;
      setIndex((current) => {
        const next = (current + 1) % stations.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, [active, stations.length]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      touching.current = false;
      setIndex(Math.round(e.nativeEvent.contentOffset.x / stride));
    },
    [stride],
  );

  if (!stations.length) return null;

  return (
    <View>
      <FlatList
        ref={listRef}
        horizontal
        data={stations}
        keyExtractor={(s) => s.slug}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        snapToInterval={stride}
        decelerationRate="fast"
        snapToAlignment="start"
        // Fixed-width cards, so the list can resolve scrollToIndex without
        // measuring — without this an auto-advance past the rendered window
        // throws instead of scrolling.
        getItemLayout={(_, i) => ({ length: stride, offset: stride * i, index: i })}
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <FeaturedStation
            station={item}
            width={width}
            playing={item.slug === playingSlug}
            onPress={onPress}
          />
        )}
      />

      {stations.length > 1 ? (
        <View style={styles.dots}>
          {stations.map((s, i) => {
            const on = i === index;
            return (
              <Pressable
                key={s.slug}
                onPress={() => goTo(i)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Show ${s.name}`}
                accessibilityState={{ selected: on }}
                style={[
                  styles.dot,
                  {
                    width: on ? 22 : 6,
                    backgroundColor: on ? theme.colors.accent : theme.colors.border,
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
  row: { paddingHorizontal: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  // The active dot widens into a pill, as it does on the website.
  dot: { height: 6, borderRadius: 3 },
});
