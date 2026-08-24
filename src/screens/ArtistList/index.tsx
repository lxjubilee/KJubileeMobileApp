import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText, Loader, IconButton } from '@/components/common';
import { ArtistCard } from '@/components/cards';
import { FloatingMiniPlayer } from '@/components/player';
import { useVisibleArtists } from '@/hooks';
import { getCatalogIndex } from '@/services/catalog';
import { Artist } from '@/types';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
const GAP = 16;
const CARD_W = (width - GAP * 3) / 2;
// Height of the pinned black header row (below the status bar) that holds the
// back button and stays visible while the grid scrolls.
const HEADER_HEIGHT = 38;

/** Full grid of artists — the "See all" target of a Home artist rail. Resolves
 *  the rail's `artistIds` against the catalog index, in rail order. */
export const ArtistListScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'ArtistList'>['route']>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [artists, setArtists] = useState<Artist[] | null>(null);
  const visibleArtists = useVisibleArtists(artists ?? []);

  useEffect(() => {
    let active = true;
    getCatalogIndex()
      .then((index) => {
        if (!active) return;
        // Order follows the rail; artists that left the catalog just drop out.
        setArtists(
          params.artistIds
            .map((id) => index.artistsById.get(id))
            .filter((ar): ar is Artist => ar != null),
        );
      })
      .catch(() => active && setArtists([]));
    return () => {
      active = false;
    };
  }, [params.artistIds]);

  if (artists == null) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <FlatList
        data={visibleArtists}
        keyExtractor={(ar) => ar.id}
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
        renderItem={({ item }) => (
          <ArtistCard
            artist={item}
            size={CARD_W}
            onPress={(ar) => navigation.navigate('ArtistDetails', { artistId: ar.id })}
          />
        )}
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

export default ArtistListScreen;
