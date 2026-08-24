import React, { useRef } from 'react';
import { StyleSheet, TextInput, View, type AccessibilityActionEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/common';
import {
  AuthCheckbox,
  AuthLinkButton,
  AuthLinkRow,
  AuthPrimaryButton,
  AuthTextField,
  DateOfBirthField,
  PasswordMatchHint,
} from '@/components/auth';
import { MIN_AGE, isOldEnough } from '@/utils';

interface CreateJubileeIdStepProps {
  email: string;
  firstName: string;
  lastName: string;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  dob: Date | null;
  onChangeDob: (v: Date | null) => void;
  password: string;
  onChangePassword: (v: string) => void;
  confirmPassword: string;
  onChangeConfirmPassword: (v: string) => void;
  rememberMe: boolean;
  onChangeRememberMe: (v: boolean) => void;
  agreed: boolean;
  onChangeAgreed: (v: boolean) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onUseDifferentEmail: () => void;
  onSubmit: () => void;
  busy: boolean;
  disabled: boolean;
}

/**
 * Full registration for an email with no Jubilee ID anywhere.
 *
 * Two deliberate divergences from the web:
 *  - the 13+ age gate is enforced (the web dropped it); the app stores are
 *    explicit about an age gate at account creation.
 *  - date of birth is still collected for that gate even though POST
 *    /api/auth/signup accepts only {name, email, password} and discards it.
 *    Only the linked-account path persists a date. Left as a knowing gap.
 */
export const CreateJubileeIdStep: React.FC<CreateJubileeIdStepProps> = ({
  email,
  firstName,
  lastName,
  onChangeFirstName,
  onChangeLastName,
  dob,
  onChangeDob,
  password,
  onChangePassword,
  confirmPassword,
  onChangeConfirmPassword,
  rememberMe,
  onChangeRememberMe,
  agreed,
  onChangeAgreed,
  onOpenTerms,
  onOpenPrivacy,
  onUseDifferentEmail,
  onSubmit,
  busy,
  disabled,
}) => {
  const { t } = useTranslation();
  const lastRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const onTermsAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'openTerms') onOpenTerms();
    if (e.nativeEvent.actionName === 'openPrivacy') onOpenPrivacy();
  };

  return (
    <>
      <AppText variant="bodySm" color="textSecondary" style={styles.subtitle}>
        {t('auth.door.create.subtitle', { site: 'KJubilee' })}
      </AppText>

      <View style={styles.nameRow}>
        <AuthTextField
          value={firstName}
          onChangeText={onChangeFirstName}
          placeholder={t('auth.door.create.firstName')}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => lastRef.current?.focus()}
          containerStyle={styles.nameField}
        />
        <AuthTextField
          ref={lastRef}
          value={lastName}
          onChangeText={onChangeLastName}
          placeholder={t('auth.door.create.lastName')}
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="next"
          containerStyle={styles.nameField}
        />
      </View>

      <View style={styles.dob}>
        <DateOfBirthField
          value={dob}
          onChange={onChangeDob}
          label={t('auth.door.create.dateOfBirth')}
          dayLabel={t('auth.door.a11y.dobDay')}
          monthLabel={t('auth.door.a11y.dobMonth')}
          yearLabel={t('auth.door.a11y.dobYear')}
        />
      </View>

      {dob != null && !isOldEnough(dob) ? (
        <AppText variant="caption" color="danger" style={styles.ageError}>
          {t('auth.door.errors.ageMin', { age: MIN_AGE })}
        </AppText>
      ) : null}

      {/* Locked: the address was already established at the door. */}
      <AuthTextField
        value={email}
        readOnly
        placeholder={t('auth.door.create.emailLabel')}
        containerStyle={styles.field}
      />

      <AuthTextField
        ref={passwordRef}
        value={password}
        onChangeText={onChangePassword}
        placeholder={t('auth.door.create.passwordLabel')}
        secure
        showPasswordLabel={t('auth.door.a11y.showPassword')}
        hidePasswordLabel={t('auth.door.a11y.hidePassword')}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => confirmRef.current?.focus()}
        containerStyle={styles.field}
      />

      <View style={styles.field}>
        <AuthTextField
          ref={confirmRef}
          value={confirmPassword}
          onChangeText={onChangeConfirmPassword}
          placeholder={t('auth.door.create.confirmLabel')}
          secure
          showPasswordLabel={t('auth.door.a11y.showPassword')}
          hidePasswordLabel={t('auth.door.a11y.hidePassword')}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <PasswordMatchHint
          password={password}
          confirm={confirmPassword}
          matchedLabel={t('auth.door.match.ok')}
          mismatchLabel={t('auth.door.match.no')}
        />
      </View>

      <AuthCheckbox
        checked={rememberMe}
        onChange={onChangeRememberMe}
        label={t('auth.door.create.rememberMe')}
        style={styles.remember}
      />

      <AuthCheckbox
        checked={agreed}
        onChange={onChangeAgreed}
        style={styles.remember}
        accessibilityLabel={
          t('auth.door.create.agreePrefix') +
          t('profile.termsOfUse') +
          t('auth.door.create.and') +
          t('profile.privacyPolicy')
        }
        // Nested <Text onPress> links are focusable by VoiceOver but NOT by
        // TalkBack, so expose the documents being consented to as actions too.
        accessibilityActions={[
          { name: 'openTerms', label: t('auth.door.a11y.openTerms') },
          { name: 'openPrivacy', label: t('auth.door.a11y.openPrivacy') },
        ]}
        onAccessibilityAction={onTermsAction}
      >
        <AppText variant="bodySm" color="textSecondary" style={styles.agreeText}>
          {t('auth.door.create.agreePrefix')}
          <AppText variant="bodySm" style={styles.link} onPress={onOpenTerms}>
            {t('profile.termsOfUse')}
          </AppText>
          {t('auth.door.create.and')}
          <AppText variant="bodySm" style={styles.link} onPress={onOpenPrivacy}>
            {t('profile.privacyPolicy')}
          </AppText>
        </AppText>
      </AuthCheckbox>

      <AuthPrimaryButton
        label={t('auth.door.create.submit')}
        busyLabel={t('auth.door.create.submitting')}
        onPress={onSubmit}
        loading={busy}
        disabled={disabled}
        style={styles.cta}
      />

      <AuthLinkRow placement="belowSubmit" align="left">
        <AuthLinkButton
          label={t('auth.door.account.useDifferentEmail')}
          onPress={onUseDifferentEmail}
        />
      </AuthLinkRow>
    </>
  );
};

const styles = StyleSheet.create({
  subtitle: { marginTop: 10, marginBottom: 18, lineHeight: 20 },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameField: { flex: 1 },
  dob: { marginTop: 14 },
  ageError: { marginTop: 8 },
  field: { marginTop: 14 },
  remember: { marginTop: 18 },
  agreeText: { lineHeight: 20 },
  link: { color: '#FFFFFF', fontWeight: '700', textDecorationLine: 'underline' },
  cta: { marginTop: 22 },
});
