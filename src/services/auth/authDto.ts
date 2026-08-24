/**
 * DTOs for the unified kjubilee-api auth surface (`/api/auth/*`). See
 * `API docs/API.md`. The API is Bearer-token based; responses carry tokens
 * directly (no cookies). Kept separate from the AuthUser domain model —
 * `authMappers.ts` adapts between them.
 */

export interface UserDTO {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roles?: string[];
  accountType?: string;
  accountId?: string;
  isAccountPrimary?: boolean;
  subscriptionStatus?: string;
  subscriptionPeriod?: string;
  profile_picture_url?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

/** Access + refresh tokens issued by signin/verify/refresh. */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  appName: string;
  appVersion: string;
  language?: string;
}

/**
 * GET /api/auth/lookup?email= — the "one door" identity probe. Unauthenticated,
 * and the only thing the door needs to decide which of three kinds of person is
 * standing at it.
 *
 * `available: false` means the Jubilee ID authority could not be reached, so the
 * booleans are unreliable (the server fails open and reports "not found").
 */
export interface LookupResponseDTO {
  /** Legacy alias of `existsInSso`. */
  exists: boolean;
  /** A Jubilee ID exists for this email at the shared identity authority. */
  existsInSso: boolean;
  /** An active KJubilee account exists for this email. */
  existsLocally: boolean;
  available: boolean;
}

/**
 * POST /api/auth/signin body. `deviceInfo` is a tolerated extra (server ignores).
 *
 * The one-door fields (`preview`, `provision`, `first_name`, `last_name`,
 * `date_of_birth`) are only ACTIVE when the server runs AUTH_LOGIN_MODE=sso. In
 * local/ji mode the request schema accepts and ignores them, so sending the
 * union is safe in every mode. They are snake_case because they mirror the
 * snake_case `profile` the server hands back.
 */
export interface SigninRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  cfTurnstileToken?: string;
  deviceInfo?: DeviceInfo;
  /** Inline 2FA completion (an alternative to POST /verify-login). */
  verificationGuid?: string;
  verificationCode?: string;
  /** Verify the credential and report where to go, without creating anything. */
  preview?: true;
  /** Create the missing local account for a confirmed Jubilee ID. */
  provision?: true;
  first_name?: string;
  last_name?: string;
  /** `YYYY-MM-DD`, built from LOCAL date parts (see utils/validation `toIsoDate`). */
  date_of_birth?: string;
}

/** Signin resolves to tokens, a 2FA challenge, or a routing instruction. */
export interface AuthSuccessDTO {
  user: UserDTO;
  tokens: Tokens;
}
export interface TwoFactorChallengeDTO {
  requires2FA: true;
  verificationGuid: string;
}

/** Profile the identity authority already holds, used to pre-fill the create form. */
export interface LinkedProfileDTO {
  first_name?: string;
  last_name?: string;
  /** `YYYY-MM-DD`, already normalized server-side. */
  date_of_birth?: string;
}

/**
 * HTTP 200 with `success: false`. This is a ROUTING INSTRUCTION, not an error —
 * only a 4xx/5xx is a failure. `needsProfile` means the Jubilee ID checked out
 * but there is no local account yet; `redirect: 'signup'` means there is no
 * Jubilee ID either.
 */
export interface SigninRoutingDTO {
  success: false;
  needsProfile?: true;
  profile?: LinkedProfileDTO;
  redirect?: 'signup';
  message?: string;
}

export type SigninResponseDTO = AuthSuccessDTO | TwoFactorChallengeDTO | SigninRoutingDTO;

export const isTwoFactor = (r: SigninResponseDTO): r is TwoFactorChallengeDTO =>
  (r as TwoFactorChallengeDTO).requires2FA === true;

/** POST /api/auth/verify-login body (2FA step 2). */
export interface VerifyLoginRequest {
  email: string;
  verificationGuid: string;
  verificationCode: string;
  rememberMe?: boolean;
}

/** POST /api/auth/signup body — request a verification code (no account yet). */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}
export interface SignupResponseDTO {
  /** Absent on some responses (e.g. /verify-signup's 201) — never gate on it. */
  success?: boolean;
  requiresVerification: boolean;
  verificationGuid: string;
  email: string;
}

/** POST /api/auth/verify-signup body (step 2). Returns user + tokens. */
export interface VerifySignupRequest {
  verificationGuid: string;
  verificationCode: string;
  rememberMe?: boolean;
}

/** POST /api/auth/send-signup-verification & /send-login-verification response. */
export interface ResendResponseDTO {
  success: boolean;
  resendsRemaining?: number;
}

/** POST /api/auth/refresh response — tokens are nested; the refresh token rotates. */
export interface RefreshResponseDTO {
  tokens: Tokens;
}

/** POST /api/auth/forgot-password response (anti-enumeration; always succeeds). */
export interface ForgotPasswordResponseDTO {
  ok: boolean;
  message: string;
}

/** POST /api/auth/change-password body (Bearer-authed) — note snake_case fields. */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  /** Optional: keep the current session by passing its refresh token. */
  refreshToken?: string;
}
export interface ChangePasswordResponseDTO {
  ok: boolean;
  jiSync?: boolean;
}

/** GET /api/auth/me — verb-agnostic session check (works unauthenticated). */
export interface MeResponseDTO {
  authenticated: boolean;
  user?: UserDTO;
  roles?: string[];
}
