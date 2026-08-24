import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context';
import { usePlayer, useSafeProgress } from '@/hooks';
import { AppText } from '../common/AppText';
import { Artwork } from '../common/Artwork';
import { IconButton } from '../common/IconButton';

interface MiniPlayerProps {
  /** Opens the full Music Player (wired by the navigation wrapper). */
  onPress: () => void;
}

/**
 * Persistent now-playing bar shown above the tab bar on every screen. Renders
 * nothing when no track is loaded. Tapping it opens the full player.
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const theme = useTheme();
  const { currentTrack, isPlaying, isBuffering, toggle, next, stop } = usePlayer();
  const { position, duration } = useSafeProgress(500);

  if (!currentTrack) return null;

  const pct = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: theme.colors.miniPlayer, borderRadius: theme.radius.md },
      ]}
    >
      <View style={styles.content}>
        <Artwork
          uri={currentTrack.artwork}
          style={[styles.art, { borderRadius: theme.radius.sm }]}
          iconSize={20}
        />
        <View style={styles.meta}>
          <AppText variant="h3" numberOfLines={1}>
            {currentTrack.title}
          </AppText>
          <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
            {currentTrack.artistName}
          </AppText>
        </View>
        {isBuffering ? (
          <View style={[styles.control, styles.spinner]}>
            <ActivityIndicator size="small" color={theme.colors.text} />
          </View>
        ) : (
          <IconButton
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            onPress={toggle}
            style={styles.control}
          />
        )}
        <IconButton name="play-skip-forward" size={22} onPress={next} style={styles.control} />
        {/* Close: stop playback and dismiss the bar. */}
        <IconButton name="close" size={22} onPress={stop} style={styles.control} />
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct * 100}%`, backgroundColor: theme.colors.text },
          ]}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden', marginHorizontal: 8 },
  content: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  art: { width: 44, height: 44, backgroundColor: '#222' },
  meta: { flex: 1, marginLeft: 10 },
  control: { paddingHorizontal: 8 },
  spinner: { width: 26, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 2, width: '100%' },
  progressFill: { height: 2 },
});
