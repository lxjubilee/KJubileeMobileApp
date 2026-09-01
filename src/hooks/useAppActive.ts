import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Whether the app is in the foreground.
 *
 * Exists for the native-driver `Animated.loop`s. React Native's
 * `FrameBasedAnimationDriver` records the frame time an animation started at
 * and derives the current frame from `now - start`; if a later Choreographer
 * frame time comes in BEHIND that recorded start, the index goes negative and
 * it throws — the crash reads
 *
 *   IllegalStateException: Calculated frame index should never be lower than 0
 *
 * and it takes the whole app down, not just the animation. A loop left running
 * across a screen-off is exactly how the two clocks get out of step, and these
 * loops are indefinite: an ON AIR badge pulses for as long as its card is
 * mounted, which is the entire time the phone is asleep in someone's pocket.
 *
 * Gating the loops on this stops them on the way out and starts them fresh on
 * the way back, so the driver never carries a start time across the gap.
 */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => AppState.currentState === 'active');

  useEffect(() => {
    const onChange = (next: AppStateStatus) => setActive(next === 'active');
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return active;
}
