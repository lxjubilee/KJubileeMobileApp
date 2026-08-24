import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BackHandler, Keyboard, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthBanner, AuthScreenShell } from '@/components/auth';
import { useAppDispatch } from '@/hooks';
import { signIn, verify2FA, verifySignup } from '@/redux';
import { authService, readAuthError, type LookupResponseDTO } from '@/services/auth';
import { CONFIG } from '@/constants';
import {
  fromIsoDate,
  isEmail,
  isOldEnough,
  isPasswordLongEnough,
  logger,
  normalizeEmail,
  toIsoDate,
} from '@/utils';
import type { AuthStackParamList } from '@/navigation/types';
import { backTargetFor, doorReducer, initialDoorState } from './doorMachine';
import { EmailStep } from './steps/EmailStep';
import { PasswordStep } from './steps/PasswordStep';
import { CreateLinkedStep } from './steps/CreateLinkedStep';
import { CreateJubileeIdStep } from './steps/CreateJubileeIdStep';
import { CodeStep } from './steps/CodeStep';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'JubileeDoor'>;
type Route = RouteProp<AuthStackParamList, 'JubileeDoor'>;

type Busy = null | 'lookup' | 'submit' | 'resend';

/**
 * The Jubilee Door — one screen, six steps, mirroring kjubilee.com.
 *
 * Everything lives in ONE route rather than six. Three reasons:
 *
 *  - The Turnstile challenge is a WebView. On the Old Architecture a WebView
 *    left mounted underneath a pushed native-stack screen is a known source of
 *    blank views and Android UI-thread stalls; with one route it is genuinely
 *    unmounted by a conditional the moment the step changes.
 *  - The back stack would otherwise be wrong by construction: hardware-back from
 *    the create-linked step would land on the confirm step, whose password has
 *    already been consumed and whose submit would re-POST a preview sign-in.
 *  - The password carried from the confirm step to the provision call never
 *    touches navigation state (which is persisted and logged) or redux.
 */
