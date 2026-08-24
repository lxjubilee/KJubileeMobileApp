import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Track } from '@/types';

export type DownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed';

export interface DownloadRecord {
  track: Track;
  status: DownloadStatus;
  progress: number; // 0..1
  /** Local file uri once completed (wired when real downloads land). */
  localUri?: string;
}

interface DownloadsState {
  items: Record<string, DownloadRecord>;
}

const initialState: DownloadsState = { items: {} };

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {
    enqueueDownload(state, action: PayloadAction<Track>) {
      const t = action.payload;
      if (state.items[t.id]) return;
      state.items[t.id] = { track: t, status: 'queued', progress: 0 };
    },
    updateDownloadProgress(
      state,
      action: PayloadAction<{ id: string; progress: number; status?: DownloadStatus }>,
    ) {
      const rec = state.items[action.payload.id];
      if (!rec) return;
      rec.progress = action.payload.progress;
      if (action.payload.status) rec.status = action.payload.status;
    },
    completeDownload(state, action: PayloadAction<{ id: string; localUri?: string }>) {
      const rec = state.items[action.payload.id];
      if (!rec) return;
      rec.status = 'completed';
      rec.progress = 1;
      rec.localUri = action.payload.localUri;
    },
    removeDownload(state, action: PayloadAction<string>) {
      delete state.items[action.payload];
    },
  },
});

export const { enqueueDownload, updateDownloadProgress, completeDownload, removeDownload } =
  downloadsSlice.actions;
export default downloadsSlice.reducer;
