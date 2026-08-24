import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RequestStatus } from '@/types';
import { entitlementApi } from '@/services/entitlement';
import { clearSession, signOut } from './authSlice';

/**
 * The signed-in user's plan entitlement (`/api/subscriptions/me`) plus the
 * transient "daily limit reached" flag that drives the popup. Fetched on auth —
 * NOT persisted, so it always revalidates against the server.
 *
 * The per-track cap decision is made server-side via `/api/listening/intent`
 * (see usePlaybackGate); this slice only holds plan awareness for the app and
 * the popup trigger. `dailySongLimit` is null for unlimited (paid) plans.
 */
interface EntitlementState {
  isPaid: boolean;
  dailySongLimit: number | null;
  previewSeconds: number;
  planName?: string;
  status: RequestStatus;
  /** True while the "Daily Limit Reached" popup should be shown. */
  limitReached: boolean;
}

const initialState: EntitlementState = {
  isPaid: false,
  dailySongLimit: null,
  previewSeconds: 60,
  status: 'idle',
  limitReached: false,
};

/** Load the caller's plan entitlement (call on auth / startup). */
export const fetchEntitlement = createAsyncThunk('entitlement/fetch', () =>
  entitlementApi.getMe(),
);

const entitlementSlice = createSlice({
  name: 'entitlement',
  initialState,
  reducers: {
    /** Show/hide the daily-limit popup (set by the playback gate hook). */
    setLimitReached(state, action: PayloadAction<boolean>) {
      state.limitReached = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntitlement.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchEntitlement.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.isPaid = a.payload.isPaid;
        s.dailySongLimit = a.payload.dailySongLimit;
        s.previewSeconds = a.payload.previewSeconds;
        s.planName = a.payload.planName;
      })
      .addCase(fetchEntitlement.rejected, (s) => {
        // Fail-safe: an unknown plan is treated as not paid, so the server-side
        // gate (/api/listening/intent) still enforces limits for the session.
        s.status = 'failed';
        s.isPaid = false;
      })
      // Never carry one account's plan into another / the signed-out UI.
      .addCase(clearSession, () => initialState)
      .addCase(signOut.fulfilled, () => initialState);
  },
});

export const { setLimitReached } = entitlementSlice.actions;
export default entitlementSlice.reducer;
