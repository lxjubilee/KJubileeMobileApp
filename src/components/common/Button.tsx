import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/** Themed button with primary / secondary / ghost variants and optional icon. */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  fullWidth,
  style,
}) => {
  const theme = useTheme();

  const bg =
    variant === 'primary'
      ? theme.colors.accent
      : variant === 'secondary'
        ? theme.colors.surface
        : 'transparent';
  const fg = variant === 'primary' ? '#FFFFFF' : theme.colors.text;
  const borderStyle =
    variant === 'ghost' ? { borderWidth: 1, borderColor: theme.colors.border } : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderRadius: theme.radius.pill },
        borderStyle,
        fullWidth && styles.fullWidth,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={styles.icon} /> : null}
          <AppText variant="label" style={{ color: fg }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  fullWidth: { alignSelf: 'stretch' },
  icon: { marginRight: 8 },
});
