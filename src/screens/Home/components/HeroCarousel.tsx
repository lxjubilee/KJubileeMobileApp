import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/context';
import { usePlayer } from '@/hooks';
import { Album } from '@/types';
import { HeroBanner } from './HeroBanner';

const { width: W } = Dimensions.get('window');
/** Auto-advance interval for the hero carousel. */
const ROTATE_MS = 15000;

interface HeroCarouselProps {
  albums: Album[];
  onPlay: (album: Album) => void;
  onOpen: (album: Album) => void;
}

/**
 * Full-width, swipeable hero that auto-advances every 15s and wraps around.
 * The timer resets whenever the visible page changes (auto or manual swipe),
 * so a manual swipe always gets a fresh 15s before the next auto-advance.
 */
export const HeroCarousel: React.FC<HeroCarouselProps> = ({ albums, onPlay, onOpen }) => {
  const theme = useTheme();
  const listRef = useRef<FlatList<Album>>(null);
  const [index, setIndex] = useState(0);
  const { currentTrack, isPlaying } = usePlayer();

  // Hold on the current hero while one of these albums is actually playing — a
  // user who just hit Play shouldn't have the carousel rotate away from it. The
  // timer resumes once playback stops or moves to a non-hero album.
  const heroPlaying = isPlaying && albums.some((a) => a.id === currentTrack?.albumId);

  useEffect(() => {
    if (albums.length <= 1 || heroPlaying) return undefined;
    const timer = setTimeout(() => {
      const next = (index + 1) % albums.length;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    }, ROTATE_MS);
    return () => clearTimeout(timer);
  }, [index, albums.length, heroPlaying]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / W));
  }, []);

  if (!albums.length) return null;
  if (albums.length === 1) {
    return <HeroBanner album={albums[0]} onPlay={onPlay} onOpen={onOpen} />;
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={albums}
        keyExtractor={(a) => a.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        // Slides carry absolutely-positioned artwork; leave them mounted so the
        // clipping optimization can't blank out images while paging.
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <View style={{ width: W }}>
            <HeroBanner album={item} onPlay={onPlay} onOpen={onOpen} />
          </View>
        )}
      />
      <View style={styles.dots}>
        {albums.map((a, i) => (
          <View
            key={a.id}
            style={[
              styles.dot,
              { backgroundColor: i === index ? theme.colors.text : theme.colors.border },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', alignSelf: 'center', gap: 6, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
