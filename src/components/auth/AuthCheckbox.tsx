import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';

interface AuthCheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Plain label. Use `children` instead when the label embeds links. */
  label?: string;
  children?: React.ReactNode;
  /**
   * Extra screen-reader actions. Nested `<Text onPress>` links are reachable by
   * VoiceOver but NOT by TalkBack, so the terms row exposes "Open Terms of
   * Service" / "Open Privacy Policy" here as well.
   */
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Checkbox row used for "Keep me signed in on this device" and the terms
 * consent. Extracted from the duplicated rows in SignUp and TwoFactor.
 */
export const AuthCheckbox: React.FC<AuthCheckboxProps> = ({
  checked,
  onChange,
  label,
  children,
  accessibilityActions,
  onAccessibilityAction,
  accessibilityLabel,
  style,
}) => {
  const theme = useTheme();

  return (
    <Pressable
      style={[styles.row, style]}
      hitSlop={6}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
    >
      {/* Constant literal size on both branches — a conditional 0 would throw. */}
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? theme.colors.accent : theme.colors.textMuted}
      />
      <View style={styles.labelWrap}>
        {children ?? (
          <AppText variant="bodySm" color="textSecondary" style={styles.label}>
            {label}
          </AppText>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  labelWrap: { flex: 1 },
  label: { lineHeight: 20 },
});
