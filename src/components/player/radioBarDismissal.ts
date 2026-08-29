import { subscribe as subscribeRadio, getState as getRadioState } from '@/services/radio';

/**
 * Whether the listener has closed the radio footer bar.
 *
 * WHY THIS IS NOT ENGINE STATE. Being dismissed is a fact about the bar, not
 * about the broadcast, and the engine has no business knowing a view was
 * closed. But two separate mounts draw that bar — `MainTabNavigator`'s tab bar
 * and `FloatingMiniPlayer` on the full-screen detail pages — so the flag cannot
 * live inside either of them. A small module read through
 * `useSyncExternalStore` is the smallest thing both can see, and it matches how
 * `useRadio` already reads the engine.
 *
 * The bug it fixes: closing used to call `pause()` alone. That stopped the
 * audio but left `radio.slug` set, and the bar renders from the slug — so the X
 * silenced the station and the bar stayed exactly where it was, which reads as
 * a dead button.
 *
 * IT RESETS ON THE NEXT TUNE, and that matters more than it looks. Without it,
 * closing the bar once would hide it for the rest of the session: the listener
 * would tap a station on Home, hear it start, and have no transport anywhere on
 * screen. So the rule is narrow — dismissal survives until playback next
 * begins, and not one moment past it.
 */

let dismissed = false;
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const l of listeners) l();
};

// Any transition INTO playing clears the dismissal: tuning a station is an
// unambiguous request to hear it, and the bar is how that is controlled.
let wasPlaying = getRadioState().playing;
subscribeRadio(() => {
  const { playing } = getRadioState();
  if (playing && !wasPlaying && dismissed) {
    dismissed = false;
    notify();
  }
  wasPlaying = playing;
});

export const radioBarDismissal = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Identity-stable so `useSyncExternalStore` does not loop. */
  get(): boolean {
    return dismissed;
  },
  dismiss(): void {
    if (dismissed) return;
    dismissed = true;
    notify();
  },
};
