import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import {
  Screen,
  AppText,
  Button,
  IconButton,
  ConfirmDialog,
  PasswordInput,
} from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { userInitials, logger } from '@/utils';
import { signOut, deleteAccount, clearSession } from '@/redux';
import { authService } from '@/services/auth';
import type { AccountUserDTO, LibraryCountsDTO } from '@/services/auth/authDto';
import type { ProfileStackParamList, RootStackParamList } from '@/navigation/types';

// Pushes within the Profile stack; the root stack is still typed in for
// screens reached from here later.
type Nav = NativeStackNavigationProp<ProfileStackParamList & RootStackParamList>;

/**
 * The word the server requires, verbatim.
 *
 * NOT localized, and not localizable: `app/api/account/delete/route.js` compares
 * against a hard-coded `'DELETE'` after `.trim().toUpperCase()`. A translated
 * word would be refused with a 400 the listener has no way to resolve — so the
 * label around the field is translated and the word inside it never is.
 */
const CONFIRM_WORD = 'DELETE';

type DeleteContext = { user: AccountUserDTO; library: LibraryCountsDTO };

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

  /**
   * The delete dialog's two locks. The password proves it is the owner; the
   * typed word proves the owner meant it — a password is muscle memory and a
   * keychain will fill it in, while typing DELETE cannot happen by accident.
   * Both are required by `POST /api/account/delete`, not by this screen.
   */
  const [delPassword, setDelPassword] = useState('');
  const [delWord, setDelWord] = useState('');
  /** What the deletion would take, and where the password lives. Advisory only. */
  const [account, setAccount] = useState<DeleteContext | null>(null);
  /** True only after the server confirms it; drives which farewell is shown. */
  const [keptJubileeId, setKeptJubileeId] = useState(false);

  const canDelete =
    delPassword.length > 0 && delWord.trim().toUpperCase() === CONFIRM_WORD && !deleting;

  const resetDeleteFields = () => {
    setDelPassword('');
    setDelWord('');
  };

  const openDeleteConfirm = () => {
    resetDeleteFields();
    setAccount(null);
    setMode('confirm');
    // Deliberately not awaited and never allowed to throw. The dialog has to work
    // without it — the server takes the same view, answering with zero counts
    // rather than letting a failed count keep someone out of their own settings.
    authService
      .getAccount()
      .then(setAccount)
      .catch((e) => logger.debug('[profile] account details unavailable', e?.message ?? e));
  };

  const closeDeleteConfirm = () => {
    resetDeleteFields();
    setMode(null);
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      // What they TYPED, not our constant. `canDelete` has already checked it,
      // but sending the constant would make this screen the thing that decides
      // the word was right — and the server's own check exists precisely so a
      // client-side bug cannot be what stands between someone and deletion.
      const res = await dispatch(
        deleteAccount({ password: delPassword, confirm: delWord }),
      ).unwrap();
      setDeleting(false);
      resetDeleteFields();
      setKeptJubileeId(Boolean(res?.keptJubileeId));
      setMode('success');
    } catch (e) {
      setDeleting(false);
      // The server's own sentences are already fit to show ("That password
      // doesn't match. Try again."), so they are surfaced verbatim. Only a
      // request that never landed gets a message of ours — and that one has to
      // promise nothing, because we cannot know whether the delete ran.
      const err = e as { message?: string; status?: number };
      setErrorMsg(
        err?.status === 0 ? t('profile.deleteOffline') : err?.message || t('errors.generic'),
      );
      setMode('error');
    }
  };

  /** The web's LibraryLine, in one sentence: what deleting actually takes. */
  const libraryLine = (() => {
    if (!account) return null;
    const { stations_favorited, stations_followed, albums_followed } = account.library;
    const parts = [
      stations_favorited &&
        t('profile.deleteFavoriteStations', { count: stations_favorited }),
      stations_followed && t('profile.deleteFollowedStations', { count: stations_followed }),
      albums_followed && t('profile.deleteFollowedAlbums', { count: albums_followed }),
    ].filter(Boolean) as string[];
    if (!parts.length) return t('profile.deleteLibraryEmpty');
    return t('profile.deleteLibraryLine', { items: parts.join(', ') });
  })();

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
              { backgroundColor: initials ? theme.colors.accent : theme.colors.surface },
            ]}
          >
            {initials ? (
              <AppText
                style={[
                  styles.avatarInitial,
                  { color: theme.colors.accentInk },
                  initials.length > 1 && styles.avatarInitialPair,
                ]}
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
            icon="person-outline"
            label={t('profile.editName')}
            onPress={() => navigation.navigate('EditName')}
          />
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
        confirmLabel={t('profile.deleteConfirmAction')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleting}
        // Both locks must be satisfied before the button will fire. The server
        // enforces this too — this only spares the listener a round trip.
        confirmDisabled={!canDelete}
        // Centred, like every other dialog in the app. The keyboard is not a
        // reason to anchor this one to the top: ConfirmDialog slides a centred
        // card up by exactly its overlap with the keyboard and back down again,
        // so the password and confirmation fields stay reachable either way.
        align="center"
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      >
        {libraryLine ? (
          <AppText variant="bodySm" color="textSecondary" style={styles.deleteNote}>
            {libraryLine}
          </AppText>
        ) : null}

        {/* Only shown when it is actually true of this account. */}
        {account?.user.linked_to_jubilee_id ? (
          <AppText variant="bodySm" color="textSecondary" style={styles.deleteNote}>
            {t('profile.deleteKeepsJubileeId')}
          </AppText>
        ) : null}

        <PasswordInput
          value={delPassword}
          onChangeText={setDelPassword}
          // Until `GET /api/account` answers we cannot know which password this
          // is, and guessing wrong is worse than staying general: telling someone
          // to enter "your kJubilee password" when the credential lives at the
          // authority is a wrong instruction, not a vague one.
          placeholder={t(
            account?.user.password_kind === 'jubilee-id'
              ? 'profile.deletePasswordJubileeId'
              : 'profile.deletePasswordLocal',
          )}
          autoComplete="current-password"
          containerStyle={styles.deleteField}
        />
        <TextInput
          value={delWord}
          onChangeText={setDelWord}
          placeholder={t('profile.deleteConfirmLabel')}
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          style={[
            styles.deleteWord,
            { backgroundColor: theme.colors.surface, color: theme.colors.text },
          ]}
        />
      </ConfirmDialog>
      <ConfirmDialog
        visible={mode === 'success'}
        title={t('profile.deletedTitle')}
        message={t(keptJubileeId ? 'profile.deletedMessageKeptId' : 'profile.deletedMessage')}
        confirmLabel={t('common.ok')}
        // Deferred to this tap rather than done on arrival, so the news is read
        // before the screen is taken away. The tokens are already gone; this
        // only resets the app's own state and returns to the door.
        onConfirm={() => dispatch(clearSession())}
      />
      <ConfirmDialog
        visible={mode === 'error'}
        title={t('profile.deleteFailedTitle')}
        message={errorMsg}
        confirmLabel={t('common.ok')}
        // Back to the form, not out of it. The commonest failure by far is a
        // mistyped password, and dropping someone all the way back to Profile
        // would make them start the whole confirmation over to fix one field.
        // The password is cleared; the typed word is not — it was not the mistake.
        onConfirm={() => {
          setDelPassword('');
          setMode('confirm');
        }}
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
      {/* The chevron takes the row's tint too: an icon and label in danger red
          beside a neutral chevron reads as an oversight, not a choice. */}
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.iconMuted} />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={destructive ? theme.colors.danger : theme.colors.iconMuted}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  title: { marginLeft: 8 },
  scroll: { paddingBottom: 48 },
  // Delete dialog. The notes stack above the two fields, matching the order the
  // web card uses: what you lose, what you keep, then what you must prove.
  deleteNote: { marginTop: 10, lineHeight: 19 },
  deleteField: { marginTop: 14 },
  deleteWord: {
    marginTop: 12,
    height: 48,
    borderRadius: 6,
    paddingHorizontal: 14,
    fontSize: 16,
    // The word is compared case-insensitively server-side, but tracking it out
    // makes the field read as something to be typed exactly rather than filled.
    letterSpacing: 1.5,
  },
  body: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  avatar: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: {
    // Colour comes from the theme at the call site (`accentInk`).
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
