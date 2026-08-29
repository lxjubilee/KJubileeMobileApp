import { authClient } from './authClient';
import {
  AccountSettingsDTO,
  ChangePasswordRequest,
  ChangePasswordResponseDTO,
  DeleteAccountRequest,
  DeleteAccountResponseDTO,
  ForgotPasswordResponseDTO,
  LookupResponseDTO,
  MeResponseDTO,
  RefreshResponseDTO,
  ResendResponseDTO,
  SigninRequest,
  SigninResponseDTO,
  SignupRequest,
  SignupResponseDTO,
  AuthSuccessDTO,
  VerifyLoginRequest,
  VerifySignupRequest,
} from './authDto';

/**
 * Typed endpoint functions for the unified kjubilee-api (`API docs/API.md`).
 * The only place auth URLs are declared. Every call goes through `authClient`
 * (Bearer auth + transparent 401 refresh).
 */
export const authEndpoints = {
  // --- One door ---
  /**
   * Identity probe. Unauthenticated and cheap, but it shares the `/api/auth/*`
   * budget of 50 requests per 15 minutes per IP — and on mobile, carrier CGNAT
   * puts many users behind one address. Call this on SUBMIT only, never while
   * the user types.
   */
  lookup: (email: string) =>
    authClient
      .get<LookupResponseDTO>('/api/auth/lookup', { params: { email } })
      .then((r) => r.data),

  // --- Sign in / 2FA ---
  signin: (body: SigninRequest) =>
    authClient.post<SigninResponseDTO>('/api/auth/signin', body).then((r) => r.data),

  verifyLogin: (body: VerifyLoginRequest) =>
    authClient.post<AuthSuccessDTO>('/api/auth/verify-login', body).then((r) => r.data),

  sendLoginVerification: (email: string, verificationGuid: string) =>
    authClient
      .post<ResendResponseDTO>('/api/auth/send-login-verification', { email, verificationGuid })
      .then((r) => r.data),

  // --- Sign up ---
  signup: (body: SignupRequest) =>
    authClient.post<SignupResponseDTO>('/api/auth/signup', body).then((r) => r.data),

  verifySignup: (body: VerifySignupRequest) =>
    authClient.post<AuthSuccessDTO>('/api/auth/verify-signup', body).then((r) => r.data),

  sendSignupVerification: (verificationGuid: string) =>
    authClient
      .post<ResendResponseDTO>('/api/auth/send-signup-verification', { verificationGuid })
      .then((r) => r.data),

  // --- Session / tokens ---
  refresh: (refreshToken: string) =>
    authClient.post<RefreshResponseDTO>('/api/auth/refresh', { refreshToken }).then((r) => r.data),

  me: () => authClient.get<MeResponseDTO>('/api/auth/me').then((r) => r.data),

  logout: (refreshToken?: string) =>
    authClient.post('/api/auth/logout', { refreshToken }).then((r) => r.data),

  logoutAll: () => authClient.post('/api/auth/logout-all').then((r) => r.data),

  // --- Password / account ---
  /**
   * Request a reset link. Turnstile is REQUIRED — the route 403s without a
   * token. Unlike the sign-in gate, this one guards a cost as well as a secret:
   * every request sends a real email, at an address the requester chooses.
   */
  forgotPassword: (email: string, turnstileToken: string) =>
    authClient
      .post<ForgotPasswordResponseDTO>('/api/auth/forgot-password', { email, turnstileToken })
      .then((r) => r.data),

  /**
   * Note the path: `/api/account/password`, not `/api/auth/change-password`.
   * The latter has never existed on any server — it is what the app used to ask
   * for, and every request 404'd.
   */
  changePassword: (body: ChangePasswordRequest) =>
    authClient
      .post<ChangePasswordResponseDTO>('/api/account/password', body)
      .then((r) => r.data),

  /**
   * The settings view of the account, for the delete screen: where the password
   * lives, whether a Jubilee ID is linked, and what a deletion would take.
   */
  getAccount: () => authClient.get<AccountSettingsDTO>('/api/account').then((r) => r.data),

  /**
   * Note the path and the verb: `POST /api/account/delete`, not
   * `DELETE /api/auth/account`.
   *
   * The latter is the last survivor of the same mistake annotated on
   * `changePassword` above — both were written from `API docs/API.md`, which
   * describes an API that no longer exists. It answered an HTML 404 on every
   * request, so the button could never have worked.
   *
   * Both fields are required; see DeleteAccountRequest for why `confirm` must
   * not be localized.
   */
  deleteAccount: (body: DeleteAccountRequest) =>
    authClient
      .post<DeleteAccountResponseDTO>('/api/account/delete', body)
      .then((r) => r.data),
};
