import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import { Orbitron_600SemiBold } from '@expo-google-fonts/orbitron';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor, restoreSession, clearSession } from '@/redux';
import { ThemeProvider } from '@/context';
import { RootNavigator } from '@/navigation';
import { useStationFavoritesSync, useAppSelector } from '@/hooks';
import { setupPlayer } from '@/services/music';
import { initRadio } from '@/services/radio';
import { initAuthClient } from '@/services/auth';
import { SplashScreen } from '@/components/SplashScreen';
import { AppUpdateGate } from '@/components/AppUpdateGate';
import { i18n } from '@/localization'; // initialize i18next

/** Apply the persisted language to i18next once redux-persist has rehydrated. */
const applyPersistedLanguage = () => {
  const lang = store.getState().settings.language;
  if (lang) void i18n.changeLanguage(lang);
};

/**
 * Mounts the app-wide listeners exactly once, near the root: the station
 * favourites sync and the radio engine's lifecycle watch.
 */
const PlayerSyncGate: React.FC = () => {
  useStationFavoritesSync();

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
 * Holds the tree back until the session restore has resolved, then hands over
 * to the one navigator the app has. Renders nothing while that is still in
 * flight (the splash overlay covers that window).
 *
 * It no longer CHOOSES a navigator. Signing in is optional: KJubilee is a radio
 * network whose catalog, stations and streams all come from the public CDN
 * manifest and need no session, so everyone — signed in or not — opens on Home.
 * The Jubilee Door is a route now (see RootStackParamList), pushed from the
 * Profile tab or by `openSignIn()` when a guest reaches for something genuinely
 * account-based. Required by App Store guideline 5.1.1(v), which forbids
 * gating non-account features behind registration.
 *
 * Waiting on `restoring` still matters: a returning member must land on Home as
 * themselves rather than flashing a signed-out header first.
 */
const RootGate: React.FC = () => {
  const status = useAppSelector((s) => s.auth.status);

  if (status === 'restoring') return null;

  return <RootNavigator />;
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

  return (
    <GestureHandlerRootView style={styles.flex}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor} onBeforeLift={applyPersistedLanguage}>
          <SafeAreaProvider>
            <ThemeProvider>
              <PlayerSyncGate />
              {fontsLoaded ? <RootGate /> : null}
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
