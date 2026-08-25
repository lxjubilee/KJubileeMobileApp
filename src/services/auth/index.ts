export { authService, initAuthClient } from './authService';
export type { SignInResult, SignInArgs, SignupChallenge } from './authService';
export { classifySignin, readAuthError } from './authOutcome';
export type { SigninOutcome, LinkedProfile, AuthErrorMeta } from './authOutcome';
export { tokenStore } from './tokenStore';
export type { AuthUser } from './authMappers';
export * from './authDto';
export { ssoService, SsoError, toAuthUser } from './ssoService';
export type { DoorOutcome, SsoSignInResult } from './ssoService';
export { ssoEndpoints } from './ssoEndpoints';
export type {
  SsoLookupRequest,
  SsoLoginRequest,
  SsoVerifyRequest,
  SsoRegisterRequest,
  SsoUserDTO,
} from './ssoDto';
