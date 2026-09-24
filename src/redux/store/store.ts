import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { TrackPlayer, isExpoGo } from '@/services/music';
import { logger } from '@/utils/logger';
import { signOut, deleteAccount, clearSession } from '../slices/authSlice';
import { rootReducer, RootState } from './rootReducer';

/**
 * Stop playback the instant a session ends. Covers every sign-out path —
 * explicit sign out, account deletion, and forced logout (refresh failure) —
 * so audio never keeps playing in the background after the user is gone.
 */
const playbackTeardown = createListenerMiddleware();
playbackTeardown.startListening({
  matcher: isAnyOf(signOut.fulfilled, deleteAccount.fulfilled, clearSession),
  effect: async () => {
    if (isExpoGo) return;
    try {
      await TrackPlayer.reset();
    } catch (e) {
      logger.warn('playback teardown failed', e);
    }
  },
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches non-serializable actions internally.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).prepend(playbackTeardown.middleware),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type { RootState };
