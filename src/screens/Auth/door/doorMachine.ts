import type { LinkedProfile } from '@/services/auth';
import { fromIsoDate } from '@/utils';

/**
 * The Jubilee Door's six steps, mirroring the web's single-component flow.
 * Entry is ALWAYS `email` — there is no separate "sign in" or "sign up" entry.
 *
 *   email ──lookup──┬─ existsLocally ──► welcome      (returning member)
 *                   ├─ existsInSso ────► confirm      (Jubilee ID, new here)
 *                   └─ neither ────────► form         (brand new)
 *   confirm ──────────────────────────► createlinked  (or back to form)
 *   welcome / code(login)  ───────────► signed in
 *   form ─────────────────────────────► code(signup) ─► signed in
 */
export type DoorStep = 'email' | 'welcome' | 'confirm' | 'createlinked' | 'form' | 'code';

/** Which challenge the code step is completing. */
export type CodeMode = 'login' | 'signup';

/**
 * Everything the door needs EXCEPT the passwords, which stay in the screen's own
 * state. Keeping secrets out of the machine means this state can be logged,
 * diffed or serialised while debugging without leaking a credential.
 */
export interface DoorState {
  step: DoorStep;
  email: string;
  /** Locked once the lookup has run; "Use a different email" unlocks it. */
  emailLocked: boolean;
  firstName: string;
  lastName: string;
  dob: Date | null;
  rememberMe: boolean;
  agreed: boolean;
  otp: string;
  codeMode: CodeMode;
  /** Identifies the emailed challenge; needed to verify and to resend it. */
  verificationGuid: string | null;
  error: string | null;
  info: string | null;
  /** Resend is hard-locked (the 423 that locks the account for an hour). */
  resendLocked: boolean;
  /** Seconds until the resend link re-enables. */
  cooldown: number;
}

export const initialDoorState = (email = ''): DoorState => ({
  step: 'email',
  email,
  emailLocked: false,
  firstName: '',
  lastName: '',
  dob: null,
  // The web checks "Keep me signed in on this device" by default.
  rememberMe: true,
  agreed: false,
  otp: '',
  codeMode: 'login',
  verificationGuid: null,
  error: null,
  info: null,
  resendLocked: false,
  cooldown: 0,
});

export type DoorEvent =
  | { type: 'setEmail'; value: string }
  | { type: 'setFirstName'; value: string }
  | { type: 'setLastName'; value: string }
  | { type: 'setDob'; value: Date | null }
  | { type: 'setRememberMe'; value: boolean }
  | { type: 'setAgreed'; value: boolean }
  | { type: 'setOtp'; value: string }
  /** The lookup resolved — go to the branch it chose. */
  | { type: 'route'; to: Extract<DoorStep, 'welcome' | 'confirm' | 'form'> }
  /** The Jubilee ID checked out but there is no local account yet. */
  | { type: 'needsProfile'; profile: LinkedProfile }
  /** Preview found no Jubilee ID either — fall through to full registration. */
  | { type: 'redirectSignup' }
  /** A 6-digit code was emailed. */
  | { type: 'challenge'; mode: CodeMode; verificationGuid: string; info: string }
  /** Signup hit a 409 — bounce to the top with the "you already have one" copy. */
  | { type: 'accountExists'; message: string }
  | { type: 'useDifferentEmail' }
  | { type: 'back' }
  | { type: 'error'; message: string }
  | { type: 'info'; message: string }
  | { type: 'clearFeedback' }
  | { type: 'startCooldown'; seconds: number }
  | { type: 'tickCooldown' }
  | { type: 'lockResend' };

/**
 * Where the back affordance goes from each step.
 *
 * `null` means "leave the door" (the caller pops the navigator). Note
 * `createlinked` returns to `confirm` rather than `email`: the password typed
 * there is what provisions the account, so the user must be able to re-enter it.
 * From `code`, back mirrors the web's "Use a different account" / "Edit details"
 * links rather than unwinding to the email step.
 */
export const backTargetFor = (state: DoorState): DoorStep | null => {
  switch (state.step) {
    case 'email':
      return null;
    case 'welcome':
    case 'confirm':
    case 'form':
      return 'email';
    case 'createlinked':
      return 'confirm';
    case 'code':
      return state.codeMode === 'signup' ? 'form' : 'welcome';
  }
};

/** Feedback never survives a step change — it always described the step you left. */
const enter = (state: DoorState, step: DoorStep): DoorState => ({
  ...state,
  step,
  error: null,
  info: null,
});

export function doorReducer(state: DoorState, event: DoorEvent): DoorState {
  switch (event.type) {
    case 'setEmail':
      return { ...state, email: event.value, error: null };
    case 'setFirstName':
      return { ...state, firstName: event.value, error: null };
    case 'setLastName':
      return { ...state, lastName: event.value, error: null };
    case 'setDob':
      return { ...state, dob: event.value, error: null };
    case 'setRememberMe':
      return { ...state, rememberMe: event.value };
    case 'setAgreed':
      return { ...state, agreed: event.value, error: null };
    case 'setOtp':
      return { ...state, otp: event.value.replace(/\D/g, '').slice(0, 6), error: null };

    case 'route':
      return { ...enter(state, event.to), emailLocked: true };

    case 'needsProfile':
      // Adopt whatever the identity authority already knows, but never overwrite
      // something the user has typed on this screen.
      return {
        ...enter(state, 'createlinked'),
        firstName: state.firstName || event.profile.firstName,
        lastName: state.lastName || event.profile.lastName,
        dob: state.dob ?? fromIsoDate(event.profile.dateOfBirth),
      };

    case 'redirectSignup':
      return enter(state, 'form');

    case 'challenge':
      return {
        ...enter(state, 'code'),
        codeMode: event.mode,
        verificationGuid: event.verificationGuid,
        otp: '',
        info: event.info,
        resendLocked: false,
        cooldown: 60,
      };

    case 'accountExists':
      return { ...initialDoorState(state.email), error: event.message };

    case 'useDifferentEmail':
      // Keep the typed address so correcting a typo is one gesture, not a retype.
      return initialDoorState(state.email);

    case 'back': {
      const target = backTargetFor(state);
      if (!target) return state;
      if (target === 'email') return initialDoorState(state.email);
      // code → welcome/form and createlinked → confirm keep the form contents.
      return { ...enter(state, target), otp: '', resendLocked: false, cooldown: 0 };
    }

    case 'error':
      return { ...state, error: event.message, info: null };
    case 'info':
      return { ...state, info: event.message, error: null };
    case 'clearFeedback':
      return { ...state, error: null, info: null };

    case 'startCooldown':
      return { ...state, cooldown: Math.max(0, event.seconds) };
    case 'tickCooldown':
      return state.cooldown > 0 ? { ...state, cooldown: state.cooldown - 1 } : state;
    case 'lockResend':
      return { ...state, resendLocked: true, cooldown: 0 };
  }
}
