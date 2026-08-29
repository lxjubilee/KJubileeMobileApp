import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useAppSelector } from '@/hooks';
import { useTheme } from '@/context';
import { userInitials } from '@/utils';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface ProfileButtonProps {
  onPress?: () => void;
  /** Diameter of the avatar circle. */
  size?: number;
}

/**
 * Header profile control: shows the signed-in user's initials in a circle
 * ("Sandeep Agarwal" -> "SA"). Falls back to the generic person icon when no
 * name is available.
 *
 * Accent fill with near-black ink, matching the website's own account control:
 *   .kj-account-initial{background:var(--accent,#3DA5FF);color:#06182b;font-weight:700}
 * White would be the intuitive ink here and is the wrong one — it reaches only
 * 2.6:1 on azure.
 */
export const ProfileButton: React.FC<ProfileButtonProps> = ({ onPress, size = 32 }) => {
  const theme = useTheme();
  const user = useAppSelector((s) => s.auth.user);

  const initials = useMemo(() => userInitials(user), [user]);

  if (!initials) {
    // Pinned to the same box as the initials circle above and as whatever sits
    // beside it in a header. A bare glyph sizes itself, so the signed-out
    // control used to come out visibly smaller than the signed-in one.
    return (
      <IconButton
        name="person-circle-outline"
        size={size}
        onPress={onPress}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.accent,
        },
      ]}
    >
      {/* Two letters need to sit a little smaller to keep the same side margins. */}
      <AppText
        style={[
          styles.text,
          {
            color: theme.colors.accentInk,
            fontSize: Math.round(size * (initials.length > 1 ? 0.42 : 0.47)),
          },
        ]}
        allowFontScaling={false}
      >
        {initials}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});
