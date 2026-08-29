import { logger } from '@/utils';
import { configureApiClient } from '@/services/api/client';
import { authEndpoints } from './authEndpoints';
import { classifySignin, type LinkedProfile } from './authOutcome';
import type {
  AccountUserDTO,
  DeleteAccountRequest,
  LibraryCountsDTO,
  LookupResponseDTO,
} from './authDto';
import { AuthUser, mapUser } from './authMappers';
import { tokenStore } from './tokenStore';
import { buildDeviceInfo } from './deviceInfo';
import { configureAuthClient, refreshSession } from './authClient';
import { clearSessionCookies } from './cookieJar';

/**
 * What a sign-in attempt resolved to. Beyond the original two outcomes, the one
 * door adds the two 200-with-`success:false` routing answers.
 */
export type SignInResult =
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: '2fa'; verificationGuid: string }
  | { kind: 'needsProfile'; profile: LinkedProfile }
  | { kind: 'redirectSignup' }
  | { kind: 'unrecognized'; message?: string };

/** Arguments for `signIn`. The one-door fields are inert outside SSO login mode. */
export interface SignInArgs {
  email: string;
  password: string;
  rememberMe: boolean;
  cfTurnstileToken?: string;
  /** Inline 2FA completion instead of a separate /verify-login call. */
  verificationGuid?: string;
  verificationCode?: string;
  /** Verify the Jubilee ID credential and report where to go, creating nothing. */
  preview?: true;
  /** Create the missing local account for a confirmed Jubilee ID. */
  provision?: true;
  firstName?: string;
  lastName?: string;
  /** `YYYY-MM-DD` — build it with `toIsoDate`, not `toISOString`. */
  dateOfBirth?: string;
}

export interface SignupChallenge {
  verificationGuid: string;
  email: string;
}

/**
 * Wires the auth client's refresh/failure hooks to the token store. `onAuthFailure`
 * is called when a refresh fails (session truly dead) — the app should sign out.
 * Call once at startup.
 */
export function initAuthClient(onAuthFailure: () => void): void {
  configureAuthClient({
    getRefreshToken: () => tokenStore.getRefreshToken(),
    isAccessTokenExpired: () => tokenStore.isAccessTokenExpired(),
    persistTokens: ({ accessToken, refreshToken, expiresAt }) => {
      void tokenStore.updateTokens(accessToken, refreshToken, expiresAt);
    },
    onAuthFailure,
  });
  // The catalog/data client shares this session: give it the same single-flight
  // refresh so a 401 there renews the token instead of failing the request.
  configureApiClient(async () => {
    const outcome = await refreshSession();
    return outcome.result === 'ok' ? outcome.accessToken : null;
  });
  // Flush any jv_session cookie persisted from a previous run so mutations
  // (logout/change-password/delete) aren't treated as cookie requests → CSRF 403.
  void clearSessionCookies();
}

