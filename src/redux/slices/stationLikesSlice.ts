import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RadioStation } from '@/services/radio';
import { sendStationThumb } from '@/services/stationEngagement';
import type { AppDispatch } from '../store/store';
import type { RootState } from '../store/rootReducer';

/**
 * Liked stations — the thumb.
 *
 * Remembered on THIS DEVICE, deliberately. The server side is
 * `/api/radio/feedback`, an append-only log with nothing to read back, so there
 * is no account copy to sync with; the website keeps the same set in
 * `localStorage['kjubilee.thumbs']` for the same reason. It follows that a like
 * works for guests and survives signing out — it was never the account's.
 */
interface StationLikesState {
  slugs: Record<string, true>;
}

const initialState: StationLikesState = { slugs: {} };

const stationLikesSlice = createSlice({
  name: 'stationLikes',
  initialState,
  reducers: {
    setStationLiked(state, action: PayloadAction<{ slug: string; on: boolean }>) {
      const { slug, on } = action.payload;
      if (on) state.slugs[slug] = true;
      else delete state.slugs[slug];
    },
  },
});

export const { setStationLiked } = stationLikesSlice.actions;
export default stationLikesSlice.reducer;

/** Thumb tap: flip locally, then tell the server (`thumb_up` / `thumb_clear`). */
export const toggleStationLike =
  (station: RadioStation) =>
  (dispatch: AppDispatch, getState: () => RootState): void => {
    const on = !getState().stationLikes.slugs[station.slug];
    dispatch(setStationLiked({ slug: station.slug, on }));
    sendStationThumb(station, on ? 'thumb_up' : 'thumb_clear');
  };
