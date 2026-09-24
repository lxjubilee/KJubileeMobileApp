import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Why the app is asking a guest to sign in. Carried into the Jubilee Door as a
 * route param so the door can say what it was opened FOR — a sign-in screen that
 * simply appears after a heart tap reads as a bug rather than as an answer.
 */
export type AuthGateReason = 'likes' | 'reviews' | 'account';

/**
 * The root container ref. Module-level rather than per-component because some
 * callers sit OUTSIDE NavigationContainer and so have no `useNavigation` to
 * reach for: the frequency deep-link handler, and `openSignIn()` below.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Open the Jubilee Door from anywhere.
 *
 * No-ops until the container is ready. That window is the cold start only, and
 * nothing can tap a heart before the tree it lives in has mounted.
 */
export function openSignIn(reason?: AuthGateReason): void {
  if (navigationRef.isReady()) navigationRef.navigate('JubileeDoor', { reason });
}
