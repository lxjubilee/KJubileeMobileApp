import type { AuthSuccessDTO, Tokens, UserDTO } from './authDto';

/**
 * Pure classification of auth responses. No axios, React Native or redux imports
 * — everything here is a plain function over a parsed body, so the routing rules
 * can be reasoned about (and unit-tested) in isolation.
 */

/** The profile in camelCase, so no snake_case leaks past this boundary. */
export interface LinkedProfile {
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD`, or '' when the authority holds no date. */
  dateOfBirth: string;
}

export type SigninOutcome =
  | { kind: 'authenticated'; user: UserDTO; tokens: Tokens }
  | { kind: '2fa'; verificationGuid: string }
  | { kind: 'needsProfile'; profile: LinkedProfile }
  | { kind: 'redirectSignup'; message?: string }
  | { kind: 'unrecognized'; message?: string };

const asRecord = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const toLinkedProfile = (raw: unknown): LinkedProfile => {
  const p = asRecord(raw) ?? {};
  return {
    firstName: str(p.first_name),
    lastName: str(p.last_name),
    dateOfBirth: str(p.date_of_birth),
  };
};

/**
 * Decide what a `/signin`, `/verify-login` or `/verify-signup` 2xx body means.
 *
 * The ORDER of these checks is the whole point:
 *
 *  1. A 2FA challenge carries no tokens, so it has to be recognised first.
 *  2. "Am I signed in?" is decided by `tokens` + `user`, NOT by `success`.
 *     `/verify-signup` answers 201 and `/verify-login` answers 200, and neither
 *     includes a `success` field — gating on it is the single easiest way to
 *     break this flow.
 *  3. `needsProfile` and `redirect: 'signup'` arrive as HTTP 200 with
 *     `success: false`. They are routing instructions, not failures.
 *
 * Never throws. An unrecognised 2xx shape degrades to `unrecognized` rather than
 * crashing the door — the one-door fields are inert outside SSO login mode, so a
 * mode mismatch is a realistic outcome rather than a "can't happen".
 */
export function classifySignin(response: unknown): SigninOutcome {
  const r = asRecord(response);
  if (!r) return { kind: 'unrecognized' };

  if (r.requires2FA === true) {
    return { kind: '2fa', verificationGuid: str(r.verificationGuid) };
  }

  const tokens = asRecord(r.tokens);
  const user = asRecord(r.user);
  if (tokens && user && typeof tokens.accessToken === 'string' && tokens.accessToken) {
    const success = response as AuthSuccessDTO;
    return { kind: 'authenticated', user: success.user, tokens: success.tokens };
  }

  if (r.needsProfile === true) {
    return { kind: 'needsProfile', profile: toLinkedProfile(r.profile) };
  }

  if (r.success === false && r.redirect === 'signup') {
    return { kind: 'redirectSignup', message: str(r.message) || undefined };
  }

  return { kind: 'unrecognized', message: str(r.message) || undefined };
}

/**
 * Fields the API hangs off an error body alongside `error`/`message`. The door
 * needs them to drive cooldowns, attempt counters and lockouts.
 */
export interface AuthErrorMeta {
  status: number;
  message: string;
  attemptsRemaining?: number;
  cooldownSeconds?: number;
  resendsRemaining?: number;
  lockedUntil?: string;
  /** Account is locked — stop offering retries until `lockedUntil`. */
  locked: boolean;
  /** Resend budget spent; the challenge must be restarted. */
  exhausted: boolean;
  /** True for 429 — the caller should show its own copy, never the body text. */
  rateLimited: boolean;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);

/**
 * Read the useful parts of a rejected auth request.
 *
 * Two shapes have to be tolerated. The global limiter answers 429 with a PLAIN
 * TEXT body (not JSON), so `raw` can be a string — hence the object guard. And a
 * 423 lockout must be recognised from either the status or a `locked` flag,
 * because the resend endpoints signal it both ways.
 */
export function readAuthError(e: unknown): AuthErrorMeta {
  const err = asRecord(e) ?? {};
  const status = num(err.status) ?? 0;
  const raw = asRecord(err.raw);
  const message = str(err.message);

  const locked = status === 423 || raw?.locked === true;
  const rateLimited = status === 429;

  return {
    status,
    // For 429/423 the body is either plain text or a server string we do not want
    // to surface verbatim; the caller substitutes its own localized copy.
    message,
    attemptsRemaining: num(raw?.attemptsRemaining),
    cooldownSeconds: num(raw?.cooldownSeconds),
    resendsRemaining: num(raw?.resendsRemaining),
    lockedUntil: raw && typeof raw.lockedUntil === 'string' ? raw.lockedUntil : undefined,
    locked: !!locked,
    exhausted: raw?.exhausted === true,
    rateLimited,
  };
}
