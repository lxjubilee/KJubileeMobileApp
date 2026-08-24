import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Track, RequestStatus } from '@/types';
import {
  playlistApi,
  mapSummary,
  mapDetail,
  getSongUuidMap,
  trackSongUuid,
  type PlaylistSummary,
  type PlaylistDetail,
} from '@/services/playlists';

/**
 * Server-backed playlists (`/api/me/playlists`). `summaries` is the list,
 * `byId` caches fetched details, and `membership` maps a song uuid -> how many
 * of the user's playlists contain it (drives the "already added" indicator).
 */
interface PlaylistsState {
  summaries: PlaylistSummary[];
  byId: Record<string, PlaylistDetail>;
  membership: Record<string, number>;
  status: RequestStatus;
  error: string | null;
}

const initialState: PlaylistsState = {
  summaries: [],
  byId: {},
  membership: {},
  status: 'idle',
  error: null,
};

const errMsg = (e: unknown): string =>
  (e as { message?: string })?.message ?? 'Something went wrong';

export const fetchPlaylists = createAsyncThunk('playlists/fetch', async () => {
  const dtos = await playlistApi.list();
  return dtos.map(mapSummary);
});

export const fetchMembership = createAsyncThunk('playlists/membership', async () => {
  const { counts } = await playlistApi.songIds();
  return counts;
});

export const fetchPlaylistDetail = createAsyncThunk('playlists/detail', async (id: string) => {
  const [dto, resolve] = await Promise.all([playlistApi.get(id), getSongUuidMap()]);
  return mapDetail(dto, resolve);
});

export const createPlaylist = createAsyncThunk(
  'playlists/create',
  async (body: { name: string; description?: string }) => mapSummary(await playlistApi.create(body)),
);

export const renamePlaylist = createAsyncThunk(
  'playlists/rename',
  async (arg: { id: string; name?: string; description?: string | null }) =>
    mapSummary(await playlistApi.update(arg.id, { name: arg.name, description: arg.description })),
);

export const deletePlaylist = createAsyncThunk('playlists/delete', async (id: string) => {
  await playlistApi.remove(id);
  return id;
});

export const addTrackToPlaylist = createAsyncThunk(
  'playlists/addTrack',
  async (arg: { playlistId: string; track: Track }) => {
    const songId = trackSongUuid(arg.track);
    if (!songId) throw new Error('Track has no track number');
    const res = await playlistApi.addItem(arg.playlistId, songId);
    return {
      playlistId: arg.playlistId,
      songId,
      duplicate: !!res.duplicate,
      itemId: res.id,
      position: res.position,
      track: arg.track,
    };
  },
);

export const addAlbumToPlaylist = createAsyncThunk(
  'playlists/addAlbum',
  async (arg: { playlistId: string; tracks: Track[] }) => {
    const songIds = arg.tracks.map(trackSongUuid).filter((x): x is string => !!x);
    const res = await playlistApi.bulkAdd(arg.playlistId, songIds);
    return { playlistId: arg.playlistId, songIds, added: res.added };
  },
);

export const removeItemFromPlaylist = createAsyncThunk(
  'playlists/removeItem',
  async (arg: { playlistId: string; itemId: string; songId: string }) => {
    await playlistApi.removeItem(arg.playlistId, arg.itemId);
    return arg;
  },
);

export const reorderPlaylistItems = createAsyncThunk(
  'playlists/reorder',
  async (arg: { playlistId: string; orderedSongIds: string[] }) => {
    await playlistApi.reorder(arg.playlistId, arg.orderedSongIds);
    return arg;
  },
);

const bumpCount = (summary: PlaylistSummary | undefined, delta: number) => {
  if (summary) summary.itemCount = Math.max(0, summary.itemCount + delta);
};

const playlistsSlice = createSlice({
  name: 'playlists',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlaylists.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchPlaylists.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.summaries = a.payload;
      })
      .addCase(fetchPlaylists.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.error.message ?? 'Failed to load playlists';
      })

      .addCase(fetchMembership.fulfilled, (s, a) => {
        s.membership = a.payload;
      })

      .addCase(fetchPlaylistDetail.fulfilled, (s, a) => {
        s.byId[a.payload.id] = a.payload;
        const sum = s.summaries.find((p) => p.id === a.payload.id);
        if (sum) {
          sum.itemCount = a.payload.itemCount || a.payload.items.length;
          if (a.payload.cover) sum.cover = a.payload.cover;
        }
      })

      .addCase(createPlaylist.fulfilled, (s, a) => {
        s.summaries.unshift(a.payload);
      })

      .addCase(renamePlaylist.fulfilled, (s, a) => {
        const i = s.summaries.findIndex((p) => p.id === a.payload.id);
        if (i >= 0) s.summaries[i] = { ...s.summaries[i], ...a.payload };
        const d = s.byId[a.payload.id];
        if (d) {
          d.name = a.payload.name;
          d.description = a.payload.description;
        }
      })

      .addCase(deletePlaylist.fulfilled, (s, a) => {
        s.summaries = s.summaries.filter((p) => p.id !== a.payload);
        delete s.byId[a.payload];
      })

      .addCase(addTrackToPlaylist.fulfilled, (s, a) => {
        if (a.payload.duplicate) return;
        s.membership[a.payload.songId] = (s.membership[a.payload.songId] ?? 0) + 1;
        bumpCount(
          s.summaries.find((p) => p.id === a.payload.playlistId),
          1,
        );
        // Keep the loaded detail in sync so the Add-Songs screen reflects the add.
        const d = s.byId[a.payload.playlistId];
        if (d && a.payload.itemId && !d.items.some((it) => it.songId === a.payload.songId)) {
          d.items.push({
            id: a.payload.itemId,
            songId: a.payload.songId,
            position: a.payload.position ?? d.items.length,
            track: a.payload.track,
          });
        }
      })

      .addCase(addAlbumToPlaylist.fulfilled, (s, a) => {
        // We don't know which ids were newly added; flip the indicator on for all
        // submitted (a follow-up fetchMembership resyncs exact counts).
        for (const id of a.payload.songIds) {
          s.membership[id] = Math.max(s.membership[id] ?? 0, 1);
        }
        bumpCount(
          s.summaries.find((p) => p.id === a.payload.playlistId),
          a.payload.added,
        );
      })

      .addCase(removeItemFromPlaylist.fulfilled, (s, a) => {
        const d = s.byId[a.payload.playlistId];
        if (d) d.items = d.items.filter((it) => it.id !== a.payload.itemId);
        bumpCount(
          s.summaries.find((p) => p.id === a.payload.playlistId),
          -1,
        );
        const next = (s.membership[a.payload.songId] ?? 0) - 1;
        if (next > 0) s.membership[a.payload.songId] = next;
        else delete s.membership[a.payload.songId];
      })

      .addCase(reorderPlaylistItems.fulfilled, (s, a) => {
        const d = s.byId[a.payload.playlistId];
        if (!d) return;
        const bySong = new Map(d.items.map((it) => [it.songId, it]));
        d.items = a.payload.orderedSongIds
          .map((sid, idx) => {
            const it = bySong.get(sid);
            return it ? { ...it, position: idx } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
      });
  },
});

export default playlistsSlice.reducer;
