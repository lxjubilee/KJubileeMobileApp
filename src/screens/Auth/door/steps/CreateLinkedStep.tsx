import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/common';
import {
  AuthCheckbox,
  AuthLinkButton,
  AuthLinkRow,
  AuthPrimaryButton,
  AuthTextField,
  DateOfBirthField,
} from '@/components/auth';
import { MIN_AGE, isOldEnough } from '@/utils';

interface CreateLinkedStepProps {
  firstName: string;
  lastName: string;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  dob: Date | null;
  onChangeDob: (v: Date | null) => void;
  rememberMe: boolean;
  onChangeRememberMe: (v: boolean) => void;
  onUseDifferentEmail: () => void;
  onSubmit: () => void;
  busy: boolean;
  disabled: boolean;
}

/**
 * The Jubilee ID is confirmed; all that's missing is the local account. No
 * password field — the credential lives at the identity authority, and this
 * step provisions against the password already entered on the previous one.
 *
 * Date of birth IS persisted on this path (it syncs back to the Jubilee ID), so
 * the 13+ gate is enforced here whenever a date is given.
 */
export const CreateLinkedStep: React.FC<CreateLinkedStepProps> = ({
  firstName,
  lastName,
  onChangeFirstName,
  onChangeLastName,
  dob,
  onChangeDob,
  rememberMe,
  onChangeRememberMe,
  onUseDifferentEmail,
  onSubmit,
  busy,
  disabled,
}) => {
  const { t } = useTranslation();
  const lastRef = useRef<TextInput>(null);

  return (
    <>
      <AppText variant="bodySm" color="textSecondary" style={styles.subtitle}>
        {t('auth.door.createLinked.subtitle')}
      </AppText>

      <View style={styles.nameRow}>
        <AuthTextField
          value={firstName}
          onChangeText={onChangeFirstName}
          placeholder={t('auth.door.createLinked.firstName')}
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
          placeholder={t('auth.door.createLinked.lastName')}
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
          label={t('auth.door.createLinked.dateOfBirth')}
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

      <AuthCheckbox
        checked={rememberMe}
        onChange={onChangeRememberMe}
        label={t('auth.door.createLinked.rememberMe')}
        style={styles.remember}
      />

      <AuthPrimaryButton
        label={t('auth.door.createLinked.submit')}
        busyLabel={t('auth.door.createLinked.submitting')}
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
  remember: { marginTop: 18 },
  cta: { marginTop: 20 },
});
