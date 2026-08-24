import { combineReducers } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistReducer } from 'redux-persist';

import homeReducer from '../slices/homeSlice';
import searchReducer from '../slices/searchSlice';
import libraryReducer from '../slices/librarySlice';
import likesReducer from '../slices/likesSlice';
import playlistsReducer from '../slices/playlistsSlice';
import downloadsReducer from '../slices/downloadsSlice';
import playerReducer from '../slices/playerSlice';
import authReducer from '../slices/authSlice';
import artworkReducer from '../slices/artworkSlice';
import settingsReducer from '../slices/settingsSlice';
import entitlementReducer from '../slices/entitlementSlice';

/**
 * Per-slice persistence. We persist only durable data:
 *  - library & downloads in full
 *  - player: just user prefs (shuffle/repeat), NOT transient playback state
 *  - search: just recent terms, NOT live query/results
 *  - home: just the resolved feed, so the catalog paints instantly on cold start
 *    (stale-while-revalidate); `status`/`error` stay transient so it still refetches.
 */
const persistedHome = persistReducer(
  { key: 'home', storage: AsyncStorage, whitelist: ['feed'] },
  homeReducer,
);

const persistedPlayer = persistReducer(
  { key: 'player', storage: AsyncStorage, whitelist: ['repeatMode', 'shuffle'] },
  playerReducer,
);

const persistedSearch = persistReducer(
  { key: 'search', storage: AsyncStorage, whitelist: ['recent'] },
  searchReducer,
);

const persistedLibrary = persistReducer(
  { key: 'library', storage: AsyncStorage },
  libraryReducer,
);

// Server-backed likes: persist only the membership set so hearts paint instantly
// on cold start (stale-while-revalidate; fetchLikes() overwrites on startup).
const persistedLikes = persistReducer(
  { key: 'likes', storage: AsyncStorage, whitelist: ['keys'] },
  likesReducer,
);

const persistedDownloads = persistReducer(
  { key: 'downloads', storage: AsyncStorage },
  downloadsReducer,
);

// Persisted so covers known-missing from a prior launch are filtered out
// immediately, without flashing in and then disappearing.
const persistedArtwork = persistReducer(
  { key: 'artwork', storage: AsyncStorage },
  artworkReducer,
);

// Persist the selected language so the chosen UI locale + catalog filter
// survive restarts.
const persistedSettings = persistReducer(
  { key: 'settings', storage: AsyncStorage, whitelist: ['language'] },
  settingsReducer,
);

export const rootReducer = combineReducers({
  home: persistedHome,
  search: persistedSearch,
  library: persistedLibrary,
  likes: persistedLikes,
  // Playlists are server-backed (/api/me/playlists) — fetched on demand, not persisted.
  playlists: playlistsReducer,
  downloads: persistedDownloads,
  player: persistedPlayer,
  auth: authReducer,
  artwork: persistedArtwork,
  settings: persistedSettings,
  // Plan entitlement is fetched fresh on auth (/api/subscriptions/me) — not persisted.
  entitlement: entitlementReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
