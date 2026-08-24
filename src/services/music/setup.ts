import { logger } from '@/utils';
import { isExpoGo } from './env';
import {
  TrackPlayer,
  AppKilledPlaybackBehavior,
  Capability,
  IOSCategory,
  IOSCategoryMode,
} from './rntp';

let isSetup = false;

/**
 * Initialize the playback engine exactly once. Configures lock-screen /
 * notification capabilities so transport controls work while backgrounded.
 * Safe to call repeatedly (subsequent calls are no-ops).
 */
export async function setupPlayer(): Promise<boolean> {
  if (isExpoGo) {
    logger.warn('Skipping TrackPlayer setup — running in Expo Go (no native audio).');
    return false;
  }
  if (isSetup) return true;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
      // Buffering tuned for a snappy start and smooth seeking without bloating
      // memory on low-end devices (all values in seconds; cache in KB):
      //  - playBuffer: start/resume after only ~2s is buffered → fast play/pause
      //  - minBuffer/maxBuffer: keep a small steady-state buffer ahead
      //  - backBuffer: retain 30s behind the head → backward seeks don't re-fetch
      //  - maxCacheSize: 32MB disk cache → re-seeks & replays avoid re-downloading
      minBuffer: 15,
      maxBuffer: 30,
      playBuffer: 2,
      backBuffer: 30,
      maxCacheSize: 32 * 1024,
    });
  } catch (e) {
    // setupPlayer throws if the player is already initialized — treat as ready.
    logger.debug('TrackPlayer.setupPlayer skipped (already initialized)', e);
  }

  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    progressUpdateEventInterval: 1,
  });

  isSetup = true;
  return true;
}
