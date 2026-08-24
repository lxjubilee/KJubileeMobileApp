import { TrackPlayer, Event } from './rntp';

/**
 * Remote-control handler registered with TrackPlayer in the app entry point.
 * Maps lock-screen / notification / headset events to engine actions. This runs
 * in its own JS context, so it must not depend on React or Redux.
 */
export default async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
    const pos = (await TrackPlayer.getProgress()).position;
    await TrackPlayer.seekTo(pos + (interval ?? 15));
  });
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
    const pos = (await TrackPlayer.getProgress()).position;
    await TrackPlayer.seekTo(Math.max(0, pos - (interval ?? 15)));
  });
};
