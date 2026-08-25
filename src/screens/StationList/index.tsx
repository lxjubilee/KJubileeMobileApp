import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText, IconButton } from '@/components/common';
import { FloatingMiniPlayer } from '@/components/player';
import { useRadio } from '@/hooks';
import { getStationsBySlugs, tune } from '@/services/radio';
import type { RadioStation } from '@/services/radio';
import { StationTile } from '@/screens/Home/components/StationTile';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GAP = 16;
/** Height of the pinned header row holding the back button. */
const HEADER_HEIGHT = 38;

/**
 * The full grid behind a Home shelf's "See all".
 *
 * Slugs are carried in the route rather than the resolved stations, so the
 * screen re-reads the catalog itself — a shelf's contents stay a catalog concern
 * and the route params stay small and serialisable.
 *
 * Tiles are the same component the shelf uses, so a station looks identical in
 * both places; only the width differs.
 */
export const StationListScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'StationList'>['route']>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const radio = useRadio();
  const { width } = useWindowDimensions();

  const stations = useMemo(() => getStationsBySlugs(params.slugs), [params.slugs]);
  const tileW = (width - GAP * 3) / 2;

  const onPick = useCallback(
    (station: RadioStation) => {
      if (!station.live) return;
      void tune(station.slug);
      navigation.navigate('MainTabs', { screen: 'DialTab' });
    },
    [navigation],
  );

  const playingSlug = radio.playing ? radio.slug : null;
  const liveCount = stations.filter((s) => s.live).length;

  return (
    <Screen safeArea={false}>
      <FlatList
        data={stations}
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
              {params.title}
            </AppText>
            <AppText variant="bodySm" color="textMuted" style={styles.count}>
              {`${stations.length} stations · ${liveCount} on air`}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <StationTile
            station={item}
            width={tileW}
            playing={item.slug === playingSlug}
            onPress={onPick}
          />
        )}
      />

      {/* Pinned back button — outside the list so it never scrolls away. */}
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

export default StationListScreen;
