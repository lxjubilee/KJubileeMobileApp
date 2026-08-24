import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';
import { useTrackDuration } from '@/hooks';
import { Track } from '@/types';
import { formatDuration } from '@/utils';
import { AppText } from '../common/AppText';
import { Artwork } from '../common/Artwork';
import { IconButton } from '../common/IconButton';

interface TrackRowProps {
  track: Track;
  onPress?: (track: Track) => void;
  onOptions?: (track: Track) => void;
  /** Trailing "add to playlist" action — shown as a circled + (takes the place
   *  of the options menu when provided). */
  onAddToPlaylist?: (track: Track) => void;
  /** When the track is already in a playlist, the + turns into a filled accent
   *  check so the added state reads at a glance. */
  isInPlaylist?: boolean;
  /** Trailing "remove from playlist" action — shown as a circled − (used on the
   *  playlist screen in place of the options menu). */
  onRemoveFromPlaylist?: (track: Track) => void;
  /** Show a leading index number instead of artwork (album track listing). */
  index?: number;
  isActive?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (track: Track) => void;
  /** Force the trailing duration label even when a heart is also shown (otherwise
   *  the heart takes the duration's place). */
  showDuration?: boolean;
  /** Optional control rendered on a second line under the artist name (e.g. the per-song rating). */
  ratingSlot?: React.ReactNode;
}

/** Single track row — used in album listings, artist top tracks, search, queue. */
export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  onPress,
  onOptions,
  onAddToPlaylist,
  isInPlaylist,
  onRemoveFromPlaylist,
  index,
  isActive,
  isFavorite,
  onToggleFavorite,
  showDuration,
  ratingSlot,
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onPress?.(track)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      {index != null ? (
        <View style={styles.indexBox}>
          {isActive ? (
            <Ionicons name="musical-notes" size={16} color={theme.colors.accent} />
          ) : (
            <AppText variant="body" color="textMuted">
              {index}
            </AppText>
          )}
        </View>
      ) : (
        <Artwork
          uri={track.artwork}
          style={[styles.art, { borderRadius: theme.radius.sm }]}
          transition={150}
          iconSize={20}
        />
      )}

      <View style={styles.meta}>
        <AppText
          variant="h3"
          numberOfLines={1}
          color={isActive ? 'accent' : 'text'}
        >
          {track.title}
        </AppText>
        <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
          {track.artistName}
        </AppText>
        {ratingSlot ? <View style={styles.ratingSlot}>{ratingSlot}</View> : null}
      </View>

      {onToggleFavorite ? (
        <IconButton
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite ? theme.colors.accent : theme.colors.iconMuted}
          onPress={() => onToggleFavorite(track)}
          style={styles.action}
        />
      ) : null}

      {onAddToPlaylist ? (
        <IconButton
          name={isInPlaylist ? 'checkmark-circle' : 'add-circle-outline'}
          size={24}
          color={isInPlaylist ? theme.colors.accent : theme.colors.iconMuted}
          onPress={() => onAddToPlaylist(track)}
          style={styles.action}
        />
      ) : null}

      {onRemoveFromPlaylist ? (
        <IconButton
          name="remove-circle-outline"
          size={24}
          color={theme.colors.iconMuted}
          onPress={() => onRemoveFromPlaylist(track)}
          style={styles.action}
        />
      ) : null}

      {showDuration || !onToggleFavorite ? <TrackDurationLabel track={track} /> : null}

      {onOptions && !onAddToPlaylist ? (
        <IconButton
          name="ellipsis-horizontal"
          size={20}
          color={theme.colors.iconMuted}
          onPress={() => onOptions(track)}
        />
      ) : null}
    </Pressable>
  );
};

/**
 * Trailing duration label. The catalog has no durations, so we resolve them
 * lazily from the audio file; while that's in flight we show a subtle skeleton
 * (not a broken-looking "--:--") so the list reads as "loading".
 */
const TrackDurationLabel: React.FC<{ track: Track }> = ({ track }) => {
  const theme = useTheme();
  const duration = useTrackDuration(track);
  if (duration > 0) {
    return (
      <AppText variant="caption" color="textMuted" style={styles.action}>
        {formatDuration(duration)}
      </AppText>
    );
  }
  return <View style={[styles.durationSkeleton, { backgroundColor: theme.colors.skeleton }]} />;
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  indexBox: { width: 36, alignItems: 'center', justifyContent: 'center' },
  art: { width: 48, height: 48, backgroundColor: '#222' },
  meta: { flex: 1, marginLeft: 12, marginRight: 8 },
  ratingSlot: { marginTop: 6 },
  action: { marginHorizontal: 6 },
  durationSkeleton: { width: 30, height: 10, borderRadius: 4, marginHorizontal: 6 },
});
