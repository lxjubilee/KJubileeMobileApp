/**
 * The Jubilee ID door, as the server actually implements it.
 *
 * Source of truth: `KJubilee.com` on branch `developer` — `server.js`
 * (`/api/sso/*`) and `tests/jubilee-id-door.test.js`. Not the older
 * `API docs/API.md`, which describes a different API that no longer exists:
 * every path it lists (`/api/auth/lookup`, `/signin`, `/signup`,
 * `/verify-signup`) is 404 on the live server.
 *
 * Three outcomes fall out of one lookup:
 *
 *   A  existsLocally            → ask for the password, sign in
 *   B  existsInSso only         → confirm the Jubilee ID password, then create
 *                                 the local account (pre-filled from the ID)
 *   C  neither                  → create the Jubilee ID and the account together
 */

/** Every failure shares this shape. */
export interface SsoErrorDTO {
  success: false;
  error: string;
}

/** Screen 1. `ssoConfigured: false` means this box has no authority credentials. */
export interface SsoLookupDTO {
  success: true;
  existsLocally: boolean;
  existsInSso: boolean;
  ssoConfigured?: boolean;
}

/** The canonical signed-in body — `respondSignedIn` in server.js. */
export interface SsoSessionDTO {
  success: true;
  /** HS256 JWT. Thirty days by default, and there is no refresh endpoint. */
  token: string;
  expiresAt: string;
  user: SsoUserDTO;
}

export interface SsoUserDTO {
  id?: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string | null;
  jubilee_id?: string | null;
  [k: string]: unknown;
}

/**
 * Outcome B from `/api/sso/login`: the Jubilee ID is real and the password was
 * right, but there is no local account yet.
 *
 * Note the status — this arrives as **200 with `success: false`**. Branching on
 * the HTTP status alone would read it as a successful sign-in and leave the app
 * with no token. Decide from `success` and `redirect`, never from the status.
 */
export interface SsoSignupExistingDTO {
  success: false;
  redirect: 'signup-existing';
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
}

/** 404 from `/api/sso/login`: no such account anywhere — go and create one. */
export interface SsoNoAccountDTO {
  success: false;
  redirect: 'signup';
  email: string;
  error: string;
}

export type SsoLoginDTO = SsoSessionDTO | SsoSignupExistingDTO | SsoNoAccountDTO;

// ---- requests ------------------------------------------------------------

export interface SsoLookupRequest {
  email: string;
  /** Required — the route 403s without it. */
  turnstileToken: string;
}

export interface SsoLoginRequest {
  email: string;
  password: string;
  /** Server default is true when the field is absent. */
  rememberMe?: boolean;
}

/** Outcome B's second screen. Names/DOB are optional; the ID's own values win. */
export interface SsoVerifyRequest {
  email: string;
  password: string;
  date_of_birth: string;
  first_name?: string;
  last_name?: string;
  rememberMe?: boolean;
}

/** Outcome C. All fields required; password ≥ 8, and the DOB gate is 13+. */
export interface SsoRegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  rememberMe?: boolean;
}

// ---- guards --------------------------------------------------------------

export const isSession = (d: SsoLoginDTO): d is SsoSessionDTO =>
  d.success === true && typeof (d as SsoSessionDTO).token === 'string';

export const isSignupExisting = (d: SsoLoginDTO): d is SsoSignupExistingDTO =>
  d.success === false && (d as SsoSignupExistingDTO).redirect === 'signup-existing';
