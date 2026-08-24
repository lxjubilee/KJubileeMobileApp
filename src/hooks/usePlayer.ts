import { useCallback } from 'react';
import {
  useAppDispatch,
  useAppSelector,
  setQueue,
  setPlayOrder,
  setCurrentTrack,
  setIsPlaying,
  setIsBuffering,
  cycleRepeatMode,
  toggleShuffle,
  stopPlayback,
} from '@/redux';
import type { RepeatMode } from '@/redux';
import {
  playbackQueue,
  isExpoGo,
  TrackPlayer,
  RepeatMode as TPRepeatMode,
} from '@/services/music';
import { Track } from '@/types';
import { shuffle as shuffleArray } from '@/utils';

const toTPRepeat = (mode: RepeatMode) =>
  mode === 'track'
    ? TPRepeatMode.Track
    : mode === 'queue'
      ? TPRepeatMode.Queue
      : TPRepeatMode.Off;

/**
 * The single hook components use to read playback state and drive the player.
 * Reads come from Redux (synced by usePlayerSync); commands go to the engine
 * and update prefs. Keeps screens free of any track-player specifics.
 */
export function usePlayer() {
  const dispatch = useAppDispatch();
  const currentTrack = useAppSelector((s) => s.player.currentTrack);
  const isPlaying = useAppSelector((s) => s.player.isPlaying);
  const isBuffering = useAppSelector((s) => s.player.isBuffering);
  const repeatMode = useAppSelector((s) => s.player.repeatMode);
  const shuffle = useAppSelector((s) => s.player.shuffle);
  const queue = useAppSelector((s) => s.player.queue);
  const originalQueue = useAppSelector((s) => s.player.originalQueue);

  const playTracks = useCallback(
    async (tracks: Track[], startIndex = 0) => {
      const active = tracks[startIndex] ?? null;
      // setQueue records the original (unshuffled) order; build the actual play
      // order when shuffle is on — the chosen track first, the rest randomized.
      dispatch(setQueue(tracks));
      let order = tracks;
      let startIdx = startIndex;
      if (shuffle && tracks.length > 1 && active) {
        const before = tracks.slice(0, startIndex);
        const tail = shuffleArray(tracks.slice(startIndex + 1));
        order = [...before, active, ...tail];
        startIdx = before.length;
        dispatch(setPlayOrder(order));
      }
      dispatch(setCurrentTrack(active));
      // Optimistic: show the playing state immediately, before the engine buffers.
      dispatch(setIsPlaying(true));
      await playbackQueue.playTracks(order, startIdx);
      // reset() inside playTracks clears the engine repeat mode — re-apply it so
      // repeat keeps working across track/album changes.
      if (!isExpoGo) await TrackPlayer.setRepeatMode(toTPRepeat(repeatMode)).catch(() => undefined);
    },
    [dispatch, shuffle, repeatMode],
  );

  const playFrom = useCallback(
    async (tracks: Track[], trackId: string) => {
      const idx = Math.max(
        0,
        tracks.findIndex((t) => t.id === trackId),
      );
      await playTracks(tracks, idx);
    },
    [playTracks],
  );

  // Optimistic: flip the icon immediately and command the engine directly from
  // that intent — no getPlaybackState round-trip, so play/pause feels instant.
  const toggle = useCallback(() => {
    const willPlay = !isPlaying;
    dispatch(setIsPlaying(willPlay));
    if (!willPlay) dispatch(setIsBuffering(false)); // pausing → no spinner
    if (isExpoGo) return undefined;
    return (willPlay ? TrackPlayer.play() : TrackPlayer.pause()).catch(() => undefined);
  }, [dispatch, isPlaying]);

  // Optimistic: move to the neighbouring track in the queue right away.
  const stepTo = useCallback(
    (delta: number) => {
      if (currentTrack && queue.length) {
        const idx = queue.findIndex((t) => t.id === currentTrack.id);
        const target = queue[idx + delta];
        if (idx >= 0 && target) dispatch(setCurrentTrack(target));
      }
    },
    [currentTrack, queue, dispatch],
  );

  const next = useCallback(() => {
    stepTo(1);
    return isExpoGo ? undefined : TrackPlayer.skipToNext().catch(() => undefined);
  }, [stepTo]);

  const previous = useCallback(() => {
    stepTo(-1);
    return isExpoGo ? undefined : TrackPlayer.skipToPrevious().catch(() => undefined);
  }, [stepTo]);
  const seekTo = useCallback(
    (pos: number) => (isExpoGo ? undefined : TrackPlayer.seekTo(pos)),
    [],
  );

  // Close the mini player: stop playback entirely — reset the engine (releases
  // the media notification) and clear the now-playing snapshot so the bar hides.
  const stop = useCallback(() => {
    dispatch(stopPlayback());
    void playbackQueue.reset();
  }, [dispatch]);

  const cycleRepeat = useCallback(async () => {
    const order: RepeatMode[] = ['off', 'queue', 'track'];
    const nextMode = order[(order.indexOf(repeatMode) + 1) % order.length];
    dispatch(cycleRepeatMode());
    if (!isExpoGo) await TrackPlayer.setRepeatMode(toTPRepeat(nextMode)).catch(() => undefined);
  }, [dispatch, repeatMode]);

  const onToggleShuffle = useCallback(() => {
    const enabled = !shuffle;
    dispatch(toggleShuffle());
    if (!currentTrack || originalQueue.length <= 1) return;
    // Reorder only the UPCOMING tracks (after the current one) so playback isn't
    // interrupted: shuffle randomizes them, un-shuffle restores original order.
    const curIdx = Math.max(
      0,
      originalQueue.findIndex((t) => t.id === currentTrack.id),
    );
    const played = originalQueue.slice(0, curIdx + 1);
    const tail = originalQueue.slice(curIdx + 1);
    const upcoming = enabled ? shuffleArray(tail) : tail;
    dispatch(setPlayOrder([...played, ...upcoming]));
    void playbackQueue.replaceUpcoming(upcoming);
  }, [dispatch, shuffle, currentTrack, originalQueue]);

  return {
    currentTrack,
    isPlaying,
    isBuffering,
    repeatMode,
    shuffle,
    queue,
    playTracks,
    playFrom,
    toggle,
    next,
    previous,
    seekTo,
    cycleRepeat,
    toggleShuffle: onToggleShuffle,
    stop,
  };
}
