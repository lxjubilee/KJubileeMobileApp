import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authService, refreshSession, ssoService, tokenStore } from '@/services/auth';
import type { AccountUserDTO, AuthUser, SignInArgs } from '@/services/auth';
import type { ApiError } from '@/services/api';

export type { AuthUser };

export type AuthStatus = 'restoring' | 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  /** Set when sign-in returned a 2FA challenge; carries the email verify-login needs. */
  pending2FA: { verificationGuid: string; email: string } | null;
  /** Set after sign-up phase 1. */
  pendingSignup: { verificationGuid: string; email: string } | null;
}

const initialState: AuthState = {
  user: null,
  status: 'restoring', // App dispatches restoreSession() on launch.
  error: null,
  pending2FA: null,
  pendingSignup: null,
};

const errMessage = (e: unknown): string =>
  (e as ApiError)?.message ?? (e as Error)?.message ?? 'Something went wrong';

/**
 * Cold-start: rebuild the session from secure storage, validated against
 * `/api/auth/me`.
 *
 * Goes through `ssoService`, not the old `authService.restoreSession`: that one
 * tested a `me.authenticated` flag the Jubilee ID API does not send, so it read
 * every live session as signed-out and cleared the store.
 *
 * The load MUST come first. `tokenStore` keeps the bearer token in memory and
 * only `load()` fills it from the keychain; without that call `/api/auth/me` goes
 * out with no Authorization header, earns a 401, and the 401 handler "signs out"
 * a session that still had weeks to run. That was the every-launch sign-out.
 *
 * A 401 is definitive and clears the session. A network failure falls back to
 * the cached profile — never sign someone out over a blip.
 */
export const restoreSession = createAsyncThunk('auth/restore', async () => {
  const tokens = await tokenStore.load();
  // Nothing stored: a genuinely signed-out launch. Returning here keeps it silent
  // — asking /me who we are with no token would answer 401 and look like a
  // rejected session in the logs.
  if (!tokens) return null;

  // The door's JWT is the whole session, so once it lapses there is nothing to
  // validate. Renew first when a refresh token exists; otherwise stop here rather
  // than spending a round-trip to be told what we already know.
  if (tokenStore.isAccessTokenExpired()) {
    if (!tokenStore.getRefreshToken()) {
      await authService.signOut();
      return null;
    }
    const outcome = await refreshSession();
    if (outcome.result === 'invalid') {
      await authService.signOut();
      return null;
    }
    // Transient (offline, 5xx): keep the tokens and show the cached profile.
    if (outcome.result === 'error') return tokenStore.getUser();
  }

  try {
    const user = await ssoService.restore();
    if (!user) {
      await authService.signOut();
      return null;
    }
    void tokenStore.saveUser(user);
    return user;
  } catch {
    // `ssoService.restore` only throws for non-401 failures, so this is a blip.
    return tokenStore.getUser();
  }
});

/**
 * Email + password sign-in. May resolve to a 2FA challenge, or to one of the
 * one-door routing answers (`needsProfile` / `redirectSignup`) instead of a user.
 */
export const signIn = createAsyncThunk(
  'auth/signIn',
  (args: SignInArgs, { rejectWithValue }) =>
    authService.signIn(args).catch((e) => rejectWithValue(errMessage(e))),
);

/** Complete a 2FA challenge with the emailed OTP code. Email + guid come from `pending2FA`. */
export const verify2FA = createAsyncThunk(
  'auth/verify2FA',
  (args: { code: string; rememberMe?: boolean }, { getState, rejectWithValue }) => {
    const { pending2FA } = (getState() as { auth: AuthState }).auth;
    if (!pending2FA) return rejectWithValue('Your verification session expired. Please sign in again.');
    return authService
      .verify2FA(pending2FA.email, args.code.trim(), pending2FA.verificationGuid, args.rememberMe ?? true)
      .catch((e) => rejectWithValue(errMessage(e)));
  },
);

export const signOut = createAsyncThunk('auth/signOut', () => authService.signOut());

/** Sign-up phase 1: request the emailed verification code. */
export const requestSignup = createAsyncThunk(
  'auth/requestSignup',
  (args: { name: string; email: string; password: string }, { rejectWithValue }) =>
    authService
      .requestSignup(args.name, args.email, args.password)
      .catch((e) => rejectWithValue(errMessage(e))),
);

/** Sign-up phase 2: confirm the code → account created + tokens issued (logged in). */
export const verifySignup = createAsyncThunk(
  'auth/verifySignup',
  (
    args: { verificationGuid: string; verificationCode: string; rememberMe?: boolean },
    { rejectWithValue },
  ) =>
    authService
      .verifySignup(args.verificationGuid, args.verificationCode, args.rememberMe ?? true)
      .catch((e) => rejectWithValue(errMessage(e))),
);

/** Resend the sign-up verification code. Returns resend metadata. */
export const resendSignup = createAsyncThunk(
  'auth/resendSignup',
  (verificationGuid: string, { rejectWithValue }) =>
    authService.resendSignup(verificationGuid).catch((e) => rejectWithValue(errMessage(e))),
);

/** Request a password-reset email (redeemed on the website). Returns its message. */
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  (args: { email: string; turnstileToken: string }, { rejectWithValue }) =>
    authService
      .forgotPassword(args.email, args.turnstileToken)
      .catch((e) => rejectWithValue(errMessage(e))),
);

