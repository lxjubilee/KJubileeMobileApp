export { store, persistor } from './store/store';
export type { RootState, AppDispatch } from './store/store';
export { useAppDispatch, useAppSelector } from './store/hooks';

// Slice actions/thunks
export { fetchHomeFeed } from './slices/homeSlice';
export { runSearch, setQuery, addRecentSearch, clearRecentSearches } from './slices/searchSlice';
export { toggleFollowArtist } from './slices/librarySlice';
export {
  fetchPlaylists,
  fetchMembership,
  fetchPlaylistDetail,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  addAlbumToPlaylist,
  removeItemFromPlaylist,
  reorderPlaylistItems,
} from './slices/playlistsSlice';
export {
  fetchLikes,
  toggleSongLike,
  toggleAlbumLike,
  resetLikes,
  setLikedLocal,
} from './slices/likesSlice';
export {
  enqueueDownload,
  updateDownloadProgress,
  completeDownload,
  removeDownload,
} from './slices/downloadsSlice';
export { markArtworkMissing } from './slices/artworkSlice';
export { fetchEntitlement, setLimitReached } from './slices/entitlementSlice';
export { setLanguage, setAppLanguage } from './slices/settingsSlice';
export {
  setQueue,
  setPlayOrder,
  setCurrentTrack,
  setIsPlaying,
  setIsBuffering,
  setRepeatMode,
  cycleRepeatMode,
  toggleShuffle,
  stopPlayback,
} from './slices/playerSlice';
export type { RepeatMode } from './slices/playerSlice';
export {
  restoreSession,
  signIn,
  verify2FA,
  signOut,
  requestSignup,
  verifySignup,
  resendSignup,
  forgotPassword,
  changePassword,
  deleteAccount,
  clearSession,
  clearAuthError,
} from './slices/authSlice';
export type { AuthUser, AuthStatus } from './slices/authSlice';
