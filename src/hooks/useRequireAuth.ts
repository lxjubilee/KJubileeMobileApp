import { useCallback } from 'react';
import { useAppSelector } from '@/redux';
import { openSignIn, type AuthGateReason } from '@/navigation/navigationRef';

/**
 * Wraps an action that genuinely needs an account.
 *
 * Signed in, the action runs. Signed out, the Jubilee Door opens instead,
 * carrying the reason so it can say what it was opened for.
 *
 * This is the whole shape of optional sign-in: the gate lives on the ACTION
 * (liking, rating, account settings), never on the screen that hosts it. A
 * guest still browses the album, still plays it, still reads its reviews — the
 * heart is simply the point where an account starts to mean something. Putting
 * the gate on the screen instead is what App Store guideline 5.1.1(v) refuses.
 *
 * Deliberately does NOT replay the action after a successful sign-in. The door
 * is a sheet over the screen the listener was already on, so it returns them to
 * a heart they can now tap — one tap, in view, with the result visible. A silent
 * replay would instead have the app act for them on a screen they cannot see.
 */
export function useRequireAuth(): (action: () => void, reason?: AuthGateReason) => void {
  const isAuthenticated = useAppSelector((s) => s.auth.user != null);

  return useCallback(
    (action: () => void, reason?: AuthGateReason) => {
      if (isAuthenticated) {
        action();
        return;
      }
      openSignIn(reason);
    },
    [isAuthenticated],
  );
}
