import React, { useCallback } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText, Button, IconButton } from '@/components/common';
import { FloatingMiniPlayer } from '@/components/player';
import { useTheme } from '@/context';
import { useAppSelector, useFavoriteStations, useRadio } from '@/hooks';
import { tune } from '@/services/radio';
import type { RadioStation } from '@/services/radio';
import { openSignIn } from '@/navigation/navigationRef';
import { StationTile } from '@/screens/Home/components/StationTile';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GAP = 16;
const HEADER_HEIGHT = 38;

/**
 * The account's favourite stations — the website's Favorites tab on `/radio`.
 *
 * The same two-column grid as a shelf's "See all", but read live from the store
 * rather than from route params: un-hearting a tile here takes it off the page
 * at once, which a snapshot of slugs could not do.
 */
export const FavoriteStationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const radio = useRadio();
  const { width } = useWindowDimensions();
  const signedIn = useAppSelector((s) => s.auth.user != null);
  const loading = useAppSelector((s) => s.stationFavorites.status === 'loading');
  const stations = useFavoriteStations();
  const tileW = (width - GAP * 3) / 2;

  const onPick = useCallback(
    (station: RadioStation) => {
      if (!station.live) return;
      void tune(station.slug);
      navigation.navigate('StationDetail', { slug: station.slug });
    },
    [navigation],
  );

  const playingSlug = radio.playing ? radio.slug : null;

  const empty = (
    <View style={styles.empty}>
      <Ionicons name="heart-outline" size={44} color={theme.colors.iconMuted} />
      {signedIn ? (
        <>
          <AppText variant="h3" style={styles.emptyTitle}>
            {loading ? 'Loading your favourites…' : 'No favourite stations yet'}
          </AppText>
          {loading ? null : (
            <AppText variant="bodySm" color="textMuted" style={styles.emptyText}>
              Tap the heart on any station to save it here.
            </AppText>
          )}
        </>
      ) : (
        // Reachable signed out only by signing out while this page is open.
        <>
          <AppText variant="h3" style={styles.emptyTitle}>
            Favourites live on your account
          </AppText>
          <AppText variant="bodySm" color="textMuted" style={styles.emptyText}>
            Sign in with your Jubilee ID to save stations and find them on any device.
          </AppText>
          <Button
            label="Sign in"
            icon="log-in-outline"
            onPress={() => openSignIn('likes')}
            style={styles.emptyCta}
          />
        </>
      )}
    </View>
  );

  return (
    <Screen safeArea={false}>
      <FlatList
        data={signedIn ? stations : []}
        keyExtractor={(s) => s.slug}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + HEADER_HEIGHT + 8, paddingBottom: 96 + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="display" numberOfLines={2} style={styles.title}>
              Favourite Stations
            </AppText>
            {signedIn && stations.length ? (
              <AppText variant="bodySm" color="textMuted" style={styles.count}>
                {stations.length === 1 ? '1 station' : `${stations.length} stations`}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={empty}
        renderItem={({ item }) => (
          <StationTile
            station={item}
            width={tileW}
            playing={item.slug === playingSlug}
            onPress={onPick}
          />
        )}
      />

      <View
        style={[styles.fixedHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}
      >
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
      </View>

      <FloatingMiniPlayer />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: GAP },
  header: { alignItems: 'flex-start', paddingBottom: 16 },
  title: { marginTop: 8 },
  count: { marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyText: { marginTop: 8, textAlign: 'center' },
  emptyCta: { marginTop: 24, alignSelf: 'stretch' },
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
  column: { gap: GAP, marginBottom: GAP },
});

export default FavoriteStationsScreen;