export const JubileeDoorScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [state, send] = useReducer(doorReducer, initialDoorState(route.params?.email ?? ''));
  const [busy, setBusy] = useState<Busy>(null);

  // Secrets stay out of the machine so its state can be logged while debugging.
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  /** The Jubilee ID password from the confirm step, replayed to provision. */
  const heldSsoPassword = useRef('');

  // Turnstile is shown with the email field, matching the web. The token it
  // mints is not read by /api/auth/lookup — it is carried forward and spent on
  // the /signin the next step makes.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(!CONFIG.TURNSTILE_SITE_KEY);
  const [captchaKey, setCaptchaKey] = useState(0);
  /**
   * A failed /signin consumes the token, and the widget that produced it is back
   * on the email step. Re-show it on the password step so a retry can mint a
   * fresh one instead of forcing the user to start over.
   */
  const [captchaRetry, setCaptchaRetry] = useState(false);
  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
  };

  const scrollRef = useRef<ScrollView>(null);
  /** Answers already paid for, so re-entering an address doesn't re-probe. */
  const lookupMemo = useRef(new Map<string, LookupResponseDTO>());
  const lookupInFlight = useRef(false);

  const fail = useCallback((message: string) => {
    send({ type: 'error', message });
    // On the taller steps the banner can sit far above the fold.
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // --- step transitions ------------------------------------------------------

  const goBack = useCallback(() => {
    const target = backTargetFor(state);
    if (!target) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Welcome');
      return;
    }
    Keyboard.dismiss();
    setPassword('');
    setConfirmPassword('');
    if (target === 'email') {
      heldSsoPassword.current = '';
      // The email step mounts its own challenge again; drop the retry flag so
      // the password step doesn't show a second one on the way back through.
      setCaptchaRetry(false);
    }
    send({ type: 'back' });
  }, [navigation, state]);

  const useDifferentEmail = useCallback(() => {
    Keyboard.dismiss();
    setPassword('');
    setConfirmPassword('');
    heldSsoPassword.current = '';
    setCaptchaRetry(false);
    resetCaptcha();
    send({ type: 'useDifferentEmail' });
  }, []);

  // Android hardware back follows the same table as the header arrow. RN 0.81
  // removed BackHandler.removeEventListener — keep the subscription and remove
  // it. Registered via useFocusEffect so it releases when the door blurs to push
  // Forgot Password or the legal screens.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (state.step === 'email') return false; // let the navigator handle it
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [state.step, goBack]),
  );

  // Without this an iOS edge-swipe pops the whole door from a mid-flow step,
  // bypassing the machine entirely.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: state.step === 'email' });
  }, [navigation, state.step]);

  useEffect(() => {
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [state.step]);

  // Resend cooldown ticker.
  useEffect(() => {
    if (state.cooldown <= 0) return;
    const id = setTimeout(() => send({ type: 'tickCooldown' }), 1000);
    return () => clearTimeout(id);
  }, [state.cooldown]);

  // --- step 1: which door? ---------------------------------------------------

  const submitEmail = async () => {
    if (busy) return;
    const email = state.email.trim();
    if (!email) return fail(t('auth.door.errors.emailRequired'));
    // Validate before spending a request: a malformed address is a guaranteed
    // 400 that still counts against 50 per 15 minutes per IP — and on mobile
    // that budget is shared across everyone behind the same carrier NAT.
    if (!isEmail(email)) return fail(t('auth.door.errors.emailInvalid'));
    // The gate reports ready once it holds a token, or after its 8s fail-safe,
    // so this can delay the user briefly but can never strand them.
    if (CONFIG.TURNSTILE_SITE_KEY && !captchaReady) {
      return fail(t('auth.door.errors.captchaRequired'));
    }
    if (lookupInFlight.current) return;

    const key = normalizeEmail(email);
    const cached = lookupMemo.current.get(key);
    if (cached) return send({ type: 'route', to: routeFor(cached) });

    lookupInFlight.current = true;
    setBusy('lookup');
    try {
      const res = await authService.lookupEmail(email);
      lookupMemo.current.set(key, res);
      send({ type: 'route', to: routeFor(res) });
    } catch (e) {
      const meta = readAuthError(e);
      logger.warn('door: lookup failed', meta.status, meta.message);
      // Never advance on a failure: "no account found" and "couldn't ask" are
      // indistinguishable here, and guessing wrong pushes an existing member
      // into a registration they cannot complete.
      fail(
        meta.rateLimited
          ? t('auth.door.errors.rateLimited')
          : t('auth.door.errors.lookupFailed'),
      );
    } finally {
      lookupInFlight.current = false;
      setBusy(null);
    }
  };

  /** existsLocally → sign in; existsInSso → confirm; neither → register. */
  const routeFor = (r: LookupResponseDTO): 'welcome' | 'confirm' | 'form' => {
    if (r.existsLocally) return 'welcome';
    if (r.existsInSso) return 'confirm';
    return 'form';
  };

  // --- steps 2A / 2B-1: password ---------------------------------------------

  const submitPassword = async () => {
    if (busy) return;
    if (!password) return fail(t('auth.door.errors.passwordRequired'));
    // Only gate here when the challenge is actually on screen — i.e. a retry.
    // On the first attempt the token came from the email step.
    if (CONFIG.TURNSTILE_SITE_KEY && captchaRetry && !captchaReady) {
      return fail(t('auth.door.errors.captchaRequired'));
    }
    const preview = state.step === 'confirm';
    if (preview) heldSsoPassword.current = password;

    setBusy('submit');
    try {
      const result = await dispatch(
        signIn({
          email: state.email,
          password,
          rememberMe: state.rememberMe,
          cfTurnstileToken: captchaToken ?? undefined,
          ...(preview ? { preview: true as const } : null),
        }),
      );

      if (!signIn.fulfilled.match(result)) {
        // The token is single-use and has now been spent. Surface the challenge
        // on this step so the next attempt has a fresh one.
        setCaptchaRetry(true);
        resetCaptcha();
        return fail((result.payload as string) ?? t('auth.door.errors.generic'));
      }

      switch (result.payload.kind) {
        case 'authenticated':
          return; // RootGate swaps the navigator out from under us
        case '2fa':
          setPassword('');
          return send({
            type: 'challenge',
            mode: 'login',
            verificationGuid: result.payload.verificationGuid,
            info: t('auth.door.info.loginCodeSent'),
          });
        case 'needsProfile': {
          const { profile } = result.payload;
          // A date the authority sent but we could not read would silently show
          // an empty field and ask the user to retype what the server knows.
          if (profile.dateOfBirth && !fromIsoDate(profile.dateOfBirth)) {
            logger.warn('door: unparseable date_of_birth from the identity authority', profile.dateOfBirth);
          }
          heldSsoPassword.current = password;
          setPassword('');
          return send({ type: 'needsProfile', profile });
        }
        case 'redirectSignup':
          setPassword('');
          return send({ type: 'redirectSignup' });
        default:
          setCaptchaRetry(true);
          resetCaptcha();
          return fail(t('auth.door.errors.generic'));
      }
    } finally {
      setBusy(null);
    }
  };

  // --- step 2B-2: provision the local account --------------------------------

  const submitCreateLinked = async () => {
    if (busy) return;
    if (!state.firstName.trim() || !state.lastName.trim()) {
      return fail(t('auth.door.errors.nameRequired'));
    }
    // Date of birth genuinely persists on this path, so gate it when given.
    if (state.dob && !isOldEnough(state.dob)) return fail(t('auth.door.errors.ageMin', { age: 13 }));

    setBusy('submit');
    try {
      const result = await dispatch(
        signIn({
          email: state.email,
          password: heldSsoPassword.current,
          rememberMe: state.rememberMe,
          provision: true,
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          dateOfBirth: state.dob ? toIsoDate(state.dob) : undefined,
        }),
      );
      if (!signIn.fulfilled.match(result)) {
        return fail((result.payload as string) ?? t('auth.door.errors.createFailed'));
      }
      if (result.payload.kind !== 'authenticated') fail(t('auth.door.errors.createFailed'));
    } finally {
      setBusy(null);
    }
  };

  // --- step 2C: full registration --------------------------------------------

  const submitCreateJubileeId = async () => {
    if (busy) return;
    if (!state.firstName.trim() || !state.lastName.trim()) {
      return fail(t('auth.door.errors.nameRequired'));
    }
    if (!state.dob) return fail(t('auth.door.errors.dobRequired'));
    if (!isOldEnough(state.dob)) return fail(t('auth.door.errors.ageMin', { age: 13 }));
    if (!isPasswordLongEnough(password)) {
      return fail(t('auth.door.errors.passwordTooShort', { count: 8 }));
    }
    if (password !== confirmPassword) return fail(t('auth.door.errors.passwordsDoNotMatch'));
    if (!state.agreed) return fail(t('auth.door.errors.termsRequired'));

    setBusy('submit');
    try {
      // Called directly rather than through the thunk: this creates no session,
      // so redux owns nothing here, and the door needs the 409 status that the
      // thunk flattens into a message.
      const challenge = await authService.requestSignup(
        `${state.firstName.trim()} ${state.lastName.trim()}`,
        state.email,
        password,
      );
      send({
        type: 'challenge',
        mode: 'signup',
        verificationGuid: challenge.verificationGuid,
        info: t('auth.door.info.signupCodeSent'),
      });
    } catch (e) {
      const meta = readAuthError(e);
      if (meta.status === 409) {
        setPassword('');
        setConfirmPassword('');
        return send({ type: 'accountExists', message: t('auth.door.errors.accountExists') });
      }
      fail(meta.message || t('auth.door.errors.signupFailed'));
    } finally {
      setBusy(null);
    }
  };

  // --- step 3: the emailed code ----------------------------------------------

  const submitCode = async () => {
    if (busy || state.otp.length !== 6 || !state.verificationGuid) return;
    setBusy('submit');
    try {
      const result =
        state.codeMode === 'signup'
          ? await dispatch(
              verifySignup({
                verificationGuid: state.verificationGuid,
                verificationCode: state.otp,
                rememberMe: state.rememberMe,
              }),
            )
          : await dispatch(verify2FA({ code: state.otp, rememberMe: state.rememberMe }));

      const ok =
        state.codeMode === 'signup'
          ? verifySignup.fulfilled.match(result)
          : verify2FA.fulfilled.match(result);
      if (!ok) fail((result.payload as string) ?? t('auth.door.errors.verifyFailed'));
    } finally {
      setBusy(null);
    }
  };

  const resendCode = async () => {
    if (busy || state.cooldown > 0 || state.resendLocked || !state.verificationGuid) return;
    setBusy('resend');
    try {
      const res =
        state.codeMode === 'signup'
          ? await authService.resendSignup(state.verificationGuid)
          : await authService.resendLoginCode(state.email, state.verificationGuid);
      send({ type: 'startCooldown', seconds: 60 });
      send({
        type: 'info',
        message:
          typeof res.resendsRemaining === 'number'
            ? t('auth.door.info.resentWithCount', { count: res.resendsRemaining })
            : t('auth.door.info.resent'),
      });
    } catch (e) {
      const meta = readAuthError(e);
      if (meta.locked) {
        // The sign-in resend cap answers 423 and locks the account for an hour.
        // Stop offering the button rather than inviting a retry that cannot work.
        send({ type: 'lockResend' });
        return fail(t('auth.door.errors.accountLocked'));
      }
      if (meta.exhausted) return fail(t('auth.door.errors.resendFailed'));
      if (typeof meta.cooldownSeconds === 'number') {
        send({ type: 'startCooldown', seconds: meta.cooldownSeconds });
        return;
      }
      fail(meta.rateLimited ? t('auth.door.errors.rateLimited') : t('auth.door.errors.resendFailed'));
    } finally {
      setBusy(null);
    }
  };

  // --- render ----------------------------------------------------------------

  const titleKey: Record<typeof state.step, string> = {
    email: 'auth.door.email.title',
    welcome: 'auth.door.welcome.title',
    confirm: 'auth.door.confirm.title',
    createlinked: 'auth.door.createLinked.title',
    form: 'auth.door.create.title',
    code: 'auth.door.code.title',
  };

  const submitting = busy === 'submit';

  return (
    <AuthScreenShell
      onBack={goBack}
      backLabel={t('auth.door.a11y.back')}
      title={t(titleKey[state.step], { site: 'KJubilee' })}
      scrollRef={scrollRef}
    >
      <AuthBanner message={state.info} tone="info" />
      <AuthBanner message={state.error} tone="error" />

      {state.step === 'email' ? (
        <EmailStep
          email={state.email}
          onChangeEmail={(v) => send({ type: 'setEmail', value: v })}
          onSubmit={submitEmail}
          busy={busy === 'lookup'}
          disabled={state.email.trim().length === 0 || busy !== null}
          captchaKey={captchaKey}
          onCaptchaToken={setCaptchaToken}
          onCaptchaReady={setCaptchaReady}
        />
      ) : null}

      {state.step === 'welcome' || state.step === 'confirm' ? (
        <PasswordStep
          mode={state.step}
          email={state.email}
          password={password}
          onChangePassword={setPassword}
          rememberMe={state.rememberMe}
          onChangeRememberMe={(v) => send({ type: 'setRememberMe', value: v })}
          onUseDifferentEmail={useDifferentEmail}
          onForgotPassword={() =>
            navigation.navigate('ForgotPassword', { email: state.email.trim() })
          }
          onSubmit={submitPassword}
          busy={submitting}
          disabled={password.length === 0 || busy !== null}
          showCaptcha={captchaRetry}
          captchaKey={captchaKey}
          onCaptchaToken={setCaptchaToken}
          onCaptchaReady={setCaptchaReady}
        />
      ) : null}

      {state.step === 'createlinked' ? (
        <CreateLinkedStep
          firstName={state.firstName}
          lastName={state.lastName}
          onChangeFirstName={(v) => send({ type: 'setFirstName', value: v })}
          onChangeLastName={(v) => send({ type: 'setLastName', value: v })}
          dob={state.dob}
          onChangeDob={(v) => send({ type: 'setDob', value: v })}
          rememberMe={state.rememberMe}
          onChangeRememberMe={(v) => send({ type: 'setRememberMe', value: v })}
          onUseDifferentEmail={useDifferentEmail}
          onSubmit={submitCreateLinked}
          busy={submitting}
          disabled={busy !== null}
        />
      ) : null}

      {state.step === 'form' ? (
        <CreateJubileeIdStep
          email={state.email}
          firstName={state.firstName}
          lastName={state.lastName}
          onChangeFirstName={(v) => send({ type: 'setFirstName', value: v })}
          onChangeLastName={(v) => send({ type: 'setLastName', value: v })}
          dob={state.dob}
          onChangeDob={(v) => send({ type: 'setDob', value: v })}
          password={password}
          onChangePassword={setPassword}
          confirmPassword={confirmPassword}
          onChangeConfirmPassword={setConfirmPassword}
          rememberMe={state.rememberMe}
          onChangeRememberMe={(v) => send({ type: 'setRememberMe', value: v })}
          agreed={state.agreed}
          onChangeAgreed={(v) => send({ type: 'setAgreed', value: v })}
          onOpenTerms={() => navigation.navigate('TermsOfUse')}
          onOpenPrivacy={() => navigation.navigate('PrivacyPolicy')}
          onUseDifferentEmail={useDifferentEmail}
          onSubmit={submitCreateJubileeId}
          busy={submitting}
          disabled={busy !== null}
        />
      ) : null}

      {state.step === 'code' ? (
        <CodeStep
          mode={state.codeMode}
          email={state.email.trim()}
          otp={state.otp}
          onChangeOtp={(v) => send({ type: 'setOtp', value: v })}
          onSubmit={submitCode}
          onResend={resendCode}
          onStepBack={goBack}
          cooldown={state.cooldown}
          resendLocked={state.resendLocked}
          busy={submitting}
          disabled={state.otp.length !== 6 || busy !== null}
        />
      ) : null}
    </AuthScreenShell>
  );
};

export default JubileeDoorScreen;
