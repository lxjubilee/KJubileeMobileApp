import { authClient } from './authClient';
import type {
  SsoLookupRequest,
  SsoLookupDTO,
  SsoLoginRequest,
  SsoLoginDTO,
  SsoSessionDTO,
  SsoVerifyRequest,
  SsoRegisterRequest,
} from './ssoDto';

/**
 * The Jubilee ID door endpoints.
 *
 * Every URL the door uses is declared here and nowhere else. Shapes and status
 * codes come from `KJubilee.com@developer` — `server.js` and the door's own
 * test suite; see ssoDto.ts for the outcomes.
 *
 * Rate limit is 30 requests per 15 minutes per IP, shared across all four. On
 * mobile, carrier CGNAT puts many users behind one address — so lookup is called
 * on SUBMIT only, never while the listener types.
 *
 * `validateStatus` is widened on the two routes that carry meaning in a non-2xx
 * or a `success:false` 200: `/api/sso/login` answers Outcome B as **200 with
 * success:false**, and "no account here" as a 404 that the door treats as a
 * route to the create screen rather than an error.
 */
export const ssoEndpoints = {
  /** Screen 1 — which of the three outcomes this email is. Turnstile required. */
  lookup: (body: SsoLookupRequest) =>
    authClient.post<SsoLookupDTO>('/api/sso/signup/lookup', body).then((r) => r.data),

  /**
   * Outcome A's password step, and the password check for Outcome B.
   * Returns a session, or a redirect telling the door which screen comes next.
   */
  login: (body: SsoLoginRequest) =>
    authClient
      .post<SsoLoginDTO>('/api/sso/login', body, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
      })
      .then((r) => r.data),

  /** Outcome B, second screen: confirm the Jubilee ID, create the local account. */
  verify: (body: SsoVerifyRequest) =>
    authClient.post<SsoSessionDTO>('/api/sso/signup/verify', body).then((r) => r.data),

  /** Outcome C: create the Jubilee ID and the local account together. */
  register: (body: SsoRegisterRequest) =>
    authClient.post<SsoSessionDTO>('/api/sso/signup/register', body).then((r) => r.data),

  /** The signed-in listener, from the Bearer token. */
  me: () => authClient.get('/api/auth/me').then((r) => r.data),
};
