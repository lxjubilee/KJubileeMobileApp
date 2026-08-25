import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { Screen, AppText, Button, IconButton, ConfirmDialog } from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { userInitials } from '@/utils';
import { signOut, deleteAccount, clearSession } from '@/redux';
import type { ProfileStackParamList, RootStackParamList } from '@/navigation/types';

// Pushes within the Profile stack; the root stack is still typed in for
// screens reached from here later.
type Nav = NativeStackNavigationProp<ProfileStackParamList & RootStackParamList>;
// Brand yellow/gold used for the profile avatar.
const AVATAR_YELLOW = '#ffbd59';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const initials = userInitials(user);
  const [mode, setMode] = useState<null | 'confirm' | 'success' | 'error'>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openDeleteConfirm = () => setMode('confirm');

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteAccount()).unwrap();
      setDeleting(false);
      setMode('success');
    } catch (e) {
      setDeleting(false);
      setErrorMsg(typeof e === 'string' ? e : t('errors.generic'));
      setMode('error');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        <AppText variant="h1" style={styles.title}>
          {t('profile.title')}
        </AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.body}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: initials ? AVATAR_YELLOW : theme.colors.surface },
            ]}
          >
            {initials ? (
              <AppText
                style={[styles.avatarInitial, initials.length > 1 && styles.avatarInitialPair]}
                allowFontScaling={false}
              >
                {initials}
              </AppText>
            ) : (
              <Ionicons name="person" size={48} color={theme.colors.iconMuted} />
            )}
          </View>
          <AppText variant="h2" style={styles.name}>
            {user?.displayName ?? t('profile.guest')}
          </AppText>
          <AppText variant="bodySm" color="textMuted" style={styles.email}>
            {user?.email ?? t('profile.notSignedIn')}
          </AppText>
        </View>

        {/* Account options. */}
        <View style={styles.menu}>
          <Row
            icon="lock-closed-outline"
            label={t('profile.changePassword')}
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <Row
            icon="shield-checkmark-outline"
            label={t('profile.privacyPolicy')}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <Row
            icon="document-text-outline"
            label={t('profile.termsOfUse')}
            onPress={() => navigation.navigate('TermsOfUse')}
          />
          <Row icon="trash-outline" label={t('profile.deleteAccount')} destructive onPress={openDeleteConfirm} />
        </View>

        <Button
          label={t('profile.signOut')}
          icon="log-out-outline"
          variant="ghost"
          onPress={() => dispatch(signOut())}
          style={styles.cta}
        />
      </ScrollView>

      <ConfirmDialog
        visible={mode === 'confirm'}
        title={t('profile.deleteTitle')}
        message={t('profile.deleteMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setMode(null)}
      />
      <ConfirmDialog
        visible={mode === 'success'}
        title={t('profile.deletedTitle')}
        message={t('profile.deletedMessage')}
        confirmLabel={t('common.ok')}
        onConfirm={() => dispatch(clearSession())}
      />
      <ConfirmDialog
        visible={mode === 'error'}
        title={t('profile.deleteFailedTitle')}
        message={errorMsg}
        confirmLabel={t('common.ok')}
        onConfirm={() => setMode(null)}
      />
    </Screen>
  );
};

const Row: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
}> = ({ icon, label, onPress, destructive, loading }) => {
  const theme = useTheme();
  const tint = destructive ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color={destructive ? theme.colors.danger : theme.colors.icon} />
      <AppText variant="body" style={[styles.rowLabel, { color: tint }]}>
        {label}
      </AppText>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.iconMuted} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.iconMuted} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  title: { marginLeft: 8 },
  scroll: { paddingBottom: 48 },
  body: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  avatar: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: {
    color: '#0B0B0F',
    fontSize: 46,
    lineHeight: 54,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  // Two letters read wider than one; ease the size so they stay clear of the rim.
  avatarInitialPair: { fontSize: 40, lineHeight: 48 },
  // `alignSelf: 'stretch'` deliberately opts these two out of the parent's
  // `alignItems: 'center'`. Centered children are sized to their INTRINSIC width,
  // and on Android that measurement can round short — clipping the tail at the
  // last break opportunity, which for an address is the dot before the TLD
  // ("jaigkv@gmail.com" rendering as "jaigkv@gmail"). Stretching to the full
  // available width and centering the glyphs instead removes the guesswork; the
  // display name gets the same treatment because it falls back to the email when
  // the account has no first/last name.
  name: { marginTop: 16, alignSelf: 'stretch', textAlign: 'center' },
  email: { alignSelf: 'stretch', textAlign: 'center' },
  shortcut: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  shortcutLabel: { marginTop: 8 },
  menu: { marginTop: 36, paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  rowLabel: { flex: 1, marginLeft: 12 },
  cta: { marginTop: 28, marginHorizontal: 16 },
});

export default ProfileScreen;
