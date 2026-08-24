import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { Screen, AppText, Button, IconButton, ConfirmDialog } from '@/components/common';
import { AlbumCard } from '@/components/cards';
import { MyContributions } from '@/components/reviews';
import { useAppDispatch, useAppSelector, useLikedAlbums, useLikedSongCount } from '@/hooks';
import { userInitials } from '@/utils';
import { signOut, deleteAccount, clearSession } from '@/redux';
import type { PlaylistsStackParamList, RootStackParamList } from '@/navigation/types';

// Pushes within the Playlists stack; opens AlbumDetails on the root stack.
type Nav = NativeStackNavigationProp<PlaylistsStackParamList & RootStackParamList>;
const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

// Brand yellow/gold (matches the "Lujah" wordmark) used for the profile avatar.
const AVATAR_YELLOW = '#ffbd59';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  // Liked albums (server-backed), resolved to catalog Albums; never hidden by
  // the active catalog language (a personal collection).
  const { albums: savedAlbums } = useLikedAlbums();
  const likedCount = useLikedSongCount();
  const followCount = useAppSelector((s) => s.library.followedArtistIds.length);
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

        {/* Liked Songs / Followed Artists. These moved here from the old Library
            screen, which the playlists-only tab replaced — Profile is now their
            only entry point. */}
        <View style={styles.shortcuts}>
          <Shortcut
            icon="heart"
            label={t('library.favorites')}
            meta={`${likedCount}`}
            color={theme.colors.accent}
            onPress={() => navigation.navigate('LikedSongs')}
          />
          <Shortcut
            icon="people"
            label={t('library.artists')}
            meta={`${followCount}`}
            onPress={() => navigation.navigate('FollowedArtists')}
          />
        </View>

        {/* Rating & review activity (mirrors the web account "My Contributions"). */}
        <MyContributions />

        {/* Saved albums, also relocated from the Library screen. Laid out as a
            wrapping row rather than a FlatList — nesting a virtualized list in
            this ScrollView would warn and break scrolling. */}
        <View style={styles.albumsSection}>
          <AppText variant="h2" style={styles.albumsTitle}>
            {t('library.albums')}
          </AppText>
          {savedAlbums.length ? (
            <View style={styles.albumGrid}>
              {savedAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  width={CARD_W}
                  onPress={(al) => navigation.navigate('AlbumDetails', { albumId: al.id })}
                />
              ))}
            </View>
          ) : (
            <AppText variant="bodySm" color="textMuted">
              {t('library.empty')}
            </AppText>
          )}
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

const Shortcut: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  meta?: string;
  color?: string;
  onPress?: () => void;
}> = ({ icon, label, meta, color, onPress }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.shortcut, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
    >
      <Ionicons name={icon} size={22} color={color ?? theme.colors.icon} />
      <AppText variant="label" style={styles.shortcutLabel} numberOfLines={1}>
        {label}
      </AppText>
      {meta ? (
        <AppText variant="caption" color="textMuted">
          {meta}
        </AppText>
      ) : null}
    </Pressable>
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
  shortcuts: { flexDirection: 'row', gap: 12, marginTop: 28, paddingHorizontal: 16 },
  shortcut: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  shortcutLabel: { marginTop: 8 },
  albumsSection: { marginTop: 28, paddingHorizontal: 16 },
  albumsTitle: { marginBottom: 12 },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  menu: { marginTop: 36, paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  rowLabel: { flex: 1, marginLeft: 12 },
  cta: { marginTop: 28, marginHorizontal: 16 },
});

export default ProfileScreen;
