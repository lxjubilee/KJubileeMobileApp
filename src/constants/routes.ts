/**
 * Centralized route name constants. Using these instead of string literals keeps
 * navigation type-safe and makes adding/renaming screens a single-file change.
 */
export const ROUTES = {
  // Root stack
  MAIN_TABS: 'MainTabs',
  MUSIC_PLAYER: 'MusicPlayer',
  ALBUM_DETAILS: 'AlbumDetails',
  ARTIST_DETAILS: 'ArtistDetails',

  // Bottom tabs
  HOME_TAB: 'HomeTab',
  BROWSE_TAB: 'BrowseTab',
  SEARCH_TAB: 'SearchTab',
  PLAYLISTS_TAB: 'PlaylistsTab',

  // Screens within stacks
  HOME: 'Home',
  BROWSE: 'Browse',
  SEARCH: 'Search',
  PLAYLISTS: 'Playlists',
  DOWNLOADS: 'Downloads',
  PROFILE: 'Profile',
} as const;
