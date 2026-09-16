import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RequestStatus } from '@/types';
import type { RadioStation } from '@/services/radio';
import { favoritesApi } from '@/services/stationEngagement';
import type { AppDispatch } from '../store/store';
import type { RootState } from '../store/rootReducer';
import { clearSession, deleteAccount, signOut } from './authSlice';

/**
 * Favourite stations — the heart. Server-backed (`/api/radio/favorites`) and
 * tied to the ACCOUNT, so a guest never has any: the toggle is gated behind
 * sign-in by the caller (`useRequireAuth`), as on the website's Home page.
 *
 * `slugs` is newest-first, the order the server lists them, so the Favourites
 * screen needs no sort. A list rather than a set because the network is ~105
 * stations — an `includes` is nothing, and the order is the point.
 *
 * Persisted so hearts paint instantly on a cold start; `fetchStationFavorites`
 * revalidates once the session is restored.
 */
interface StationFavoritesState {
  slugs: string[];
  status: RequestStatus;
}

const initialState: StationFavoritesState = { slugs: [], status: 'idle' };

/**
 * Toggles still on their way to the server, by slug → the state they asked for.
 *
 * A fetch that was sent before a tap can land after it, carrying the list as it
 * was — and would quietly undo the heart the listener just filled. Laying these
 * over the fetched list keeps the tap. Module-level because it describes
 * requests, not state worth persisting or rendering.
 */
const inFlight = new Map<string, boolean>();

/** Per-slug request chain, so a quick on-off-on reaches the server in order. */
const chains = new Map<string, Promise<void>>();

export const fetchStationFavorites = createAsyncThunk('stationFavorites/fetch', async () => {
  const slugs = await favoritesApi.listSlugs();
  if (!inFlight.size) return slugs;
  const next = slugs.filter((s) => inFlight.get(s) !== false);
  for (const [slug, on] of inFlight) if (on && !next.includes(slug)) next.unshift(slug);
  return next;
});

const reset = (s: StationFavoritesState) => {
  s.slugs = [];
  s.status = 'idle';
};

const stationFavoritesSlice = createSlice({
  name: 'stationFavorites',
  initialState,
  reducers: {
    /** Optimistic flip; also the revert when the server refuses. */
    setStationFavoriteLocal(state, action: PayloadAction<{ slug: string; on: boolean }>) {
      const { slug, on } = action.payload;
      const has = state.slugs.includes(slug);
      if (on && !has) state.slugs.unshift(slug);
      if (!on && has) state.slugs = state.slugs.filter((s) => s !== slug);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStationFavorites.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchStationFavorites.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.slugs = a.payload;
      })
      // Keep what is on screen. A failed refresh is no evidence the account has
      // no favourites, and emptying the hearts would say that it does not.
      .addCase(fetchStationFavorites.rejected, (s) => {
        s.status = 'failed';
      })
      // One account's favourites must never be shown to the next, or to a guest.
      .addCase(clearSession, reset)
      .addCase(signOut.fulfilled, reset)
      .addCase(deleteAccount.fulfilled, reset);
  },
});

export const { setStationFavoriteLocal } = stationFavoritesSlice.actions;
export default stationFavoritesSlice.reducer;

/**
 * Heart tap. Paints first and corrects only if the server disagrees — the
 * website's own rule: "a control that waits for a round trip before moving
 * reads as broken".
 *
 * Callers gate this behind sign-in; it does not check again.
 */
export const toggleStationFavorite =
  (station: RadioStation) =>
  (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const { slug } = station;
    const was = getState().stationFavorites.slugs.includes(slug);
    const on = !was;
    dispatch(setStationFavoriteLocal({ slug, on }));
    inFlight.set(slug, on);

    const run = async () => {
      try {
        if (on) await favoritesApi.add(station);
        else await favoritesApi.remove(slug);
      } catch {
        const state = getState();
        // Revert only if nothing has moved on since this tap: not a later tap on
        // the same heart, and not a sign-out, which has already emptied the list
        // and must not have a favourite written back into it.
        const stillOurs = state.stationFavorites.slugs.includes(slug) === on;
        if (stillOurs && state.auth.user != null) {
          dispatch(setStationFavoriteLocal({ slug, on: was }));
        }
      } finally {
        if (inFlight.get(slug) === on) inFlight.delete(slug);
      }
    };

    const next = (chains.get(slug) ?? Promise.resolve()).then(run);
    chains.set(slug, next);
    return next.finally(() => {
      if (chains.get(slug) === next) chains.delete(slug);
    });
  };
