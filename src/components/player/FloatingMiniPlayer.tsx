import React, { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/context';
import { usePlayer, useRadio } from '@/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { MiniPlayer } from './MiniPlayer';
import { radioBarDismissal } from './radioBarDismissal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Bottom-pinned MiniPlayer for the full-screen detail screens (AlbumDetails,
 * ArtistDetails, AlbumList) that present over the tab bar — where the tab bar's
 * own MiniPlayer is hidden. Tapping opens the full player.
 *
 * The wrap paints an opaque backdrop from the top of the card down through the
 * safe-area/navigation inset, so the scrolling song list never shows through
 * around or below the floating card. It renders nothing when idle so that
 * backdrop only exists while a track is playing.
 */
export const FloatingMiniPlayer: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { currentTrack } = usePlayer();
  const radio = useRadio();
  const dismissed = useSyncExternalStore(
    radioBarDismissal.subscribe,
    radioBarDismissal.get,
    radioBarDismissal.get,
  );

  // Nothing playing → no overlay, so the bottom of the screen stays clear.
  // "Playing" now means either source: `MiniPlayer` falls back to the tuned
  // station, so gating on the music queue alone would keep the backdrop — and
  // therefore the bar — hidden through every broadcast.
  // The dismissal has to be read HERE as well, not just inside MiniPlayer.
  // This wrap paints an opaque backdrop of its own; leaving it mounted around a
  // bar that returned null would put an empty coloured strip across the foot of
  // the screen — the close button would look like it half-worked.
  if (!currentTrack && (!radio.slug || dismissed)) return null;

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: insets.bottom + 8, backgroundColor: theme.colors.background },
      ]}
    >
      <MiniPlayer onPress={() => navigation.navigate('MusicPlayer')} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 8 },
});
