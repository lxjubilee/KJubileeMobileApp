import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import { AUTH_BORDER, AUTH_METRICS } from './authStyles';

interface AccountChipProps {
  email: string;
  /** "Use a different email" — returns to the email step. */
  actionLabel: string;
  onAction: () => void;
}

/**
 * The locked-in email plus its escape hatch, shown once the door knows which
 * kind of account it is dealing with.
 *
 * The email is middle-ellipsised rather than character-wrapped (the web uses
 * `word-break: break-all`) — on a 360dp screen breaking mid-word makes an
 * address unreadable, while a middle ellipsis keeps the local part and the
 * domain, which is what the user checks.
 */
export const AccountChip: React.FC<AccountChipProps> = ({ email, actionLabel, onAction }) => {
  const theme = useTheme();

  return (
    <View style={styles.chip}>
      <AppText
        variant="bodySm"
        color="textSecondary"
        style={styles.email}
        numberOfLines={2}
        ellipsizeMode="middle"
      >
        {email}
      </AppText>
      <Pressable
        onPress={onAction}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <AppText
          variant="bodySm"
          numberOfLines={1}
          style={[styles.action, { color: theme.colors.text }]}
        >
          {actionLabel}
        </AppText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: AUTH_BORDER.idle,
    borderRadius: AUTH_METRICS.radius,
    backgroundColor: AUTH_BORDER.fill,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  email: { flex: 1 },
  action: { fontWeight: '700', textDecorationLine: 'underline' },
});
