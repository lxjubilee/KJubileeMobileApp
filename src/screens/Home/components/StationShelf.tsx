import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SectionHeader } from '@/components/common';
import type { RadioStation } from '@/services/radio';
import { StationTile, TILE_W } from './StationTile';

/**
 * One horizontally-scrolling row of station tiles.
 *
 * "See all" opens the full grid, and appears once a shelf holds more than three
 * stations — a shelf that already fits on screen has nothing more to show. That
 * threshold and the header itself are the same ones the music rails used, so
 * both kinds of row behave identically.
 *
 * The shelves are long — the teaching section alone is 34 stations — so each row
 * is a FlatList rather than a mapped ScrollView, and windowing keeps only the
 * visible tiles mounted. `getItemLayout` is supplied because every tile is a
 * fixed width, which lets the list skip measurement entirely.
 */

/** Above this, the row links to the full grid rather than scrolling forever. */
const SEE_ALL_MIN = 3;
/** Cap the row itself, so a 34-station shelf does not mount a 34-item list. */
const MAX_PREVIEW = 12;

interface Props {
  title: string;
  stations: RadioStation[];
  playingSlug: string | null;
  onPick: (station: RadioStation) => void;
  onSeeAll: (title: string, stations: RadioStation[]) => void;
}

export const StationShelf: React.FC<Props> = React.memo(
  ({ title, stations, playingSlug, onPick, onSeeAll }) => {
    if (!stations.length) return null;

    const showSeeAll = stations.length > SEE_ALL_MIN;
    const preview = stations.length > MAX_PREVIEW ? stations.slice(0, MAX_PREVIEW) : stations;

    return (
      <View style={styles.wrap}>
        <SectionHeader
          title={title}
          onSeeAll={showSeeAll ? () => onSeeAll(title, stations) : undefined}
        />
        <FlatList
          horizontal
          data={preview}
          keyExtractor={(s) => s.slug}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: TILE_W + 12,
            offset: (TILE_W + 12) * index,
            index,
          })}
          renderItem={({ item }) => (
            <StationTile station={item} playing={item.slug === playingSlug} onPress={onPick} />
          )}
        />
      </View>
    );
  },
);
StationShelf.displayName = 'StationShelf';

const styles = StyleSheet.create({
  wrap: { marginTop: 26 },
  row: { paddingHorizontal: 16 },
});
