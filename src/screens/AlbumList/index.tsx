import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen, AppText, Loader, IconButton } from '@/components/common';
import { AlbumCard } from '@/components/cards';
import { FloatingMiniPlayer } from '@/components/player';
import { useVisibleAlbums } from '@/hooks';
import { localizeTitle } from '@/localization';
import { AlbumRepository, ArtistRepository } from '@/repositories';
import { Album } from '@/types';
import { pickByIds } from '@/utils';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
const GAP = 16;
const CARD_W = (width - GAP * 3) / 2;
// Height of the pinned black header row (below the status bar) that holds the
// back button and stays visible while the grid scrolls.
const HEADER_HEIGHT = 38;

/** Full grid of albums — the "See all"/"See more" target of a Home rail. Shows a
 *  specific list (`albumIds`, e.g. a section's albums) when given, otherwise every
 *  album for `artistId`. */
export const AlbumListScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'AlbumList'>['route']>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const visibleAlbums = useVisibleAlbums(albums);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // A section passes an explicit `albumIds` list (order preserved); an artist
    // rail passes `artistId` and we fetch that artist's albums.
    const load: Promise<Album[]> = params.albumIds
      ? AlbumRepository.list().then((all) => pickByIds(all, params.albumIds ?? []))
      : ArtistRepository.getAlbums(params.artistId ?? '');
    load
      .then((a) => {
        if (!active) return;
        // Dedupe by id — the catalog can list the same album in multiple places.
        setAlbums(Array.from(new Map(a.map((album) => [album.id, album])).values()));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.artistId, params.albumIds]);

  if (loading) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <FlatList
        data={visibleAlbums}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.content,
          // Clear the fixed header at the top and the mini player / nav bar at the bottom.
          { paddingTop: insets.top + HEADER_HEIGHT + 8, paddingBottom: 96 + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="display" numberOfLines={2} style={styles.title}>
              {params.title}
            </AppText>
          </View>
        }
        renderItem={({ item }) => {
          // Opened from Home → mirror the rail and print the genre under the
          // title. Real manifest tags only, matching Rail: `album.genre` would
          // fall back to the catalog family label and just echo the grid title.
          const genre = params.showAlbumGenre ? item.genres?.[0] : undefined;
          return (
            <AlbumCard
              album={item}
              width={CARD_W}
              caption={params.genreByItem?.[item.id]}
              subtitle={genre ? localizeTitle(t, genre) : undefined}
              onPress={(al) => navigation.navigate('AlbumDetails', { albumId: al.id })}
            />
          );
        }}
      />

      {/* Persistent black header with the back button — rendered outside the
          FlatList so it stays pinned while the grid scrolls. */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
      </View>

      <FloatingMiniPlayer />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: GAP },
  header: { alignItems: 'flex-start', paddingBottom: 16 },
  // Solid-black header pinned to the top (outside the FlatList) so the back
  // button never scrolls away. `paddingTop: insets.top` drops the chevron below
  // the status bar.
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: { marginTop: 8 },
  column: { gap: GAP, marginBottom: GAP },
});

export default AlbumListScreen;
