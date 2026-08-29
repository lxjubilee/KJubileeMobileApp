import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen, AppText, IconButton, PasswordInput } from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { changePassword, clearSession } from '@/redux';
import { passwordsMatch } from '@/utils';
import type { ProfileStackParamList } from '@/navigation/types';
import { darkColors } from '@/theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;


/**
 * Change the signed-in user's password. Authenticated by the current Bearer
 * session; the server keeps this session alive and signs out other devices.
 *
 * The current-password field was removed by request. Nothing is substituted for
 * it — no empty string, no placeholder — because `POST /api/account/password`
 * still verifies it server-side (`lib/account.js` -> `verifyPassword`), and
 * faking the value would be defeating that check rather than removing it. Until
 * the backend offers a path that re-authenticates some other way, this screen
 * will surface the server's own 400. See the note on ChangePasswordRequest.
 */
export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  /**
   * The password changed but no replacement session came back, so the old one —
   * revoked with all the others — cannot be used. Distinguished from the normal
   * success because the two ask different things of the person next.
   */
  const [reauth, setReauth] = useState(false);

  const matches = passwordsMatch(next, confirm);
  const canSubmit = matches && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await dispatch(
        changePassword({ newPassword: next }),
      ).unwrap();
      setReauth(Boolean(res?.reauthenticate));
      setDone(true);
    } catch (e) {
      setError(typeof e === 'string' ? e : t('changePassword.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const clearError = () => error && setError(null);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        <AppText variant="h1" style={styles.title}>
          {t('changePassword.title')}
        </AppText>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {done ? (
            <>
              <AppText variant="body" color="textSecondary" style={styles.subtitle}>
                {t(reauth ? 'changePassword.successReauth' : 'changePassword.success')}
              </AppText>
              <Pressable
                // Signing out is deferred to this tap rather than done on arrival,
                // so the news is read before the screen is taken away.
                onPress={() => (reauth ? dispatch(clearSession()) : navigation.goBack())}
                style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
              >
                <AppText variant="h3" style={styles.ctaLabel}>
                  {t('changePassword.done')}
                </AppText>
              </Pressable>
            </>
          ) : (
            <>
              <AppText variant="body" color="textSecondary" style={styles.subtitle}>
                {t('changePassword.instruction')}
              </AppText>

              <PasswordInput
                value={next}
                onChangeText={(v) => {
                  setNext(v);
                  clearError();
                }}
                placeholder={t('changePassword.newPlaceholder')}
                containerStyle={styles.field}
              />
              <PasswordInput
                value={confirm}
                onChangeText={(v) => {
                  setConfirm(v);
                  clearError();
                }}
                placeholder={t('changePassword.confirmPlaceholder')}
                containerStyle={styles.field}
              />

              {confirm.length > 0 && next !== confirm ? (
                <AppText variant="bodySm" style={styles.error}>
                  {t('changePassword.mismatch')}
                </AppText>
              ) : null}
              {error ? (
                <AppText variant="bodySm" style={styles.error}>
                  {error}
                </AppText>
              ) : null}

              <Pressable
                onPress={onSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.cta,
                  { opacity: !canSubmit ? 0.6 : pressed ? 0.85 : 1 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <AppText variant="h3" style={styles.ctaLabel}>
                    {t('changePassword.submit')}
                  </AppText>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  title: { marginLeft: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  subtitle: { marginBottom: 8, lineHeight: 22 },
  field: { marginTop: 14 },
  error: { marginTop: 12, color: darkColors.danger },
  cta: {
    marginTop: 24,
    backgroundColor: darkColors.accent,
    height: 52,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { color: '#FFFFFF', fontWeight: '700' },
});

export default ChangePasswordScreen;
