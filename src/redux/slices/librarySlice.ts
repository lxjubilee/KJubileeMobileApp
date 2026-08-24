import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Followed artists (local-only for now — there is no backend follow endpoint).
 * Song/album likes moved to the server-backed `likes` slice; the "Favorites"
 * shortcut and Library album grid read from there.
 */
interface LibraryState {
  followedArtistIds: string[];
}

const initialState: LibraryState = {
  followedArtistIds: [],
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    toggleFollowArtist(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.followedArtistIds = state.followedArtistIds.includes(id)
        ? state.followedArtistIds.filter((a) => a !== id)
        : [id, ...state.followedArtistIds];
    },
  },
});

export const { toggleFollowArtist } = librarySlice.actions;
export default librarySlice.reducer;
