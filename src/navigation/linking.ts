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
          // The site calls this surface both /dial and /player; the app answers
          // to the first, and frequency links (…/hm308.70) reach it through
          // useShareDeepLinks, which resolves them before this table is consulted.
          DialTab: 'dial',
          BrowseTab: 'browse',
          MapTab: 'map',
          ProfileTab: 'profile',
        },
      },
      AlbumDetails: 'album/:albumId',
      ArtistDetails: 'artist/:artistId',
      MusicPlayer: 'player',
      // The site routes these through a hash (/#hm and /#hm/<slug>), which a
      // native link cannot carry — a fragment never leaves the browser. These
      // are the app's own paths for the same two destinations.
      BandArticles: 'band',
      BandArticleDetail: 'band/:slug',
    },
  },
};
