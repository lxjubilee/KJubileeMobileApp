import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authService } from '@/services/auth';
import type { AuthUser, SignInArgs } from '@/services/auth';
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

/** Cold-start: rebuild the session from secure storage (validates via /me). */
export const restoreSession = createAsyncThunk('auth/restore', () =>
  authService.restoreSession(),
);

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
  (email: string, { rejectWithValue }) =>
    authService.forgotPassword(email).catch((e) => rejectWithValue(errMessage(e))),
);

/** Change the signed-in user's password (Bearer-authed; keeps this session, revokes others). */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  (args: { currentPassword: string; newPassword: string }, { rejectWithValue }) =>
    authService
      .changePassword(args.currentPassword, args.newPassword)
      .catch((e) => rejectWithValue(errMessage(e))),
);

/** Permanently delete the signed-in user's account (Bearer-authed), then sign out. */
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  (_: void, { rejectWithValue }) =>
    authService.deleteAccount().catch((e) => rejectWithValue(errMessage(e))),
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
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

export const { clearSession, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
