import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/** Bottom-tab routes. ProfileTab nests its own stack, so it carries those params. */
export type MainTabParamList = {
  HomeTab: undefined;
  /** The Dial — the tuner surface, and radio's signature screen. */
  DialTab: undefined;
  BrowseTab: undefined;
  /** The broadcast map — every HM transmit city on earth. */
  MapTab: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Root stack. AlbumDetails/ArtistDetails live here (not inside a tab) so they
 * present full-screen over the tab bar, Netflix-style; MusicPlayer is a modal.
 */
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AlbumDetails: { albumId: string };
  AlbumReviews: { albumId: string; albumTitle: string };
  ArtistDetails: { artistId: string };
  /** `genreByItem` is carried from a showGenre section so its "See all" grid
   *  captions covers the same way the Home rail does. Albums absent from the map
   *  (the catalog gives them no genre) keep their title.
   *  `showAlbumGenre` is set when "See all" was opened from the Home page, so the
   *  grid prints each album's genre under its title like the rail it came from. */
  AlbumList: {
    title: string;
    artistId?: string;
    albumIds?: string[];
    genreByItem?: Record<string, string>;
    showAlbumGenre?: boolean;
  };
  /** A station's own page: story, host, and the day's programme guide. */
  StationDetail: { slug: string };
  /** Full grid behind a Home shelf's "See all". Slugs are carried in shelf order
   *  and re-resolved against the catalog by the screen, so the params stay small. */
  StationList: {
    title: string;
    slugs: string[];
  };
  /** Full grid behind an artist rail's "See all". Ids are carried in rail order. */
  ArtistList: {
    title: string;
    artistIds: string[];
  };
  MusicPlayer: undefined;
};

/**
 * Unauthenticated flow, rooted at the Jubilee Door.
 *
 * Sign in, sign up, the 2FA challenge and the sign-up verification are all
 * steps INSIDE JubileeDoor rather than routes, so the flow cannot be entered
 * halfway through and the Turnstile WebView is never left mounted under a
 * pushed screen.
 */
export type AuthStackParamList = {
  /** The email-first Jubilee Door. `email` pre-fills the first step. */
  JubileeDoor: { email?: string } | undefined;
  /** `email` pre-fills the field when the door hands off a typed address. */
  ForgotPassword: { email?: string } | undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};

/**
 * Per-tab inner stack for the Profile tab, which owns account settings, the
 * legal screens.
 */
export type ProfileStackParamList = {
  Profile: undefined;
  ChangePassword: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

// Typed screen-prop helpers
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
