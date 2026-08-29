import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen, AppText, IconButton } from '@/components/common';
import { AuthTextField } from '@/components/auth';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { updateName } from '@/redux';
import { authService } from '@/services/auth';
import { logger } from '@/utils';
import type { ProfileStackParamList } from '@/navigation/types';
import { darkColors } from '@/theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

/**
 * Rename the signed-in account. Bearer-authed; no password is asked for.
 *
 * That is the server's position, not a shortcut taken here: `PATCH /api/account`
 * deliberately does not ask, because "a name is not a credential: getting it
 * wrong is embarrassing and reversible in one edit". Change Password and Delete
 * Account, which sit beside this one on Profile, both do ask — the difference is
 * intended and worth preserving.
 *
 * The change reaches the Jubilee ID authority, not only kJubilee: the server
 * writes the authority FIRST and refuses locally if that write fails, because it
 * re-reads name from the authority on every sign-in. A name saved only here
 * would appear to work and then revert at the next sign-in.
 */
export const EditNameScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);

  // Seeded from the session so the fields are never blank on open, then
  // corrected from the server below.
  const [first, setFirst] = useState(user?.firstName ?? '');
  const [last, setLast] = useState(user?.lastName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /** Set on the first keystroke, so a slow GET cannot overwrite what was typed. */
  const touched = useRef(false);

  /**
   * `AuthUser` carries `displayName` reliably but `firstName`/`lastName` only
   * when the sign-in path happened to supply them — the Jubilee ID door does
   * not, so the session alone leaves this form blank on the very accounts that
   * have a name to edit. `GET /api/account` returns the two parts as stored,
   * which is also what PATCH will compare against.
   *
   * Advisory: a failure here leaves whatever the session had, and the form still
   * works. Nothing is blocked on it.
   */
  useEffect(() => {
    let alive = true;
    authService
      .getAccount()
      .then(({ user: account }) => {
        if (!alive || touched.current) return;
        setFirst(account.first_name ?? '');
        setLast(account.last_name ?? '');
      })
      .catch((e) => logger.debug('[editName] account details unavailable', e?.message ?? e));
    return () => {
      alive = false;
    };
  }, []);

  // Only the first name is required, matching the server's own check. A last
  // name is genuinely optional at the authority, so an empty one is sent as ''
  // rather than blocked here.
  const canSubmit = first.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) {
      if (!first.trim()) setError(t('editName.firstNameRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(updateName({ firstName: first.trim(), lastName: last.trim() })).unwrap();
      setDone(true);
    } catch (e) {
      // The server's own sentences are already user-facing ("Enter your first
      // name.", "Your name could not be saved just now."), so they are shown as
      // they arrive; the local string is only for a failure with no message.
      setError(typeof e === 'string' && e ? e : t('editName.error'));
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
          {t('editName.title')}
        </AppText>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {done ? (
            <>
              <AppText variant="body" color="textSecondary" style={styles.subtitle}>
                {t('editName.success')}
              </AppText>
              <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.cta, { backgroundColor: darkColors.accent }]}
              >
                <AppText style={[styles.ctaLabel, { color: darkColors.accentInk }]}>
                  {t('common.done')}
                </AppText>
              </Pressable>
            </>
          ) : (
            <>
              <AppText variant="body" color="textSecondary" style={styles.subtitle}>
                {t('editName.subtitle')}
              </AppText>

              <AuthTextField
                value={first}
                onChangeText={(v) => {
                  touched.current = true;
                  clearError();
                  setFirst(v);
                }}
                placeholder={t('editName.firstName')}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                maxLength={80}
                autoFocus
                containerStyle={styles.field}
              />

              <AuthTextField
                value={last}
                onChangeText={(v) => {
                  touched.current = true;
                  clearError();
                  setLast(v);
                }}
                placeholder={t('editName.lastName')}
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                maxLength={80}
                containerStyle={styles.field}
              />

              {error ? (
                <AppText variant="bodySm" style={[styles.error, { color: darkColors.danger }]}>
                  {error}
                </AppText>
              ) : null}

              <Pressable
                onPress={onSubmit}
                disabled={!canSubmit}
                style={[
                  styles.cta,
                  { backgroundColor: darkColors.accent, opacity: canSubmit ? 1 : 0.5 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={darkColors.accentInk} />
                ) : (
                  <AppText style={[styles.ctaLabel, { color: darkColors.accentInk }]}>
                    {t('editName.save')}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 4 },
  title: { marginLeft: 4 },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 48 },
  subtitle: { marginBottom: 20, lineHeight: 22 },
  field: { marginBottom: 14 },
  error: { marginTop: 2, marginBottom: 8 },
  cta: {
    height: 52,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  ctaLabel: { fontSize: 16, fontWeight: '700' },
});
