import React, { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import { MiniPlayer } from './MiniPlayer';
import { radioBarDismissal } from './radioBarDismissal';

/**
 * Bottom-pinned MiniPlayer for the full-screen detail screens (StationDetail,
 * StationList, BandArticles…) that present over the tab bar — where the tab
 * bar's own MiniPlayer is hidden. Tapping opens the station's page.
 *
 * The wrap paints an opaque backdrop from the top of the card down through the
 * safe-area/navigation inset, so the scrolling list never shows through around
 * or below the floating card. It renders nothing when idle so that backdrop
 * only exists while a station is tuned.
 */
export const FloatingMiniPlayer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const radio = useRadio();
  const dismissed = useSyncExternalStore(
    radioBarDismissal.subscribe,
    radioBarDismissal.get,
    radioBarDismissal.get,
  );

  // Nothing tuned → no overlay, so the bottom of the screen stays clear.
  // The dismissal has to be read HERE as well, not just inside MiniPlayer.
  // This wrap paints an opaque backdrop of its own; leaving it mounted around a
  // bar that returned null would put an empty coloured strip across the foot of
  // the screen — the close button would look like it half-worked.
  if (!radio.slug || dismissed) return null;

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: insets.bottom + 8, backgroundColor: theme.colors.background },
      ]}
    >
      <MiniPlayer />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 8 },
});
