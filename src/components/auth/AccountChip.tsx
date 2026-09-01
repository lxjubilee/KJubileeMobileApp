import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import { AUTH_BORDER, AUTH_METRICS } from './authStyles';

interface AccountChipProps {
  email: string;
  /** "Use a different email" — returns to the email step. */
  actionLabel: string;
  onAction: () => void;
  /** Spacing from whatever sits above; the chip carries no margin of its own. */
  style?: StyleProp<ViewStyle>;
}

/**
 * The locked-in email plus its escape hatch, shown once the door knows which
 * kind of account it is dealing with.
 *
 * The email is middle-ellipsised rather than wrapped or character-broken (the
 * web uses `word-break: break-all`) — breaking an address across lines makes it
 * unreadable, while a middle ellipsis keeps the local part and the domain,
 * which is what the user checks.
 */
export const AccountChip: React.FC<AccountChipProps> = ({ email, actionLabel, onAction, style }) => {
  const theme = useTheme();

  return (
    <View style={[styles.chip, style]}>
      <AppText
        variant="bodySm"
        color="textSecondary"
        style={styles.email}
        // ONE line, so the middle ellipsis below is what actually happens.
        // At two, a long address wraps before it ever ellipsises, and the wrap
        // point is a break opportunity rather than anything meaningful — which
        // is how "sandeepaga79@gmail" ended up over ".com" on a 436dp screen.
        // A short address still shows in full; only one too wide is elided.
        numberOfLines={1}
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
    // Same box as AuthTextField, so the chip and the password field below it
    // read as one stack. `minHeight` rather than `height` so the box still
    // grows for a larger system font scale instead of clipping.
    minHeight: AUTH_METRICS.fieldHeight,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  email: { flex: 1 },
  action: { fontWeight: '700', textDecorationLine: 'underline' },
});
