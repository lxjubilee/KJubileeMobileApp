import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Let the phone turn, but only while the map is on screen.
 *
 * The app is portrait everywhere else and stays that way: `orientation` in
 * app.json still writes a portrait `screenOrientation` into the Android
 * manifest and a portrait mask into Info.plist, so nothing rotates before JS is
 * running, and no other screen has to opt out of anything. This asks for the
 * exception and gives it straight back — `lockAsync` on Android is
 * `setRequestedOrientation`, which overrides the manifest at runtime, and on
 * iOS expo-screen-orientation answers the app delegate's
 * `supportedInterfaceOrientationsFor:` from its own registry, which overrides
 * `UISupportedInterfaceOrientations`. Both are undone on blur.
 *
 * DEFAULT rather than ALL: upside-down portrait is not a way anyone holds a
 * phone to look at a map, and iOS excludes it from DEFAULT for that reason.
 *
 * Returns whether the screen is currently wider than it is tall — the signal
 * the map opens fullscreen on. Read from the window rather than from
 * `getOrientationAsync`, because it is the box being drawn into that has to
 * agree with the decision, and a device orientation is not that box: a tablet
 * in a split view is landscape while its window is not.
 */
export function useLandscapeMap(): boolean {
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (!isFocused) return;

    // Rejections are swallowed on purpose: the only failure the module reports
    // here is "no activity", which happens when the screen is being torn down —
    // exactly when the answer no longer matters.
    ScreenOrientation.unlockAsync().catch(() => {});

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [isFocused]);

  // Gated on focus as well as shape so the answer goes false the moment the
  // screen is left, rather than a rotation later: leaving in landscape asks for
  // portrait back, and the phone takes a moment to turn. Without this the map
  // would sit fullscreen over a screen nobody is looking at for that moment.
  return isFocused && width > height;
}
