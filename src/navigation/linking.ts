import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Deep-link configuration for the custom scheme + universal/App Links on the
 * web domain, e.g. kjubilee://album/JEIM1071EN or https://kjubilee.com/album.
 * Album share links (…/album?c=CODE) are handled by useShareDeepLinks, which
 * navigates to the album; React Navigation owns the path-style routes below.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['kjubilee://', 'https://kjubilee.com', 'https://www.kjubilee.com'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          HomeTab: 'home',
          BrowseTab: 'browse',
          SearchTab: 'search',
          ProfileTab: 'profile',
        },
      },
      AlbumDetails: 'album/:albumId',
      ArtistDetails: 'artist/:artistId',
      MusicPlayer: 'player',
    },
  },
};
