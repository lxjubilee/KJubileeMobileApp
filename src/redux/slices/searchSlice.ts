import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SearchRepository } from '@/repositories';
import { CONFIG } from '@/constants';
import { RequestStatus, SearchResults } from '@/types';

interface SearchState {
  query: string;
  results: SearchResults;
  recent: string[];
  status: RequestStatus;
  error: string | null;
}

const emptyResults: SearchResults = { albums: [], artists: [], tracks: [] };

const initialState: SearchState = {
  query: '',
  results: emptyResults,
  recent: [],
  status: 'idle',
  error: null,
};

export const runSearch = createAsyncThunk('search/run', (query: string) =>
  SearchRepository.search(query),
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
      if (!action.payload.trim()) {
        state.results = emptyResults;
        state.status = 'idle';
      }
    },
    addRecentSearch(state, action: PayloadAction<string>) {
      const term = action.payload.trim();
      if (!term) return;
      state.recent = [term, ...state.recent.filter((t) => t !== term)].slice(
        0,
        CONFIG.RECENT_SEARCHES_LIMIT,
      );
    },
    clearRecentSearches(state) {
      state.recent = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSearch.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(runSearch.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.results = action.payload;
      })
      .addCase(runSearch.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Search failed';
      });
  },
});

export const { setQuery, addRecentSearch, clearRecentSearches } = searchSlice.actions;
export default searchSlice.reducer;
