import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/common';
import { AuthBanner, AuthPrimaryButton, AuthScreenShell, AuthTextField } from '@/components/auth';
import { useAppDispatch } from '@/hooks';
import { forgotPassword } from '@/redux';
import { isEmail } from '@/utils';
import type { AuthStackParamList } from '@/navigation/types';

type Route = RouteProp<AuthStackParamList, 'ForgotPassword'>;

/**
 * Request a password-reset email. The API is anti-enumeration (identical
 * response whether or not the email exists), and the emailed link is redeemed on
 * the website — so this screen only sends the request and shows a neutral notice.
 *
 * The Jubilee Door links here with the address already typed, so `route.params`
 * can pre-fill the field.
 */
export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = isEmail(email) && !submitting && !sent;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(forgotPassword(email)).unwrap();
      setSent(true);
    } catch (e) {
      setError(typeof e === 'string' ? e : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenShell
      onBack={() => navigation.goBack()}
      backLabel={t('auth.door.a11y.back')}
      title={t('auth.forgot.title')}
    >
      {sent ? (
        <>
          <AppText variant="body" color="textSecondary" style={styles.subtitle}>
            {t('auth.forgot.sentMessage', { email: email.trim() })}
          </AppText>
          <AuthPrimaryButton
            label={t('auth.forgot.backToSignIn')}
            onPress={() => navigation.goBack()}
            style={styles.cta}
          />
        </>
      ) : (
        <>
          <AppText variant="body" color="textSecondary" style={styles.subtitle}>
            {t('auth.forgot.instruction')}
          </AppText>

          <AuthTextField
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) setError(null);
            }}
            placeholder={t('auth.forgot.email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={onSubmit}
            containerStyle={styles.field}
          />

          <AuthBanner message={error} />

          <AuthPrimaryButton
            label={t('auth.forgot.submit')}
            onPress={onSubmit}
            loading={submitting}
            disabled={!canSubmit}
            style={styles.cta}
          />
        </>
      )}
    </AuthScreenShell>
  );
};

const styles = StyleSheet.create({
  subtitle: { marginTop: 12, fontSize: 16, lineHeight: 22 },
  field: { marginTop: 26 },
  cta: { marginTop: 20 },
});

export default ForgotPasswordScreen;
