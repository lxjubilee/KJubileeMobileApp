import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';

interface IconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
  /** Style for the glyph itself, e.g. a small transform to optically center it. */
  iconStyle?: StyleProp<TextStyle>;
  hitSlop?: number;
  disabled?: boolean;
  /** Spoken name for screen readers — an icon has no text to announce. */
  accessibilityLabel?: string;
}

/** Pressable icon with a subtle press-opacity, used across headers and the player. */
export const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  size = 24,
  color,
  style,
  iconStyle,
  hitSlop = 10,
  disabled,
  accessibilityLabel,
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        style,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons
        name={name}
        size={size}
        color={color ?? theme.colors.icon}
        // Center the glyph deterministically: kill Android's density-dependent
        // font padding and pin the line box to the icon size so it sits dead
        // center on every screen/density. iconStyle can still layer on top.
        style={[styles.glyph, { lineHeight: size }, iconStyle]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  glyph: {
    textAlign: 'center',
    textAlignVertical: 'center',
    // Android-only: removes the extra top/bottom padding Text adds around glyphs.
    includeFontPadding: false,
  },
});
