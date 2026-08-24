import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText, Artwork } from '@/components/common';
import { useAppDispatch, useIsAlbumLiked, usePlayer } from '@/hooks';
import { toggleAlbumLike } from '@/redux';
import { Album } from '@/types';

interface HeroBannerProps {
  album: Album;
  onPlay: (album: Album) => void;
  onOpen: (album: Album) => void;
}

const { width: W } = Dimensions.get('window');
const H_PADDING = 16;
// Wide featured card spanning the content width. Its height matches the image's
// own aspect ratio once loaded (see below), so the artwork fills the frame with
// no cropping and no letterbox gap. Until then we fall back to a tall portrait.
const POSTER_W = W - H_PADDING * 2;
const POSTER_H_DEFAULT = Math.round(POSTER_W * 1.36);
// Keep pathological aspect ratios from producing an unusably tall/short banner.
const MIN_ASPECT = 0.6; // portrait limit  (h ≈ 1.66×w)
const MAX_ASPECT = 1.9; // landscape limit (h ≈ 0.53×w)

/**
 * Featured album as a full-width poster whose height matches the artwork's own
 * aspect ratio, with the tag line and Play / My List actions stacked BELOW the
 * image (not overlaid) so the cover art and its title text stay fully visible.
 */
export const HeroBanner: React.FC<HeroBannerProps> = ({ album, onPlay, onOpen }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const saved = useIsAlbumLiked(album);
  const { currentTrack, isPlaying, queue, toggle } = usePlayer();

  // The hero launches its album from the top, so its "own" track is the album's
  // first track — queue[0] (the queue keeps the album's original order, even
  // when shuffle reorders playback). The Play button reflects that specific
  // track's state: it only shows "Pause" while the hero's own track is the one
  // playing. Skipping to another track (Next in the mini player) or any other
  // album flips this hero back to "Play".
  const isHeroTrackActive =
    currentTrack?.albumId === album.id && currentTrack?.id === queue[0]?.id;
  const showPause = isHeroTrackActive && isPlaying;

  // Pressing the button pauses/resumes when the hero's own track is current;
  // otherwise it (re)starts the album from the top.
  const onPressPlay = () => (isHeroTrackActive ? toggle() : onPlay(album));

  // Poster height tracks the image's natural aspect ratio so the artwork fills
  // the frame exactly — no side crop, no top/bottom empty space.
  const [posterH, setPosterH] = useState(POSTER_H_DEFAULT);

  // Dot-separated descriptors built from the album's real metadata.
  const tags = [album.genre, album.year?.toString(), album.artistName].filter(Boolean) as string[];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 120 }]}>
      <Pressable
        onPress={() => onOpen(album)}
        style={[styles.poster, { width: POSTER_W, height: posterH, borderRadius: theme.radius.lg }]}
      >
        <Artwork
          uri={album.cover}
          accentColor={album.accentColor}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          iconSize={64}
          onLoad={({ source }) => {
            if (!source?.width || !source?.height) return;
            const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, source.width / source.height));
            setPosterH(Math.round(POSTER_W / aspect));
          }}
        />
      </Pressable>

      {/* Tags + actions sit BELOW the artwork so nothing covers the cover/title. */}
      {tags.length ? (
        <AppText
          variant="bodySm"
          color="text"
          style={[styles.tags, { width: POSTER_W }]}
          numberOfLines={1}
        >
          {tags.join('   •   ')}
        </AppText>
      ) : null}

      <View style={[styles.actions, { width: POSTER_W }]}>
        <Pressable
          onPress={onPressPlay}
          style={({ pressed }) => [
            styles.btn,
            styles.playBtn,
            { borderRadius: theme.radius.sm, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name={showPause ? 'pause' : 'play'} size={20} color="#000" />
          <AppText variant="label" style={styles.playLabel}>
            {showPause ? t('common.pause') : t('common.play')}
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => dispatch(toggleAlbumLike(album))}
          style={({ pressed }) => [
            styles.btn,
            styles.listBtn,
            {
              borderRadius: theme.radius.sm,
              borderColor: 'rgba(255,255,255,0.25)',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name={saved ? 'checkmark' : 'add'} size={20} color={theme.colors.text} />
          <AppText variant="label" style={styles.listLabel}>
            My List
          </AppText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: H_PADDING, paddingBottom: 20 },
  poster: { backgroundColor: '#222', overflow: 'hidden' },
  // Sufficient breathing room between the artwork and the descriptors/actions.
  tags: { textAlign: 'center', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: { backgroundColor: '#FFFFFF' },
  playLabel: { color: '#000', marginLeft: 8 },
  listBtn: { backgroundColor: 'rgba(40,40,46,0.6)', borderWidth: 1 },
  listLabel: { marginLeft: 8 },
});
