import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Album, RequestStatus, Track } from '@/types';
import { likesApi, songLikeKey, type LikeType } from '@/services/likes';
import { albumUuid, trackSongUuid } from '@/services/playlists';
import type { AppDispatch } from '../store/store';
import type { RootState } from '../store/rootReducer';
import { clearSession, signOut } from './authSlice';

/**
 * Server-backed likes (`/api/me/likes`). `keys` is a set-like map of the
 * backend's membership strings (`"song:<uuid>"` / `"album:<uuid>"`) for O(1)
 * "is this liked?" checks. Persisted (keys only) so hearts paint instantly on
 * cold start; `fetchLikes()` revalidates. It's a like/unlike toggle — no dislike.
 */
interface LikesState {
  keys: Record<string, true>;
  status: RequestStatus;
}

const initialState: LikesState = { keys: {}, status: 'idle' };

/** Load the user's like membership set (call on auth / startup). */
export const fetchLikes = createAsyncThunk('likes/fetch', () => likesApi.listIds());

const likesSlice = createSlice({
  name: 'likes',
  initialState,
  reducers: {
    /** Optimistically flip a single like (also used to revert on API failure). */
    setLikedLocal(state, action: PayloadAction<{ key: string; liked: boolean }>) {
      const { key, liked } = action.payload;
      if (liked) state.keys[key] = true;
      else delete state.keys[key];
    },
    resetLikes(state) {
      state.keys = {};
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLikes.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchLikes.fulfilled, (s, a) => {
        s.status = 'succeeded';
        const next: Record<string, true> = {};
        for (const k of a.payload) next[k] = true;
        s.keys = next;
      })
      .addCase(fetchLikes.rejected, (s) => {
        s.status = 'failed';
      })
      // Never carry one account's likes into another / the signed-out UI.
      .addCase(clearSession, (s) => {
        s.keys = {};
        s.status = 'idle';
      })
      .addCase(signOut.fulfilled, (s) => {
        s.keys = {};
        s.status = 'idle';
      });
  },
});

export const { setLikedLocal, resetLikes } = likesSlice.actions;
export default likesSlice.reducer;

// --- Optimistic toggle thunks ------------------------------------------------
// Flip local state immediately, hit the API, revert on failure (mirrors web).

const toggleLike =
  (type: LikeType, uuid: string, key: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const was = !!getState().likes.keys[key];
    dispatch(setLikedLocal({ key, liked: !was }));
    try {
      if (was) await likesApi.unlike(type, uuid);
      else await likesApi.like(type, uuid);
    } catch {
      dispatch(setLikedLocal({ key, liked: was })); // revert
    }
  };

/** Like / unlike a song. No-ops for tracks without a track number. */
export const toggleSongLike = (track: Track) => (dispatch: AppDispatch) => {
  const key = songLikeKey(track);
  const uuid = trackSongUuid(track);
  if (!key || !uuid) return;
  return dispatch(toggleLike('song', uuid, key));
};

/** Like / unlike an album. */
export const toggleAlbumLike = (album: Album) => (dispatch: AppDispatch) => {
  const uuid = albumUuid(album.id);
  return dispatch(toggleLike('album', uuid, `album:${uuid}`));
};
