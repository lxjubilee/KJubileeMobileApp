import React from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';
import { useStationEngagement } from '@/hooks';
import type { RadioStation } from '@/services/radio';
import { AppText } from '../common/AppText';

/**
 * The station's two engagement controls, ported from the website's Home page:
 *
 *   heart — Favourite. Saved to the account (`/api/radio/favorites`); a guest
 *           is sent to sign in.
 *   thumb — Like. Remembered on the device and reported to
 *           `/api/radio/feedback`; works signed in or not.
 *
 * Two sizes of the same pair: labelled pills under the station page's Play
 * button, and small round glyphs over a tile's artwork.
 */

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Labelled pills for the station page. */
export const StationActionRow: React.FC<{ station: RadioStation }> = ({ station }) => {
  const { favorite, liked, onToggleFavorite, onToggleLike } = useStationEngagement(station);
  return (
    <View style={styles.row}>
      <Pill
        icon={favorite ? 'heart' : 'heart-outline'}
        label={favorite ? 'Favourited' : 'Favourite'}
        on={favorite}
        onPress={onToggleFavorite}
        a11yLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
      />
      <Pill
        icon={liked ? 'thumbs-up' : 'thumbs-up-outline'}
        label={liked ? 'Liked' : 'Like'}
        on={liked}
        onPress={onToggleLike}
        a11yLabel={liked ? 'Liked, tap to undo' : 'Like this station'}
      />
    </View>
  );
};

const Pill: React.FC<{
  icon: IconName;
  label: string;
  on: boolean;
  onPress: () => void;
  a11yLabel: string;
}> = ({ icon, label, on, onPress, a11yLabel }) => {
  const c = useTheme().colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: on ? c.accent : c.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={on ? c.accent : c.text} />
      <AppText style={[styles.pillText, { color: on ? c.accent : c.text }]}>{label}</AppText>
    </Pressable>
  );
};

type Engagement = ReturnType<typeof useStationEngagement>;

/**
 * Round glyphs for a tile's top-right corner.
 *
 * Takes the engagement state from the tile rather than subscribing itself, so a
 * tile reads the store once for both this and its accessibility actions.
 *
 * A screen reader cannot reach buttons nested inside a tile that is itself a
 * button, so the tile exposes the same two actions through
 * `stationTileA11yProps`. These are hidden from it rather than left as a second,
 * unreachable copy.
 */
export const StationTileActions: React.FC<{ engagement: Engagement }> = ({ engagement }) => {
  const { favorite, liked, onToggleFavorite, onToggleLike } = engagement;
  const c = useTheme().colors;
  return (
    <View
      style={styles.tileRow}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Glyph
        icon={liked ? 'thumbs-up' : 'thumbs-up-outline'}
        color={liked ? c.accent : '#FFFFFF'}
        onPress={onToggleLike}
      />
      <Glyph
        icon={favorite ? 'heart' : 'heart-outline'}
        color={favorite ? c.accent : '#FFFFFF'}
        onPress={onToggleFavorite}
      />
    </View>
  );
};

const Glyph: React.FC<{ icon: IconName; color: string; onPress: () => void }> = ({
  icon,
  color,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    hitSlop={6}
    style={({ pressed }) => [styles.glyph, { opacity: pressed ? 0.6 : 1 }]}
  >
    <Ionicons name={icon} size={15} color={color} />
  </Pressable>
);

/** Accessibility actions that stand in for the tile's glyphs. Spread onto the tile. */
export function stationTileA11yProps({ favorite, liked, onToggleFavorite, onToggleLike }: Engagement) {
  return {
    accessibilityActions: [
      { name: 'favorite', label: favorite ? 'Remove from favourites' : 'Add to favourites' },
      { name: 'like', label: liked ? 'Undo like' : 'Like this station' },
    ],
    onAccessibilityAction: (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'favorite') onToggleFavorite();
      else if (e.nativeEvent.actionName === 'like') onToggleLike();
    },
  };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
  pillText: { fontSize: 14 },
  tileRow: { flexDirection: 'row', gap: 6 },
  // A dark disc under each glyph: tile art is arbitrary, and a white outline
  // heart on a bright sky vanishes without one.
  glyph: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
