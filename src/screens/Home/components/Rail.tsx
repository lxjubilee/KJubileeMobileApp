import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AlbumCard, ArtistCard } from '@/components/cards';
import { SectionHeader } from '@/components/common';
import { localizeTitle } from '@/localization';
import { Album, Artist, ResolvedRail } from '@/types';

interface RailProps {
  rail: ResolvedRail;
  onAlbumPress: (album: Album) => void;
  onArtistPress: (artist: Artist) => void;
  onSeeAll?: (rail: ResolvedRail) => void;
  /** Print each album's genre under its title. Set on the Home page only. */
  showAlbumGenre?: boolean;
}

/** A single horizontally-scrolling Home row of albums or artists. */
export const Rail: React.FC<RailProps> = ({
  rail,
  onAlbumPress,
  onArtistPress,
  onSeeAll,
  showAlbumGenre,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  // Items are already artwork-filtered upstream (useVisibleRails); empty rails
  // are dropped there too, so these guards are just defensive.
  const albums = rail.albums ?? [];
  const artists = rail.artists ?? [];
  // Localize dynamic (config-driven) rail titles — genre and section names.
  // Unmapped titles (artist names, custom sections) fall back to the raw string.
  const title = localizeTitle(t, rail.title);
  // "See all" opens the full grid; it appears once a rail holds more than 3
  // items — a rail that already fits on screen needs no link. Album rails also
  // cap the row itself at MAX_PREVIEW; the artist rail scrolls through all of
  // its artists.
  const MAX_PREVIEW = 10;
  const SEE_ALL_MIN = 3;

  if (rail.itemType === 'artist') {
    if (!artists.length) return null;
    const showSeeAll = artists.length > SEE_ALL_MIN;
    return (
      <>
        <SectionHeader
          title={title}
          onSeeAll={showSeeAll ? () => onSeeAll?.(rail) : undefined}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={artists}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
          ItemSeparatorComponent={() => <Sep />}
          renderItem={({ item }) => <ArtistCard artist={item} onPress={onArtistPress} />}
        />
      </>
    );
  }

  if (!albums.length) return null;
  // An artist-backed rail always has a full list to open; otherwise the same
  // >3 rule as above applies.
  const hasMore = albums.length > MAX_PREVIEW;
  const showSeeAll = !!rail.seeAllArtistId || albums.length > SEE_ALL_MIN;
  const preview = hasMore ? albums.slice(0, MAX_PREVIEW) : albums;
  return (
    <>
      <SectionHeader
        title={title}
        onSeeAll={showSeeAll ? () => onSeeAll?.(rail) : undefined}
      />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={preview}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
        ItemSeparatorComponent={() => <Sep />}
        renderItem={({ item }) => {
          // Only the album's real manifest tags. `item.genre` falls back to the
          // catalog family label, which would just echo the rail title under
          // every card — untagged albums show the title alone instead.
          const genre = showAlbumGenre ? item.genres?.[0] : undefined;
          return (
            <AlbumCard
              album={item}
              onPress={onAlbumPress}
              caption={rail.showGenre ? rail.genreByItem?.[item.id] : undefined}
              subtitle={genre ? localizeTitle(t, genre) : undefined}
            />
          );
        }}
      />
    </>
  );
};

const Sep = () => <View style={styles.sep} />;

const styles = StyleSheet.create({
  sep: { width: 14 },
});