export const authService = {
  /**
   * Which door the given email should open. Submit-only — see
   * `authEndpoints.lookup` for why this must not run per keystroke.
   */
  lookupEmail(email: string): Promise<LookupResponseDTO> {
    return authEndpoints.lookup(email.trim());
  },

  /**
   * Email + password sign-in. Resolves to tokens, a 2FA challenge, or one of the
   * one-door routing answers.
   *
   * Tokens are persisted ONLY on the authenticated branch: a `preview`, a
   * `needsProfile` and a `redirectSignup` must all leave the token store alone.
   */
  async signIn(args: SignInArgs): Promise<SignInResult> {
    const deviceInfo = await buildDeviceInfo();
    const res = await authEndpoints.signin({
      email: args.email.trim(),
      password: args.password,
      rememberMe: args.rememberMe,
      cfTurnstileToken: args.cfTurnstileToken,
      verificationGuid: args.verificationGuid,
      verificationCode: args.verificationCode,
      preview: args.preview,
      provision: args.provision,
      first_name: args.firstName,
      last_name: args.lastName,
      date_of_birth: args.dateOfBirth,
      deviceInfo,
    });

    const outcome = classifySignin(res);
    switch (outcome.kind) {
      case 'authenticated': {
        await tokenStore.save(outcome.tokens);
        const user = mapUser(outcome.user);
        await tokenStore.saveUser(user);
        return { kind: 'authenticated', user };
      }
      case '2fa':
        return { kind: '2fa', verificationGuid: outcome.verificationGuid };
      case 'needsProfile':
        return { kind: 'needsProfile', profile: outcome.profile };
      case 'redirectSignup':
        return { kind: 'redirectSignup' };
      default:
        logger.warn('AUTH signin: unrecognized response shape', outcome.message ?? '');
        return { kind: 'unrecognized', message: outcome.message };
    }
  },

  /** Complete a 2FA challenge with the emailed OTP code. */
  async verify2FA(
    email: string,
    code: string,
    verificationGuid: string,
    rememberMe: boolean,
  ): Promise<AuthUser> {
    const res = await authEndpoints.verifyLogin({
      email,
      verificationGuid,
      verificationCode: code,
      rememberMe,
    });
    await tokenStore.save(res.tokens);
    const user = mapUser(res.user);
    await tokenStore.saveUser(user);
    return user;
  },

  // --- Sign up ---

  /** Phase 1: request a 6-digit email verification code. No account yet. */
  async requestSignup(name: string, email: string, password: string): Promise<SignupChallenge> {
    const res = await authEndpoints.signup({ name: name.trim(), email: email.trim(), password });
    return { verificationGuid: res.verificationGuid, email: res.email };
  },

  /**
   * Phase 2: confirm the code → account created + tokens issued (logged in).
   *
   * Answers 201 with no `success` field, so the presence of tokens is the only
   * reliable signal. `rememberMe` is threaded through rather than hardcoded —
   * the web forgets to send it here, which silently downgrades every brand-new
   * account from a 1-year refresh token to a 30-day one despite the checkbox.
   */
  async verifySignup(
    verificationGuid: string,
    verificationCode: string,
    rememberMe: boolean,
  ): Promise<AuthUser> {
    const res = await authEndpoints.verifySignup({
      verificationGuid,
      verificationCode: verificationCode.trim(),
      rememberMe,
    });
    await tokenStore.save(res.tokens);
    const user = mapUser(res.user);
    await tokenStore.saveUser(user);
    return user;
  },

  /** Resend the sign-up code for an in-progress sign-up. */
  resendSignup(verificationGuid: string) {
    return authEndpoints.sendSignupVerification(verificationGuid);
  },

  /**
   * Resend the sign-in 2FA code. Note this endpoint answers 423 (not 429) once
   * the resend cap is hit, and that 423 LOCKS THE ACCOUNT for an hour — callers
   * must stop offering the button rather than treating it as a normal failure.
   */
  resendLoginCode(email: string, verificationGuid: string) {
    return authEndpoints.sendLoginVerification(email.trim(), verificationGuid);
  },

  // --- Password / account ---

  /**
   * Request a password-reset email (redeemed on the website).
   *
   * Returns nothing. There is nothing to return: the route answers
   * `{ success: true }`, and the reply is deliberately identical whether or not
   * the address has an account, so it carries no information a caller could act
   * on. Resolving is the whole answer; throwing is the other one.
   *
   * `success` IS checked rather than assumed. Both of the server's failure
   * paths are non-2xx today (403 Turnstile, 503 mail/DB), so axios throws before
   * this line and the check looks redundant — but "the server cannot fail with a
   * 200" is an assumption about someone else's code, and the cost of it being
   * wrong is telling a locked-out user their reset link is on the way when it is
   * not. That is the one failure this screen must never produce.
   */
  async forgotPassword(email: string, turnstileToken: string): Promise<void> {
    const res = await authEndpoints.forgotPassword(email.trim(), turnstileToken);
    if (!res?.success) {
      throw new Error(res?.error || 'We could not send the reset email just now.');
    }
  },

  /**
   * Change the signed-in user's password (Bearer-authed).
   *
   * `POST /api/account/password` revokes EVERY session on the account — this
   * device's included — and hands back a replacement pair. So the reply is not
   * an acknowledgement to discard: persisting those tokens is the only thing
   * standing between a successful change and being signed out for succeeding.
   *
   * Password sync to the Jubilee ID authority is the server's job
   * (`lib/account.js` -> `sso.ssoChangePasswordByEmail`); the client never
   * touches it. `scope` reports how far the change reached.
   */
  async changePassword(
    newPassword: string,
  ): Promise<{ scope?: 'jubilee-id' | 'local'; reauthenticate: boolean }> {
    // `currentPassword` is deliberately absent, not blank — see the note on
    // ChangePasswordRequest. The server still requires it and will answer 400
    // until it offers another way to re-authenticate the caller.
    const res = await authEndpoints.changePassword({ newPassword });

    // A 200 that still says success:false is not a shape this route produces,
    // but reading the flag costs nothing and beats reporting a silent failure.
    if (!res?.success) throw new Error(res?.error || 'Could not change your password.');

    if (res.token) {
      await tokenStore.save({
        accessToken: res.token,
        refreshToken: res.refreshToken,
        expiresAt: res.expiresAt,
      });
      return { scope: res.scope, reauthenticate: false };
    }

    // `reauthenticate` — the password DID change, but no replacement session came
    // back. The old one is revoked, so holding on to it would leave the app
    // believing in a session the server has already discarded.
    await tokenStore.clear();
    return { scope: res.scope, reauthenticate: true };
  },

  /**
   * The account as its settings screen needs it: where the password lives,
   * whether a Jubilee ID is linked, and what a deletion would take with it.
   *
   * Advisory, never load-bearing. The delete flow must still work when this
   * fails — `libraryCounts` on the server takes the same view, returning zeroes
   * rather than letting a failed count keep someone out of their own settings.
   */
  async getAccount(): Promise<{ user: AccountUserDTO; library: LibraryCountsDTO }> {
    const res = await authEndpoints.getAccount();
    if (!res?.success || !res.user) throw new Error(res?.error || 'Could not load your account.');
    return {
      user: res.user,
      library: res.library ?? { stations_favorited: 0, stations_followed: 0, albums_followed: 0 },
    };
  },

  /**
   * Permanently delete this site's membership. Bearer-authed, irreversible.
   *
   * Both fields are the server's, not ours: it verifies the password (at the
   * Jubilee ID authority when the credential lives there) and requires the typed
   * word. Neither may be faked to get past a check that exists on purpose.
   *
   * The token clear happens ONLY on a confirmed success. A failed attempt — a
   * wrong password above all — must leave the session exactly as it was, or a
   * typo becomes a sign-out.
   *
   * There is no sign-out call to make afterwards: deleting the `kj_users` row
   * cascades to `kj_sessions`, so every device is already revoked server-side.
   */
  async deleteAccount(body: DeleteAccountRequest): Promise<{ keptJubileeId: boolean }> {
    const res = await authEndpoints.deleteAccount(body);

    // Read the flag, not the status. The door's `/api/sso/login` answers a
    // meaningful `success:false` with a 200, and trusting 2xx there would have
    // left the app "signed in" with no token. Cheap insurance for the same shape.
    if (!res?.success) throw new Error(res?.error || 'Your account could not be deleted.');

    await tokenStore.clear();
    return { keptJubileeId: Boolean(res.kept_jubilee_id) };
  },

  /**
   * Restore a persisted session on cold start; null if there is none.
   *
   * "Keep me signed in" gives us a refresh token good for a YEAR, while the access
   * token lasts an hour — so on almost every launch the access token is stale and
   * must be renewed. Two rules make that reliable:
   *
   *  1. Renew PROACTIVELY. `GET /api/auth/me` answers 200 `{authenticated:false}`
   *     for an expired token — never 401 — so the 401 interceptor would never fire
   *     and the session would be thrown away with a perfectly good refresh token
   *     still in the keychain. That was the hourly-relogin bug.
   *  2. Only discard tokens when the server DEFINITIVELY rejects them. Offline,
   *     timeout and 5xx all keep the session and fall back to the cached profile.
   */
  async restoreSession(): Promise<AuthUser | null> {
    const tokens = await tokenStore.load();
    if (!tokens) return null;

    if (tokenStore.isAccessTokenExpired()) {
      const outcome = await refreshSession();
      if (outcome.result === 'invalid') {
        await tokenStore.clear(); // refresh token revoked/expired → a real sign-out
        return null;
      }
      if (outcome.result === 'error') {
        logger.warn('restoreSession: refresh unavailable — restoring cached session');
        return tokenStore.getUser();
      }
    }

    try {
      let me = await authEndpoints.me();
      // Not authenticated despite a token we believe is live (revoked token, or a
      // skewed device clock). Try one renewal before concluding the session is dead.
      if (!me.authenticated) {
        const outcome = await refreshSession();
        if (outcome.result === 'invalid') {
          await tokenStore.clear();
          return null;
        }
        if (outcome.result === 'error') return tokenStore.getUser();
        me = await authEndpoints.me();
      }
      if (me.authenticated && me.user) {
        const user = mapUser(me.user);
        void tokenStore.saveUser(user);
        return user;
      }
      await tokenStore.clear();
      return null;
    } catch (e) {
      // Network/server failure — never sign the user out over a blip.
      logger.warn('restoreSession: /me failed — restoring cached session', e);
      return tokenStore.getUser();
    }
  },

  /**
   * Sign out.
   *
   * Purely local, and correctly so. The Jubilee ID session is a stateless
   * 30-day JWT: there is no server-side session to invalidate, and
   * `/api/auth/logout` does not exist on that API — it 404'd on every sign-out.
   *
   * That 404 was not harmless in a dev build. The response interceptor logs
   * `AUTH ✗` at error level BEFORE rejecting, so even though the call was
   * wrapped in try/catch and the sign-out completed, `console.error` had already
   * opened a red box — a working action that looked like a crash.
   *
   * Restore the call if the API grows real session revocation.
   */
  async signOut(): Promise<void> {
    await clearSessionCookies();
    await tokenStore.clear();
  },
};
