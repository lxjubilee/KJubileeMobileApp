import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import { Orbitron_600SemiBold } from '@expo-google-fonts/orbitron';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import {
  store,
  persistor,
  fetchHomeFeed,
  restoreSession,
  clearSession,
  fetchEntitlement,
} from '@/redux';
import { ThemeProvider } from '@/context';
import { RootNavigator, AuthNavigator } from '@/navigation';
import {
  usePlayerSync,
  useListeningAnalytics,
  usePlaybackGate,
  useAppDispatch,
  useAppSelector,
} from '@/hooks';
import { setupPlayer } from '@/services/music';
import { initAuthClient } from '@/services/auth';
import { getManifest, onCatalogUpdated, invalidateCatalogIndex } from '@/services/catalog';
import { getMobileConfig, onMobileConfigUpdated } from '@/services/mobileConfig';
import { CONFIG } from '@/constants';
import { SplashScreen } from '@/components/SplashScreen';
import { PlaybackLimitGate } from '@/components/PlaybackLimitGate';
import { AppUpdateGate } from '@/components/AppUpdateGate';
import { PlaylistMenuProvider } from '@/components/playlists';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { i18n } from '@/localization'; // initialize i18next

/** Apply the persisted language to i18next once redux-persist has rehydrated. */
const applyPersistedLanguage = () => {
  const lang = store.getState().settings.language;
  if (lang) void i18n.changeLanguage(lang);
};

/**
 * Mounts the engine->Redux bridge, the listening-analytics emitter, and the
 * Free-plan playback gate exactly once, near the root. Also refreshes the user's
 * plan entitlement whenever the session becomes authenticated (cold-start
 * restore, sign-in, 2FA, or sign-up) so the app is plan-aware right after login.
 */
const PlayerSyncGate: React.FC = () => {
  usePlayerSync();
  useListeningAnalytics();
  usePlaybackGate();

  const dispatch = useAppDispatch();
  const authed = useAppSelector((s) => s.auth.user != null);
  useEffect(() => {
    if (authed) void dispatch(fetchEntitlement());
  }, [authed, dispatch]);

  return null;
};

/**
 * Chooses between the unauthenticated flow and the main app, based on the
 * restored session and the first-launch onboarding flag. Renders nothing while
 * either is still resolving (the splash overlay covers that window).
 */
const RootGate: React.FC = () => {
  const status = useAppSelector((s) => s.auth.status);
  const isAuthenticated = useAppSelector((s) => s.auth.user != null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void storage
      .getItem<boolean>(STORAGE_KEYS.ONBOARDING_DONE)
      .then((done) => setHasOnboarded(Boolean(done)));
  }, []);

  if (status === 'restoring' || hasOnboarded === null) return null;

  if (isAuthenticated) {
    return <RootNavigator />;
  }

  // Signed out / never signed in: the Jubilee Door (or first-run Welcome slides).
  return <AuthNavigator initialRoute={hasOnboarded ? 'JubileeDoor' : 'Welcome'} />;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  // Stable so the font-load re-render doesn't restart the splash animation.
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  // Load the Orbitron brand font used by the KJubilee.com wordmark (matches
  // the web header: Orbitron 600). The splash overlay covers this window; we
  // hold the main tree until it resolves so headers paint with the brand font
  // instead of flashing the system font.
  useEffect(() => {
    Font.loadAsync({ Orbitron_600SemiBold })
      .catch(() => {
        // Continue even if fonts fail — the wordmark falls back to system font.
      })
      .finally(() => setFontsLoaded(true));
  }, []);

  // Initialize the playback engine once on app start.
  useEffect(() => {
    void setupPlayer();
  }, []);

  // Wire the auth client's refresh-failure handler, then restore any session.
  useEffect(() => {
    initAuthClient(() => store.dispatch(clearSession()));
    void store.dispatch(restoreSession());
  }, []);

  // Warm the catalog so lists are ready before the user navigates, and refresh
  // the (instantly-rendered, persisted) home feed once a background revalidation
  // brings newer data.
  useEffect(() => {
    if (CONFIG.DATA_SOURCE !== 'manifest') return undefined;
    void getManifest();
    return onCatalogUpdated(() => {
      invalidateCatalogIndex();
      void store.dispatch(fetchHomeFeed());
    });
  }, []);

  // Warm the admin-managed mobile category config, and rebuild the Home feed
  // when it changes in the background (the overlay is applied in getHomeConfig).
  useEffect(() => {
    void getMobileConfig();
    return onMobileConfigUpdated(() => {
      void store.dispatch(fetchHomeFeed());
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor} onBeforeLift={applyPersistedLanguage}>
          <SafeAreaProvider>
            <ThemeProvider>
              <PlayerSyncGate />
              <PlaylistMenuProvider>
                {fontsLoaded ? <RootGate /> : null}
              </PlaylistMenuProvider>
              {/* Free-plan daily-limit popup (shown when playback hits the cap). */}
              <PlaybackLimitGate />
              {/* Post-splash "update available" prompt (checks once per launch). */}
              <AppUpdateGate enabled={!showSplash && fontsLoaded} />
            </ThemeProvider>
          </SafeAreaProvider>
        </PersistGate>
      </Provider>

      {/* Netflix-style intro overlay; unmounts when its animation finishes. */}
      {showSplash ? <SplashScreen onFinish={handleSplashFinish} /> : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
