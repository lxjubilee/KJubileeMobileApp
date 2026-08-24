import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context';
import { Album } from '@/types';
import { AppText } from '../common/AppText';
import { Artwork } from '../common/Artwork';

interface AlbumCardProps {
  album: Album;
  onPress?: (album: Album) => void;
  /** Card width; height of the cover matches width (square artwork). */
  width?: number;
  /** Overrides the album title on the primary line — a section that shows genres
   *  passes the album's primary genre. Falls back to the title when unset. */
  caption?: string;
  /** Secondary line under the title — Home rails pass the album's genre. Ignored
   *  when `caption` is set, since that already shows the genre on the line above. */
  subtitle?: string;
}

/** Vertical album tile used in Home rails and grids. */
export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  onPress,
  width = 150,
  caption,
  subtitle,
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onPress?.(album)}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.8 : 1 }]}
    >
      <Artwork
        uri={album.cover}
        accentColor={album.accentColor}
        style={[styles.cover, { width, height: width, borderRadius: theme.radius.md }]}
        iconSize={Math.round(width * 0.28)}
      />
      <View style={styles.meta}>
        <AppText variant="h3" numberOfLines={1}>
          {caption || album.title}
        </AppText>
        {!caption && !!subtitle && (
          <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cover: { backgroundColor: '#222' },
  meta: { marginTop: 8 },
});
