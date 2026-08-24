import { useProgress, isExpoGo } from '@/services/music';

const EMPTY = { position: 0, duration: 0, buffered: 0 };

/**
 * useProgress that is safe to call in Expo Go (where the native module is
 * absent). `isExpoGo` is constant for the app's lifetime, so this conditional
 * hook call never changes between renders.
 */
export function useSafeProgress(intervalMs?: number) {
  if (isExpoGo) return EMPTY;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useProgress(intervalMs);
}
