import axios from 'axios';
import { logger } from '@/utils';
import { ssoEndpoints } from './ssoEndpoints';
import { isSession, isSignupExisting } from './ssoDto';
import type {
  SsoLoginRequest,
  SsoRegisterRequest,
  SsoSessionDTO,
  SsoUserDTO,
  SsoVerifyRequest,
} from './ssoDto';
import { tokenStore } from './tokenStore';
import type { AuthUser } from './authMappers';

/**
 * The Jubilee ID door, as three outcomes.
 *
 * The screen asks this module what to do next and never reads a status code or
 * a DTO field itself. That matters here more than usual, because the server
 * signals two different things in ways a status code alone gets wrong:
 *
 *   - Outcome B arrives as **200 with `success: false`**. Treating 2xx as
 *     success would leave the app "signed in" with no token.
 *   - "No account anywhere" arrives as **404**, which is a route to the create
 *     screen, not an error to show.
 *
 * Session model: one HS256 JWT, thirty days, and no refresh endpoint. It is
 * stored in the existing token store with an EMPTY refresh token, which is not
 * a placeholder but the correct wiring — `authClient.refreshSession` returns
 * `invalid` when there is no refresh token, so a 401 signs the listener out
 * instead of attempting a renewal that cannot exist.
 */

export type DoorOutcome =
  /** A: this email has a local account — ask for its password. */
  | { kind: 'password'; email: string }
  /** B: a Jubilee ID exists but no local account — confirm the ID's password. */
  | { kind: 'confirm-id'; email: string }
  /** C: unknown everywhere — create the Jubilee ID and the account together. */
  | { kind: 'create'; email: string };

export type SsoSignInResult =
  | { kind: 'signed-in'; user: SsoUserDTO }
  /** The ID is real and the password right, but the local account must be made.
   *  Carries what the authority already knows, to pre-fill the form. */
  | { kind: 'create-linked'; email: string; firstName: string; lastName: string; dob: string }
  /** No account anywhere — the door should offer to create one. */
  | { kind: 'no-account'; email: string };

export class SsoError extends Error {
  constructor(
    message: string,
    /** True when the listener can fix it by retyping (bad password, bad email). */
    readonly recoverable: boolean,
  ) {
    super(message);
    this.name = 'SsoError';
  }
}

/** Turn any axios failure into the server's own message where it sent one. */
function toSsoError(e: unknown, fallback: string): SsoError {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    const body = e.response?.data as { error?: string } | undefined;
    const message = body?.error || fallback;
    // 400/401/403/409 are all "try again differently"; 5xx and network are not.
    const recoverable = status != null && status >= 400 && status < 500;
    return new SsoError(message, recoverable);
  }
  return new SsoError(fallback, false);
}

/**
 * The door's user is the server's row: snake_case, and `id` may be a number.
 * The app works in `AuthUser`, so convert once here rather than teaching every
 * screen about both shapes.
 */
export function toAuthUser(u: SsoUserDTO): AuthUser {
  const first = (u.first_name ?? '').trim();
  const last = (u.last_name ?? '').trim();
  // The door returns first/last; `/api/auth/me` returns a single `name` column.
  // Prefer whichever is present rather than showing an email as a display name.
  const whole = typeof u.name === 'string' ? u.name.trim() : '';
  return {
    id: String(u.id ?? u.email),
    email: u.email,
    displayName: [first, last].filter(Boolean).join(' ') || whole || u.email,
    firstName: first || undefined,
    lastName: last || undefined,
  };
}

async function persist(session: SsoSessionDTO): Promise<SsoUserDTO> {
  await tokenStore.save({
    accessToken: session.token,
    // Deliberately empty — see the note above. There is no refresh endpoint.
    refreshToken: '',
    expiresAt: session.expiresAt,
  });
  return session.user;
}

export const ssoService = {
  /**
   * Screen 1. Requires a Turnstile token — the route 403s without one, on both
   * the app and the website, so that nobody can use it as an unauthenticated
   * way to ask whether an address has a Jubilee ID.
   *
   * Called on SUBMIT only. The limiter is 30 requests per 15 minutes per IP and
   * carrier CGNAT puts many listeners behind one address; calling it per
   * keystroke would exhaust the budget for a whole network.
   */
  async lookup(email: string, turnstileToken: string): Promise<DoorOutcome> {
    try {
      const r = await ssoEndpoints.lookup({ email, turnstileToken });
      if (r.existsLocally) return { kind: 'password', email };
      if (r.existsInSso) return { kind: 'confirm-id', email };
      return { kind: 'create', email };
    } catch (e) {
      throw toSsoError(e, 'We could not check that email. Please try again.');
    }
  },

  /** Outcome A's password, and Outcome B's confirmation of the Jubilee ID. */
  async signIn(body: SsoLoginRequest): Promise<SsoSignInResult> {
    let data;
    try {
      data = await ssoEndpoints.login(body);
    } catch (e) {
      throw toSsoError(e, 'Could not sign you in. Please try again.');
    }

    if (isSession(data)) return { kind: 'signed-in', user: await persist(data) };
    if (isSignupExisting(data)) {
      return {
        kind: 'create-linked',
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        dob: data.date_of_birth,
      };
    }
    // The remaining shape is the 404 redirect, which `validateStatus` let
    // through precisely so it could be routed rather than thrown.
    if (data.redirect === 'signup') return { kind: 'no-account', email: data.email };

    logger.warn('[sso] unrecognised login response', data);
    throw new SsoError('Could not sign you in. Please try again.', false);
  },

  /** Outcome B, second screen: create the local account behind an existing ID. */
  async createLinked(body: SsoVerifyRequest): Promise<SsoUserDTO> {
    try {
      return await persist(await ssoEndpoints.verify(body));
    } catch (e) {
      throw toSsoError(e, 'Could not create your account. Please try again.');
    }
  },

  /**
   * Restore a session on cold start.
   *
   * The Jubilee ID `/api/auth/me` answers `{ user: { id, email, name } }`, or
   * 401 when the Bearer token is missing or expired. It carries NO
   * `authenticated` flag — the old API's shape — so code testing that field read
   * a perfectly good session as signed-out, found no refresh token to renew
   * with, and cleared the store. A 30-day session died on every relaunch.
   *
   * Returns null only on a definitive 401. A network failure throws, so the
   * caller can fall back to the cached profile instead of signing someone out
   * over a blip.
   */
  async restore(): Promise<AuthUser | null> {
    try {
      const data = (await ssoEndpoints.me()) as { user?: SsoUserDTO };
      return data?.user ? toAuthUser(data.user) : null;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) return null;
      throw e;
    }
  },

  /** Outcome C: create the Jubilee ID and the local account together. */
  async createAccount(body: SsoRegisterRequest): Promise<SsoUserDTO> {
    try {
      return await persist(await ssoEndpoints.register(body));
    } catch (e) {
      throw toSsoError(e, 'Could not create your account. Please try again.');
    }
  },
};
