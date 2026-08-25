import { useSyncExternalStore } from 'react';
import { subscribe, getState } from '@/services/radio';
import type { RadioState } from '@/services/radio';

/**
 * The radio engine's state, as React sees it.
 *
 * The engine is a plain module rather than a redux slice because it is driven by
 * the clock and by track-player events, not by user actions — there is nothing
 * to dispatch. `useSyncExternalStore` is the supported way to read that kind of
 * source without tearing during a concurrent render.
 */
export function useRadio(): RadioState {
  return useSyncExternalStore(subscribe, getState, getState);
}
