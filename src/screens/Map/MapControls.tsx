import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface MapAction {
  icon: IconName;
  onPress: () => void;
  label: string;
}

/**
 * The round button column that floats over the map, as it does on the site.
 *
 * Shared so the inline map and the fullscreen map cannot drift apart: they take
 * the same actions in the same order, and only the last one differs (expand
 * versus close).
 */
export const MapControls: React.FC<{ actions: MapAction[]; top?: number }> = ({
  actions,
  top = 10,
}) => {
  const c = useTheme().colors;
  // `top` is passed rather than inherited: an absolutely positioned child is
  // laid out against its parent's border box, so the fullscreen map's
  // `paddingTop: insets.top` does NOT push this clear of the status bar — the
  // first button sat under the clock until this became explicit.
  return (
    <View style={[styles.col, { top }]}>
      {actions.map(({ icon, onPress, label }) => (
        <Pressable
          key={icon}
          onPress={onPress}
          // The 34pt circle is deliberate against the map, so the target is
          // widened rather than the button — 34 + 8 either side clears the
          // 44pt minimum. Same hitSlop pattern the search clear button uses.
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: c.backgroundElevated,
              borderColor: c.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name={icon} size={18} color={c.text} />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  col: { position: 'absolute', right: 10, gap: 8 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
