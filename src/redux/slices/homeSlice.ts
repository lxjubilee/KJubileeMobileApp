import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { HomeRepository } from '@/repositories';
import { RequestStatus, ResolvedHomeFeed } from '@/types';

interface HomeState {
  feed: ResolvedHomeFeed | null;
  status: RequestStatus;
  error: string | null;
}

const initialState: HomeState = {
  feed: null,
  status: 'idle',
  error: null,
};

/** Thunks call repositories — never axios/data sources directly. */
export const fetchHomeFeed = createAsyncThunk('home/fetchFeed', () => HomeRepository.getFeed());

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeFeed.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchHomeFeed.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.feed = action.payload;
      })
      .addCase(fetchHomeFeed.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load home feed';
      });
  },
});

export default homeSlice.reducer;
