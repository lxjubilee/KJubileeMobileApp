import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import { AUTH_METRICS } from './authStyles';

interface AuthPrimaryButtonProps {
  label: string;
  /** Shown beside the spinner while busy, e.g. "Signing in…". Falls back to `label`. */
  busyLabel?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The auth call-to-action. Extracted from the bespoke 52pt `Pressable` each auth
 * screen re-declared.
 *
 * While busy it renders the label *next to* the spinner rather than replacing it
 * — that matches the web's "Checking…" / "Signing in…" copy and, unlike a bare
 * ActivityIndicator, gives a screen reader something to announce.
 */
export const AuthPrimaryButton: React.FC<AuthPrimaryButtonProps> = ({
  label,
  busyLabel,
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  const theme = useTheme();
  const inactive = disabled || loading;
  const text = loading ? (busyLabel ?? label) : label;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: theme.colors.accent },
        { opacity: inactive ? 0.6 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
        <AppText variant="h3" style={styles.label} maxFontSizeMultiplier={1.3}>
          {text}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cta: {
    minHeight: AUTH_METRICS.ctaHeight,
    borderRadius: AUTH_METRICS.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
});
