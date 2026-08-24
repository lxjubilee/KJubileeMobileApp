import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Runtime artwork-availability tracking. The catalog manifest carries no
 * "has artwork" flag, so the app discovers missing covers the only way it can —
 * by observing a cover image fail to load (404) — and remembers them here so the
 * matching album/artist/track can be filtered out of every list (see
 * `useVisibleCatalog`). Persisted, so a known-missing cover doesn't flash back in
 * on the next launch; self-correcting, because a cover that later loads is never
 * marked, so items reappear automatically once their artwork is published.
 */
interface ArtworkState {
  /** CDN-relative cover paths known to 404. A map for O(1) lookup + JSON-serializable. */
  missing: Record<string, true>;
}

const initialState: ArtworkState = { missing: {} };

const artworkSlice = createSlice({
  name: 'artwork',
  initialState,
  reducers: {
    markArtworkMissing(state, action: PayloadAction<string>) {
      const uri = action.payload;
      // Guard so idempotent reports don't churn state (and re-render consumers).
      if (uri && !state.missing[uri]) state.missing[uri] = true;
    },
  },
});

export const { markArtworkMissing } = artworkSlice.actions;
export default artworkSlice.reducer;
