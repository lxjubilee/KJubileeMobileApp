import { combineReducers } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistReducer } from 'redux-persist';

import stationFavoritesReducer from '../slices/stationFavoritesSlice';
import stationLikesReducer from '../slices/stationLikesSlice';
import authReducer from '../slices/authSlice';
import settingsReducer from '../slices/settingsSlice';

// Station hearts: the membership list only, so they paint on a cold start;
// fetchStationFavorites() revalidates once the session is back.
const persistedStationFavorites = persistReducer(
  { key: 'stationFavorites', storage: AsyncStorage, whitelist: ['slugs'] },
  stationFavoritesReducer,
);

// Station thumbs live only on the device — there is no server copy to reload.
const persistedStationLikes = persistReducer(
  { key: 'stationLikes', storage: AsyncStorage },
  stationLikesReducer,
);

// Persist the selected language so the chosen UI locale survives restarts.
const persistedSettings = persistReducer(
  { key: 'settings', storage: AsyncStorage, whitelist: ['language'] },
  settingsReducer,
);

export const rootReducer = combineReducers({
  stationFavorites: persistedStationFavorites,
  stationLikes: persistedStationLikes,
  auth: authReducer,
  settings: persistedSettings,
});

export type RootState = ReturnType<typeof rootReducer>;
