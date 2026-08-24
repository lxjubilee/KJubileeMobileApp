import { apiClient } from './client';
import { AlbumDTO, ArtistDTO, HomeConfigDTO, ListResponse, TrackDTO } from './dto';

/**
 * Typed endpoint functions. These are the only place URLs are declared.
 * Consumed by ApiDataSource; not used while CONFIG.USE_MOCK is true.
 */
export const endpoints = {
  getHomeConfig: () => apiClient.get<HomeConfigDTO>('/home').then((r) => r.data),

  listAlbums: () => apiClient.get<ListResponse<AlbumDTO>>('/albums').then((r) => r.data.data),

  getAlbum: (id: string) => apiClient.get<AlbumDTO>(`/albums/${id}`).then((r) => r.data),

  listArtists: () => apiClient.get<ListResponse<ArtistDTO>>('/artists').then((r) => r.data.data),

  getArtist: (id: string) => apiClient.get<ArtistDTO>(`/artists/${id}`).then((r) => r.data),

  getArtistAlbums: (id: string) =>
    apiClient.get<ListResponse<AlbumDTO>>(`/artists/${id}/albums`).then((r) => r.data.data),

  getArtistTopTracks: (id: string) =>
    apiClient.get<ListResponse<TrackDTO>>(`/artists/${id}/tracks`).then((r) => r.data.data),

  search: (query: string) =>
    apiClient
      .get<{ albums: AlbumDTO[]; artists: ArtistDTO[]; tracks: TrackDTO[] }>('/search', {
        params: { q: query },
      })
      .then((r) => r.data),
};
