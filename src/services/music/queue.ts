import { Track } from '@/types';
import { logger } from '@/utils';
import { setupPlayer } from './setup';
import { toTPTracks } from './trackAdapter';
import { isExpoGo } from './env';
import { TrackPlayer, State } from './rntp';

/**
 * Higher-level queue helpers used by the UI. Each ensures the engine is set up
 * before issuing commands, so screens never worry about init ordering.
 */
export const playbackQueue = {
  /**
   * Replace the queue with `tracks` (already in the desired play order, shuffled
   * or not) and start playing at `startIndex`.
   */
  async playTracks(tracks: Track[], startIndex = 0): Promise<void> {
    if (!tracks.length || isExpoGo) return;
    await setupPlayer();
    const start = Math.min(Math.max(0, startIndex), tracks.length - 1);

    await TrackPlayer.reset();
    // Queue ONLY the selected track and start it immediately — the engine begins
    // buffering and the UI (mini player) paints without competing with a large
    // add() on the bridge.
    await TrackPlayer.add(toTPTracks([tracks[start]]));
    await TrackPlayer.play();

    // Fill the rest of the queue on the next tick, after the UI has painted, so
    // the heavy add() never blocks play/UI. Final order matches `tracks`.
    if (tracks.length > 1) {
      const before = tracks.slice(0, start);
      const after = tracks.slice(start + 1);
      setTimeout(() => {
        void (async () => {
          try {
            if (after.length) await TrackPlayer.add(toTPTracks(after));
            // Keep the "before" tracks ahead of the active one so Previous works.
            if (before.length) await TrackPlayer.add(toTPTracks(before), 0);
          } catch (e) {
            logger.warn('playbackQueue.playTracks: deferred queue fill failed', e);
          }
        })();
      }, 0);
    }
  },

  /**
   * Replace the UPCOMING tracks (everything after the current one) with `tracks`,
   * without interrupting the playing track or its position. Used to apply/undo
   * shuffle live; the caller passes the already-ordered remaining tracks.
   */
  async replaceUpcoming(tracks: Track[]): Promise<void> {
    if (isExpoGo) return;
    try {
      await TrackPlayer.removeUpcomingTracks();
      if (tracks.length) await TrackPlayer.add(toTPTracks(tracks));
    } catch (e) {
      logger.warn('playbackQueue.replaceUpcoming failed', e);
    }
  },

  /** Play a whole album/playlist starting from a specific track id. */
  async playFrom(tracks: Track[], trackId: string): Promise<void> {
    const idx = Math.max(
      0,
      tracks.findIndex((t) => t.id === trackId),
    );
    await this.playTracks(tracks, idx);
  },

  /** Append tracks to the end of the current queue. */
  async addToQueue(tracks: Track[]): Promise<void> {
    if (isExpoGo) return;
    await setupPlayer();
    await TrackPlayer.add(toTPTracks(tracks));
  },

  async toggle(): Promise<void> {
    if (isExpoGo) return;
    try {
      const state = (await TrackPlayer.getPlaybackState()).state;
      if (state === State.Playing) await TrackPlayer.pause();
      else await TrackPlayer.play();
    } catch (e) {
      logger.warn('playbackQueue.toggle failed', e);
    }
  },

  /**
   * Stop playback, clear the queue, and release the active track + media
   * notification. Used on sign-out / account deletion so nothing keeps playing
   * once the session ends.
   */
  async reset(): Promise<void> {
    if (isExpoGo) return;
    try {
      await TrackPlayer.reset();
    } catch (e) {
      logger.warn('playbackQueue.reset failed', e);
    }
  },
};
