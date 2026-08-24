import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';

interface AuthLinkButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Borderless text link used for "Forgot your password?", "Resend code", etc. */
export const AuthLinkButton: React.FC<AuthLinkButtonProps> = ({
  label,
  onPress,
  disabled = false,
  style,
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, { opacity: pressed && !disabled ? 0.7 : 1 }, style]}
    >
      <AppText
        variant="bodySm"
        numberOfLines={1}
        style={{ color: disabled ? theme.colors.textMuted : theme.colors.text, fontWeight: '700' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { paddingVertical: 2 },
});
