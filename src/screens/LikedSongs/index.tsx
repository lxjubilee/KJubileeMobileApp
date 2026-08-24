import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen, Loader, AppText, Placeholder, IconButton } from '@/components/common';
import { TrackRow } from '@/components/cards';
import { useAppDispatch, useLikedTracks, usePlayer } from '@/hooks';
import { toggleSongLike } from '@/redux';
import { usePlaylistMenu } from '@/components/playlists';
import type { PlaylistsStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<PlaylistsStackParamList>;

/**
 * The full list of liked songs (reached from the Library "Liked Songs"
 * shortcut). Favourites are stored as ids only, so resolve them against the
 * catalog index — in saved order, newest first — and drop any track no longer
 * in the catalog.
 */
export const LikedSongsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { playFrom, currentTrack } = usePlayer();
  const { openTrackOptions } = usePlaylistMenu();

  // Server-backed likes, resolved to playable catalog tracks (never hidden by
  // the active catalog language — a personal collection).
  const { tracks, loading } = useLikedTracks();

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        <AppText variant="h1">{t('library.favorites')}</AppText>
      </View>

      {loading ? (
        <Loader />
      ) : tracks.length ? (
        <FlatList
          data={tracks}
          keyExtractor={(tr) => tr.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              isActive={currentTrack?.id === item.id}
              isFavorite
              onPress={() => playFrom(tracks, item.id)}
              onToggleFavorite={(tr) => dispatch(toggleSongLike(tr))}
              onOptions={openTrackOptions}
            />
          )}
        />
      ) : (
        <Placeholder
          icon="heart-outline"
          title={t('library.favorites')}
          subtitle={t('library.emptyLiked')}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
});

export default LikedSongsScreen;
