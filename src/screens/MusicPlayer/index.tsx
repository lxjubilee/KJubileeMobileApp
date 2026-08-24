import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText, Artwork, IconButton } from '@/components/common';
import { ProgressBar } from '@/components/player';
import { TrackRow } from '@/components/cards';
import { TrackOptionsModal, TrackOption } from '@/components/modals';
import { usePlaylistMenu } from '@/components/playlists';
import { useAppDispatch, useIsSongLiked, usePlayer, useSafeProgress } from '@/hooks';
import { shareAlbum } from '@/services/share';
import { toggleSongLike } from '@/redux';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
const ART = width - 48;

export const MusicPlayerScreen: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {
    currentTrack,
    queue,
    isPlaying,
    isBuffering,
    repeatMode,
    shuffle,
    toggle,
    next,
    previous,
    seekTo,
    cycleRepeat,
    toggleShuffle,
    playFrom,
  } = usePlayer();
  const { addToPlaylist } = usePlaylistMenu();
  const { position, duration } = useSafeProgress(250);
  const isFavorite = useIsSongLiked(currentTrack ?? { albumId: '', trackNumber: undefined });
  const [queueOpen, setQueueOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  if (!currentTrack) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.colors.background }]}>
        <AppText color="textMuted">{t('player.nothingPlaying')}</AppText>
        <IconButton
          name="chevron-down"
          size={28}
          onPress={() => navigation.goBack()}
          style={{ ...styles.emptyClose, top: insets.top + 8 }}
        />
      </View>
    );
  }

  const repeatActive = repeatMode !== 'off';

  // Sharing is album-level: share the album the current track belongs to.
  const onShare = () => {
    void shareAlbum({
      code: currentTrack.albumId,
      title: currentTrack.albumName,
      artistName: currentTrack.artistName,
    });
  };

  // Overflow ("•••") menu actions for the current track.
  const trackOptions: TrackOption[] = [
    {
      key: 'like',
      label: isFavorite ? t('player.removeFromLiked') : t('player.like'),
      icon: isFavorite ? 'heart' : 'heart-outline',
      onPress: (track) => dispatch(toggleSongLike(track)),
    },
    {
      key: 'album',
      label: t('player.goToAlbum'),
      icon: 'albums-outline',
      onPress: (track) => navigation.navigate('AlbumDetails', { albumId: track.albumId }),
    },
    {
      key: 'artist',
      label: t('player.goToArtist'),
      icon: 'person-outline',
      onPress: (track) => navigation.navigate('ArtistDetails', { artistId: track.artistId }),
    },
    {
      key: 'share',
      label: t('player.share'),
      icon: 'share-outline',
      onPress: () => onShare(),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <Artwork uri={currentTrack.artwork} style={StyleSheet.absoluteFill} blurRadius={60} iconSize={0} />
      <LinearGradient colors={['rgba(11,11,15,0.4)', '#0B0B0F']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <IconButton name="chevron-down" size={28} onPress={() => navigation.goBack()} />
        <AppText variant="label" color="textSecondary">
          {currentTrack.albumName}
        </AppText>
        <IconButton name="ellipsis-horizontal" size={24} onPress={() => setOptionsOpen(true)} />
      </View>

      <View style={styles.artWrap}>
        <Artwork
          uri={currentTrack.artwork}
          style={[styles.art, { width: ART, height: ART, borderRadius: theme.radius.lg }]}
          iconSize={Math.round(ART * 0.3)}
        />
      </View>

      <View style={[styles.body, { paddingBottom: 36 + insets.bottom }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <AppText variant="display" numberOfLines={1}>
              {currentTrack.title}
            </AppText>
            <Pressable
              onPress={() =>
                navigation.navigate('ArtistDetails', { artistId: currentTrack.artistId })
              }
            >
              <AppText variant="h3" color="textSecondary" numberOfLines={1}>
                {currentTrack.artistName}
              </AppText>
            </Pressable>
          </View>
          <View style={styles.titleActions}>
            <Pressable onPress={() => addToPlaylist(currentTrack)} hitSlop={10} style={styles.titleAction}>
              <MaterialCommunityIcons name="playlist-plus" size={30} color={theme.colors.icon} />
            </Pressable>
            <IconButton
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={28}
              color={isFavorite ? theme.colors.accent : theme.colors.icon}
              onPress={() => dispatch(toggleSongLike(currentTrack))}
            />
          </View>
        </View>

        <ProgressBar position={position} duration={duration} onSeek={seekTo} />

        <View style={styles.controls}>
          <IconButton
            name="shuffle"
            size={24}
            color={shuffle ? theme.colors.accent : theme.colors.iconMuted}
            onPress={toggleShuffle}
          />
          <IconButton name="play-skip-back" size={34} onPress={previous} />
          <Pressable
            onPress={toggle}
            style={[styles.playBtn, { backgroundColor: theme.colors.text }]}
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <IconButton
                name={isPlaying ? 'pause' : 'play'}
                size={34}
                color="#000"
                onPress={toggle}
                // Optically center the play triangle (its mass sits left of its
                // bounding box); pause is symmetric and needs no nudge.
                style={isPlaying ? undefined : { marginLeft: 5 }}
              />
            )}
          </Pressable>
          <IconButton name="play-skip-forward" size={34} onPress={next} />
          <Pressable onPress={cycleRepeat} hitSlop={10} style={styles.repeatBtn}>
            <MaterialCommunityIcons
              name={repeatMode === 'track' ? 'repeat-once' : 'repeat'}
              size={24}
              color={repeatActive ? theme.colors.accent : theme.colors.iconMuted}
            />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <IconButton name="share-outline" size={22} color={theme.colors.iconMuted} onPress={onShare} />
          <IconButton
            name="list"
            size={22}
            color={theme.colors.iconMuted}
            onPress={() => setQueueOpen(true)}
          />
        </View>
      </View>

      {/* Up-next queue sheet. */}
      <Modal
        visible={queueOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setQueueOpen(false)}
      >
        <Pressable style={styles.queueBackdrop} onPress={() => setQueueOpen(false)}>
          <Pressable
            style={[
              styles.queueSheet,
              { backgroundColor: theme.colors.backgroundElevated, paddingBottom: 24 + insets.bottom },
            ]}
          >
            <View style={styles.queueHeader}>
              <AppText variant="h2">{t('player.upNext')}</AppText>
              <IconButton name="close" size={24} onPress={() => setQueueOpen(false)} />
            </View>
            <FlatList
              data={queue}
              keyExtractor={(t) => t.id}
              contentContainerStyle={styles.queueList}
              renderItem={({ item }) => (
                <TrackRow
                  track={item}
                  isActive={currentTrack.id === item.id}
                  onPress={() => {
                    void playFrom(queue, item.id);
                    setQueueOpen(false);
                  }}
                />
              )}
              ListEmptyComponent={
                <AppText color="textMuted" style={styles.queueEmpty}>
                  {t('player.queueEmpty')}
                </AppText>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Overflow options for the current track. */}
      <TrackOptionsModal
        track={optionsOpen ? currentTrack : null}
        options={trackOptions}
        onClose={() => setOptionsOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyClose: { position: 'absolute', left: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  artWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  art: { backgroundColor: '#222' },
  body: { paddingHorizontal: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  titleText: { flex: 1, marginRight: 12 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titleAction: { alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  playBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  repeatBtn: { alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  queueBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  queueSheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  queueList: { paddingBottom: 12 },
  queueEmpty: { textAlign: 'center', paddingVertical: 24 },
});

export default MusicPlayerScreen;
