import { isExpoGo } from './env';

/**
 * Lazy access to react-native-track-player.
 *
 * Importing the library evaluates native constants (CAPABILITY_PLAY, etc.) that
 * are `null` inside Expo Go, which throws at module-eval time. We therefore
 * `require` it ONLY outside Expo Go. Every other module imports track-player
 * through this shim so nothing pulls the native lib in during an Expo Go preview.
 *
 * In Expo Go every export below is null/undefined; all call sites are guarded by
 * `isExpoGo`, so they are never reached there.
 */
type RNTPModule = typeof import('react-native-track-player');

const mod: RNTPModule | null = isExpoGo
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('react-native-track-player') as RNTPModule);

export const TrackPlayer = (mod ? mod.default : null) as RNTPModule['default'];
export const Capability = (mod ? mod.Capability : undefined) as RNTPModule['Capability'];
export const State = (mod ? mod.State : undefined) as RNTPModule['State'];
export const Event = (mod ? mod.Event : undefined) as RNTPModule['Event'];
export const RepeatMode = (mod ? mod.RepeatMode : undefined) as RNTPModule['RepeatMode'];
export const AppKilledPlaybackBehavior = (mod
  ? mod.AppKilledPlaybackBehavior
  : undefined) as RNTPModule['AppKilledPlaybackBehavior'];
export const IOSCategory = (mod ? mod.IOSCategory : undefined) as RNTPModule['IOSCategory'];
export const IOSCategoryMode = (mod
  ? mod.IOSCategoryMode
  : undefined) as RNTPModule['IOSCategoryMode'];
export const useProgress = (mod ? mod.useProgress : undefined) as RNTPModule['useProgress'];
export const useTrackPlayerEvents = (mod
  ? mod.useTrackPlayerEvents
  : undefined) as RNTPModule['useTrackPlayerEvents'];

export type { Track } from 'react-native-track-player';