/** Change the signed-in user's password (Bearer-authed; keeps this session, revokes others). */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  (args: { newPassword: string }, { rejectWithValue }) =>
    authService
      .changePassword(args.newPassword)
      .catch((e) => rejectWithValue(errMessage(e))),
);

/**
 * Rename the account (Bearer-authed; no password — see UpdateNameRequest).
 *
 * Resolves with the saved row so the reducer can take the server's version of
 * the name rather than the typed one: it trims, and builds `name` from the two
 * parts itself.
 */
export const updateName = createAsyncThunk<
  AccountUserDTO,
  { firstName: string; lastName: string },
  { rejectValue: string }
>('auth/updateName', async (args, { rejectWithValue }) => {
  try {
    return await authService.updateName({
      first_name: args.firstName,
      last_name: args.lastName,
    });
  } catch (e) {
    return rejectWithValue(errMessage(e));
  }
});

/**
 * Permanently delete this site's membership (Bearer-authed), then sign out.
 *
 * Both arguments are the server's checks, not decoration: it verifies the
 * password — at the Jubilee ID authority when the credential lives there — and
 * requires the literal word DELETE. Resolves with `keptJubileeId` so the screen
 * can say whether the listener's Jubilee ID survived, which it always does.
 */
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  (args: { password: string; confirm: string }, { rejectWithValue }) =>
    authService.deleteAccount(args).catch((e) =>
      /**
       * Rejects with a SHAPE, not the bare string the other thunks use, because
       * this screen has to tell two failures apart that read identically once
       * flattened: a request the server refused (show its sentence) and one that
       * never arrived (say so, and promise nothing about the account).
       *
       * Safe to differ here — nothing reduces `deleteAccount.rejected`; the only
       * consumer is the Profile screen's own `unwrap()`. `status: 0` is
       * `toApiError`'s marker for "no response at all".
       */
      rejectWithValue({
        message: errMessage(e),
        status: (e as ApiError)?.status ?? -1,
      }),
    ),
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * A door sign-in that has already completed. `ssoService` persists the JWT
     * itself, so nothing is left to await — this only lifts the user into the
     * store, which is what flips RootGate over to the main app.
     */
    sessionEstablished(state, action: { payload: AuthUser }) {
      state.user = action.payload;
      state.status = 'authenticated';
      state.error = null;
    },
    /**
     * Clears auth locally without a network call (used on refresh failure).
     *
     * DO NOT rename, move or re-create this action (or `signOut` /
     * `deleteAccount`, or the slice's `name: 'auth'`). Four other modules match
     * on their generated type strings to tear down the rest of the app:
     * `redux/store/store.ts` (playback queue), `slices/playerSlice.ts`,
     * `slices/likesSlice.ts` and `slices/entitlementSlice.ts`. A same-named
     * action on a different slice would emit a different type and silently leave
     * music playing after sign-out.
     */
    clearSession(state) {
      state.user = null;
      state.status = 'idle';
      state.error = null;
      state.pending2FA = null;
      state.pendingSignup = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // restore
      .addCase(restoreSession.pending, (state) => {
        state.status = 'restoring';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'authenticated' : 'idle';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.status = 'idle';
      })
      // updateName — the only writer of a name outside sign-in. Merged into the
      // session user so the Profile heading and the header initials both follow
      // immediately; nothing else about the session changes.
      .addCase(updateName.fulfilled, (state, action) => {
        if (!state.user) return;
        const u = action.payload;
        state.user = {
          ...state.user,
          firstName: u.first_name,
          lastName: u.last_name,
          displayName:
            u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || state.user.email,
        };
      })
      // signIn
      .addCase(signIn.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      // Exhaustive on purpose. `needsProfile` and `redirectSignup` arrive as HTTP
      // 200 with `success:false` — they are routing instructions the door acts on
      // locally, so they must NOT mark the session authenticated and must not
      // clobber a pending 2FA challenge.
      .addCase(signIn.fulfilled, (state, action) => {
        switch (action.payload.kind) {
          case 'authenticated':
            state.user = action.payload.user;
            state.status = 'authenticated';
            state.pending2FA = null;
            break;
          case '2fa':
            state.status = 'idle';
            // verify-login needs the email; carry it from the sign-in args.
            state.pending2FA = {
              verificationGuid: action.payload.verificationGuid,
              email: action.meta.arg.email.trim(),
            };
            break;
          default:
            state.status = 'idle';
            break;
        }
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Sign in failed';
      })
      // verify2FA
      .addCase(verify2FA.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.pending2FA = null;
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Verification failed';
      })
      // signOut
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        state.error = null;
        state.pending2FA = null;
        state.pendingSignup = null;
      })
      // requestSignup (phase 1)
      .addCase(requestSignup.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(requestSignup.fulfilled, (state, action) => {
        state.status = 'idle';
        state.pendingSignup = action.payload;
      })
      .addCase(requestSignup.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Sign up failed';
      })
      // verifySignup (phase 2) → logged in
      .addCase(verifySignup.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifySignup.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.pending2FA = null;
        state.pendingSignup = null;
      })
      .addCase(verifySignup.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Verification failed';
      });
    // deleteAccount: the screen shows a themed success dialog, then dispatches
    // clearSession() on acknowledge to reset auth + redirect to Sign In.
  },
});

export const { clearSession, clearAuthError, sessionEstablished } = authSlice.actions;
export default authSlice.reducer;
