export { authService, initAuthClient } from './authService';
export type { SignInResult, SignInArgs, SignupChallenge } from './authService';
export { classifySignin, readAuthError } from './authOutcome';
export type { SigninOutcome, LinkedProfile, AuthErrorMeta } from './authOutcome';
export { tokenStore } from './tokenStore';
export type { AuthUser } from './authMappers';
export * from './authDto';
