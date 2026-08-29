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

/**
 * POST /api/auth/forgot-password response.
 *
 * Transcribed from the route, not guessed: `app/api/auth/forgot-password/route.js`
 * answers `{ success: true }` and NOTHING else on the happy path. It used to be
 * declared here as `{ ok, message }` — neither of which the server has ever
 * sent — so `authService.forgotPassword` returned `undefined` every time it
 * succeeded. That went unnoticed only because the screen throws the value away
 * and renders its own copy.
 *
 * Anti-enumeration: an address with no account gets exactly the same `success:
 * true`, because whether an account exists is something only the mailbox is
 * allowed to learn. So a success here means "we accepted the request", never
 * "an email is on its way".
 *
 * The failure paths carry `error` and are non-2xx — 403 when Turnstile rejects
 * the token, 503 when the database or Mailgun is down.
 */
export interface ForgotPasswordResponseDTO {
  success: boolean;
  error?: string;
}

/** POST /api/auth/change-password body (Bearer-authed) — note snake_case fields. */
/**
 * `POST /api/account/password` — camelCase, unlike the older `/api/auth/*` routes.
 *
 * `rememberMe` is omitted deliberately. The server defaults it to true, and the
 * route's own note explains why that is the kind default: someone changing a
 * password in a session they are already signed into has not asked to be signed
 * out of it.
 */
export interface ChangePasswordRequest {
  /**
   * OPTIONAL HERE, STILL REQUIRED THERE.
   *
   * The app no longer collects a current password, so it omits this. The server
   * has not changed: `lib/account.js verifyPassword()` opens with
   * `if (!password) return { ok:false, status:400, error:'Enter your current
   * password.' }`, so every request without it is refused.
   *
   * The field is kept optional rather than deleted precisely so that stays
   * visible — and so nothing is tempted to send `''` to get past a check that is
   * there on purpose.
   */
  currentPassword?: string;
  newPassword: string;
  rememberMe?: boolean;
}

/**
 * The reply carries a WHOLE NEW SESSION, and that is not incidental.
 * `lib/account.js changePassword` revokes every session on the account — this
 * device's included — then mints a fresh pair, "what keeps the person who just
 * succeeded from being thrown out for succeeding". A client that ignores these
 * tokens signs the user out at the moment the change lands.
 *
 * `reauthenticate` is the one case where they are absent: the password DID
 * change, but the replacement session could not be created, so the listener has
 * to sign in again.
 */
export interface ChangePasswordResponseDTO {
  success: boolean;
  /** `jubilee-id` when the change reached the authority and so every Jubilee site. */
  scope?: 'jubilee-id' | 'local';
  reauthenticate?: boolean;
  token?: string;
  expiresAt?: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
  /** Present on failure; already a finished, user-facing sentence. */
  error?: string;
}

/**
 * `GET /api/account` — the settings screen's view of the account.
 *
 * `/api/auth/me` already answers "who am I" for screens that need only an id and
 * an address. This one carries the three things a delete screen cannot be honest
 * without: where the password lives, whether the row is linked to a Jubilee ID,
 * and how much library the deletion would take with it.
 */
export interface AccountSettingsDTO {
  success: boolean;
  user?: AccountUserDTO;
  library?: LibraryCountsDTO;
  error?: string;
}

export interface AccountUserDTO {
  id: string | number;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  role: string;
  email_verified: boolean;
  /** True when this row is joined to a Jubilee ID at the authority. */
  linked_to_jubilee_id: boolean;
  /**
   * Which password the delete screen must ask for. `jubilee-id` means the
   * credential lives at sso.jubileeinspire.com and is shared with every Jubilee
   * site; `local` means a legacy hash in `kj_users`. Only the server knows.
   */
  password_kind: 'jubilee-id' | 'local';
  created_at: string | null;
  last_login_at: string | null;
}

/**
 * What a deletion would take with it. All three tables are `ON DELETE CASCADE`,
 * so these are exact rather than indicative.
 *
 * Shown for one reason: "this cannot be undone" warns about nothing in
 * particular, and "7 favourite stations" warns about something.
 */
export interface LibraryCountsDTO {
  stations_favorited: number;
  stations_followed: number;
  albums_followed: number;
}

/**
 * `POST /api/account/delete` — two locks, because they catch different mistakes.
 *
 * The password catches somebody who is not the owner. The typed word catches the
 * owner who did not mean it: a password is muscle memory and a keychain will fill
 * it in, while typing DELETE cannot happen by accident.
 */
export interface DeleteAccountRequest {
  /** The account password — verified at the AUTHORITY for a Jubilee ID row. */
  password: string;
  /**
   * MUST be the literal ASCII string `DELETE`.
   *
   * The server compares against a hard-coded constant
   * (`CONFIRM_WORD` in app/api/account/delete/route.js) after
   * `.trim().toUpperCase()`. Translating the word the listener types would send
   * something the server cannot accept and produce a 400 they have no way to
   * resolve — so localize the LABEL around the field, never the word itself.
   */
  confirm: string;
}

/**
 * The reply.
 *
 * `kept_jubilee_id` is not trivia. Deletion removes this site's membership and
 * cascades the favourites, follows and every session — but it deliberately does
 * NOT close the Jubilee ID, which is the listener's identity across the whole
 * family. The screen has to say so, because "delete my account" plainly reads as
 * "delete all of it" to the person pressing it.
 */
export interface DeleteAccountResponseDTO {
  success: boolean;
  kept_jubilee_id?: boolean;
  /** Present on failure; already a finished, user-facing sentence. */
  error?: string;
}

/** GET /api/auth/me — verb-agnostic session check (works unauthenticated). */
export interface MeResponseDTO {
  authenticated: boolean;
  user?: UserDTO;
  roles?: string[];
}
