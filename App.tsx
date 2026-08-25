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
import { initRadio } from '@/services/radio';
import { initAuthClient } from '@/services/auth';
import { getManifest, onCatalogUpdated, invalidateCatalogIndex } from '@/services/catalog';
import { getMobileConfig, onMobileConfigUpdated } from '@/services/mobileConfig';
import { CONFIG, ENV } from '@/constants';
import { SplashScreen } from '@/components/SplashScreen';
import { PlaybackLimitGate } from '@/components/PlaybackLimitGate';
import { AppUpdateGate } from '@/components/AppUpdateGate';
import { TrackMenuProvider } from '@/components/TrackMenuProvider';
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

  // The radio engine watches the app lifecycle: returning to the foreground has
  // to rejoin the live broadcast rather than resume a track that went stale
  // while the phone slept. Mounted here so it is wired once, near the root.
  useEffect(() => initRadio(), []);

  // The plan-entitlement refresh on sign-in is gone: /api/subscriptions/me does
  // not exist on the Jubilee ID API, so it 404'd immediately after every
  // sign-in. Re-add when the radio API grows a subscription surface.

  return null;
};

/**
 * Chooses between the unauthenticated flow and the main app, based on the
 * restored session. Renders nothing while that is still resolving (the splash
 * overlay covers that window).
 */
const RootGate: React.FC = () => {
  const status = useAppSelector((s) => s.auth.status);
  const isAuthenticated = useAppSelector((s) => s.auth.user != null);

  // TEMPORARY (auth API unavailable): open the app without a session so the
  // radio surfaces can be built and reviewed. Dev bundles only — see
  // ENV.DEV_SKIP_AUTH. Checked before `restoring` because a session restore
  // that cannot reach the API would otherwise hold this at null forever.
  if (ENV.DEV_SKIP_AUTH) return <RootNavigator />;

  if (status === 'restoring') return null;

  if (isAuthenticated) {
    return <RootNavigator />;
  }

  // Signed out / never signed in: straight to the Jubilee Door.
  return <AuthNavigator />;
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
              <TrackMenuProvider>
                {fontsLoaded ? <RootGate /> : null}
              </TrackMenuProvider>
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
