import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Track } from '@/types';
import { clearSession, signOut, deleteAccount } from './authSlice';

export type RepeatMode = 'off' | 'track' | 'queue';

/**
 * UI-facing mirror of the track-player engine. The engine (react-native-track-
 * player) remains the source of truth for actual playback; this slice holds a
 * React-friendly snapshot kept in sync by the usePlayer hook, plus user prefs
 * (shuffle/repeat) that persist across sessions.
 */
interface PlayerState {
  currentTrack: Track | null;
  /** Live play/display order (may be shuffled). */
  queue: Track[];
  /** Unshuffled order, kept so shuffle can be turned back off. */
  originalQueue: Track[];
  isPlaying: boolean;
  /** True while the engine is buffering/loading the current track. */
  isBuffering: boolean;
  /** Persisted user preferences. */
  repeatMode: RepeatMode;
  shuffle: boolean;
}

/** Clear the now-playing snapshot (used by the ✕ Close action and sign-out). */
const clearPlayback = (state: PlayerState) => {
  state.currentTrack = null;
  state.queue = [];
  state.originalQueue = [];
  state.isPlaying = false;
  state.isBuffering = false;
};

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  originalQueue: [],
  isPlaying: false,
  isBuffering: false,
  repeatMode: 'off',
  shuffle: false,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setQueue(state, action: PayloadAction<Track[]>) {
      state.queue = action.payload;
      state.originalQueue = action.payload;
    },
    /**
     * Close the mini player: stop and clear the now-playing snapshot. The engine
     * is reset separately by usePlayer.stop(); clearing currentTrack hides the bar.
     */
    stopPlayback(state) {
      clearPlayback(state);
    },
    /** Update the live play/display order only (keeps originalQueue intact). */
    setPlayOrder(state, action: PayloadAction<Track[]>) {
      state.queue = action.payload;
    },
    setCurrentTrack(state, action: PayloadAction<Track | null>) {
      state.currentTrack = action.payload;
    },
    setIsPlaying(state, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload;
    },
    setIsBuffering(state, action: PayloadAction<boolean>) {
      state.isBuffering = action.payload;
    },
    setRepeatMode(state, action: PayloadAction<RepeatMode>) {
      state.repeatMode = action.payload;
    },
    cycleRepeatMode(state) {
      const order: RepeatMode[] = ['off', 'queue', 'track'];
      const idx = order.indexOf(state.repeatMode);
      state.repeatMode = order[(idx + 1) % order.length];
    },
    toggleShuffle(state) {
      state.shuffle = !state.shuffle;
    },
  },
  extraReducers: (builder) => {
    // On any sign-out path (sign out, account deletion, forced logout) drop the
    // now-playing snapshot so the mini player disappears with the session. The
    // engine itself is stopped by the playback-teardown listener in the store.
    // Persisted prefs (repeatMode, shuffle) are intentionally left intact.
    builder
      .addCase(signOut.fulfilled, clearPlayback)
      .addCase(deleteAccount.fulfilled, clearPlayback)
      .addCase(clearSession, clearPlayback);
  },
});

export const {
  setQueue,
  setPlayOrder,
  setCurrentTrack,
  setIsPlaying,
  setIsBuffering,
  setRepeatMode,
  cycleRepeatMode,
  toggleShuffle,
  stopPlayback,
} = playerSlice.actions;
export default playerSlice.reducer;
