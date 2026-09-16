import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { AuthGateReason } from './navigationRef';

/** Bottom-tab routes. ProfileTab nests its own stack, so it carries those params. */
export type MainTabParamList = {
  HomeTab: undefined;
  /**
   * The Dial — the tuner surface, and radio's signature screen.
   *
   * `hm` is a frequency to open on, as `'308.70'`, arriving from a
   * `kjubilee.com/hm308.70` link. Undefined on a normal tab press, where the
   * dial opens on whatever is already sounding.
   */
  DialTab: { hm?: string } | undefined;
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
  /** The account's favourite stations, read live from the store. */
  FavoriteStations: undefined;
  /** Full grid behind an artist rail's "See all". Ids are carried in rail order. */
  ArtistList: {
    title: string;
    artistIds: string[];
  };
  /** The Heavenly Band's essays — the site's right-hand nav item. */
  BandArticles: undefined;
  /** One essay. Only the slug travels; the index and the body are both resolved
   *  by the screen, the first from the bundle and the second over the network. */
  BandArticleDetail: { slug: string };
  MusicPlayer: undefined;

  // --- Sign-in, reached on demand ------------------------------------------
  // The door used to be a separate navigator that REPLACED this one while
  // signed out. It lives here now because signing in is optional: the app opens
  // on Home for everyone, and the door is pushed only when someone asks for it
  // or reaches for something that genuinely needs an account (App Store
  // guideline 5.1.1(v) — registration may not gate features that aren't
  // account-based).
  //
  // Sign in, sign up and the 2FA challenge are all steps INSIDE JubileeDoor
  // rather than routes, so the flow cannot be entered halfway through and the
  // Turnstile WebView is never left mounted under a pushed screen.
  /**
   * The email-first Jubilee Door. `email` pre-fills the first step; `reason`
   * says which account-only action asked for it, so the door can explain itself.
   */
  JubileeDoor: { email?: string; reason?: AuthGateReason } | undefined;
  /** `email` pre-fills the field when the door hands off a typed address. */
  ForgotPassword: { email?: string } | undefined;
  /**
   * Also routes in ProfileStackParamList. Registered in both because the door
   * links to them while signed out, when the Profile tab's stack is behind it
   * rather than above it — a navigator can only reach its own routes.
   */
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};

/**
 * Per-tab inner stack for the Profile tab, which owns account settings, the
 * legal screens.
 */
export type ProfileStackParamList = {
  Profile: undefined;
  EditName: undefined;
  ChangePassword: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};

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
