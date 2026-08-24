import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen, Loader, AppText, Placeholder, IconButton } from '@/components/common';
import { ArtistCard } from '@/components/cards';
import { useAppSelector, useVisibleArtists } from '@/hooks';
import { getCatalogIndex } from '@/services/catalog';
import { Artist } from '@/types';
import type { PlaylistsStackParamList, RootStackParamList } from '@/navigation/types';

// Pushes within the Playlists stack; opens ArtistDetails on the root stack.
type Nav = NativeStackNavigationProp<PlaylistsStackParamList & RootStackParamList>;
const { width } = Dimensions.get('window');
const COL_W = (width - 48) / 2;

/**
 * The full list of followed artists (reached from the Library "Artists"
 * shortcut). Follows are stored as ids only, so resolve them against the
 * catalog index — in saved order, newest first — and drop any artist no longer
 * in the catalog.
 */
export const FollowedArtistsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  const followedIds = useAppSelector((s) => s.library.followedArtistIds);
  const [byId, setById] = useState<Map<string, Artist> | null>(null);

  useEffect(() => {
    let active = true;
    getCatalogIndex()
      .then((index) => active && setById(index.artistsById))
      .catch(() => active && setById(new Map()));
    return () => {
      active = false;
    };
  }, []);

  const followed = useMemo(
    () =>
      byId
        ? followedIds.map((id) => byId.get(id)).filter((ar): ar is Artist => ar != null)
        : [],
    [byId, followedIds],
  );
  // Personal collection — never hidden by the active catalog language.
  const artists = useVisibleArtists(followed, { filterByLanguage: false });

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        <AppText variant="h1">{t('library.artists')}</AppText>
      </View>

      {byId == null ? (
        <Loader />
      ) : artists.length ? (
        <FlatList
          data={artists}
          keyExtractor={(ar) => ar.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <ArtistCard
              artist={item}
              size={COL_W}
              onPress={(ar) => navigation.navigate('ArtistDetails', { artistId: ar.id })}
            />
          )}
        />
      ) : (
        <Placeholder
          icon="people-outline"
          title={t('library.artists')}
          subtitle={t('library.emptyArtists')}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  grid: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  column: { justifyContent: 'space-between', marginBottom: 20 },
});

export default FollowedArtistsScreen;
