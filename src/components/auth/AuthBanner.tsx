import React, { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';

interface AuthBannerProps {
  message?: string | null;
  tone?: 'error' | 'info';
  style?: StyleProp<ViewStyle>;
}

/**
 * Inline error / info line. Replaces the scattered `<AppText color="danger">`
 * blocks and, unlike them, announces itself: the message often appears far above
 * the fold on the taller steps, so a silent banner is easy to miss.
 */
export const AuthBanner: React.FC<AuthBannerProps> = ({ message, tone = 'error', style }) => {
  const theme = useTheme();

  useEffect(() => {
    // Android gets this from accessibilityLiveRegion; iOS needs the explicit call.
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  if (!message) return null;

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <AppText
        variant="bodySm"
        style={{ color: tone === 'error' ? theme.colors.danger : theme.colors.accent }}
      >
        {message}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
});
