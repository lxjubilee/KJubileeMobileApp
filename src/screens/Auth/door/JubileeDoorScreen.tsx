import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BackHandler, Keyboard, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthBanner, AuthScreenShell } from '@/components/auth';
import { useAppDispatch } from '@/hooks';
import { sessionEstablished } from '@/redux';
import { ssoService, SsoError, toAuthUser, type DoorOutcome } from '@/services/auth';
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

type Nav = NativeStackNavigationProp<AuthStackParamList, 'JubileeDoor'>;
type Route = RouteProp<AuthStackParamList, 'JubileeDoor'>;

type Busy = null | 'lookup' | 'submit';

/**
 * The Jubilee Door — one screen, five steps, mirroring kjubilee.com.
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

  // Turnstile is shown with the email field, matching the web. Unlike the old
  // API, /api/sso/signup/lookup CONSUMES this token itself — it 403s without
  // one — so it is spent on the lookup rather than carried to the next step.
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
  const lookupMemo = useRef(new Map<string, DoorOutcome>());
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
      // The door is the root of the auth stack, so there may be nowhere to go.
      if (navigation.canGoBack()) navigation.goBack();
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
      // The lookup route 403s without a Turnstile token — it is the gate that
      // stops the door being an unauthenticated way to ask whether an address
      // holds a Jubilee ID.
      const res = await ssoService.lookup(email, captchaToken ?? '');
      lookupMemo.current.set(key, res);
      send({ type: 'route', to: routeFor(res) });
    } catch (e) {
      const err = e instanceof SsoError ? e : null;
      logger.warn('door: lookup failed', err?.message);
      // Never advance on a failure: "no account found" and "couldn't ask" are
      // indistinguishable here, and guessing wrong pushes an existing member
      // into a registration they cannot complete. A spent Turnstile token also
      // has to be replaced before the next attempt.
      resetCaptcha();
      fail(err?.message ?? t('auth.door.errors.lookupFailed'));
    } finally {
      lookupInFlight.current = false;
      setBusy(null);
    }
  };

  /** The service already reduced the lookup to one of the three outcomes. */
  const routeFor = (r: DoorOutcome): 'welcome' | 'confirm' | 'form' =>
    r.kind === 'password' ? 'welcome' : r.kind === 'confirm-id' ? 'confirm' : 'form';

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
      const res = await ssoService.signIn({
        email: state.email,
        password,
        rememberMe: state.rememberMe,
      });

      switch (res.kind) {
        case 'signed-in':
          // RootGate swaps the navigator out from under us the moment this lands.
          dispatch(sessionEstablished(toAuthUser(res.user)));
          return;
        case 'create-linked': {
          // The Jubilee ID checked out but there is no local account yet. Hold
          // the password: it is replayed to create the account on the next step.
          heldSsoPassword.current = password;
          setPassword('');
          return send({
            type: 'needsProfile',
            profile: {
              firstName: res.firstName,
              lastName: res.lastName,
              dateOfBirth: res.dob,
            },
          });
        }
        case 'no-account':
          setPassword('');
          return send({ type: 'redirectSignup' });
      }
    } catch (e) {
      const message = e instanceof SsoError ? e.message : t('auth.door.errors.generic');
      // The Turnstile token is single-use and has now been spent; surface the
      // challenge again so a retry carries a fresh one.
      setCaptchaRetry(true);
      resetCaptcha();
      return fail(message);
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
      const user = await ssoService.createLinked({
        email: state.email,
        // Re-verified server-side, so the creation cannot be forged from the
        // client having merely reached this screen.
        password: heldSsoPassword.current,
        first_name: state.firstName.trim(),
        last_name: state.lastName.trim(),
        date_of_birth: state.dob ? toIsoDate(state.dob) : '',
        rememberMe: state.rememberMe,
      });
      dispatch(sessionEstablished(toAuthUser(user)));
    } catch (e) {
      fail(e instanceof SsoError ? e.message : t('auth.door.errors.createFailed'));
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
      const user = await ssoService.createAccount({
        email: state.email,
        password,
        first_name: state.firstName.trim(),
        last_name: state.lastName.trim(),
        date_of_birth: toIsoDate(state.dob),
        rememberMe: state.rememberMe,
      });
      // The Jubilee ID and the local account are created together and the
      // listener is signed straight in — there is no emailed code to wait for.
      dispatch(sessionEstablished(toAuthUser(user)));
    } catch (e) {
      const err = e instanceof SsoError ? e : null;
      // 409 is "you already have an account" — bounce to the top with that copy
      // rather than leaving them on a form that can never succeed.
      if (err && /already exists/i.test(err.message)) {
        setPassword('');
        setConfirmPassword('');
        return send({ type: 'accountExists', message: err.message });
      }
      fail(err?.message ?? t('auth.door.errors.signupFailed'));
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
    </AuthScreenShell>
  );
};

export default JubileeDoorScreen;
