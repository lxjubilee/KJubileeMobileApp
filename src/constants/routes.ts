/**
 * Centralized route name constants. Using these instead of string literals keeps
 * navigation type-safe and makes adding/renaming screens a single-file change.
 */
export const ROUTES = {
  // Root stack
  MAIN_TABS: 'MainTabs',

  // Bottom tabs
  HOME_TAB: 'HomeTab',
  BROWSE_TAB: 'BrowseTab',
  PROFILE_TAB: 'ProfileTab',

  // Screens within stacks
  HOME: 'Home',
  BROWSE: 'Browse',
  PROFILE: 'Profile',
} as const;
