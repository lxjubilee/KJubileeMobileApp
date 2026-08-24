import { endpoints } from '@/services/api';
import { mapAlbum, mapArtist, mapHomeRail, mapTrack } from '@/services/api/mappers';
import { Album, Artist, SearchResults, Track } from '@/types';
import { HomeConfig, MusicDataSource } from './DataSource';

/**
 * Live data source that talks to the jubileeverse API and maps DTOs -> domain
 * models. Activated by flipping CONFIG.USE_MOCK to false. Not exercised until a
 * real backend exists, but kept in sync with the same contract so the swap is
 * a one-line change.
 */
export class ApiDataSource implements MusicDataSource {
  async getHomeConfig(): Promise<HomeConfig> {
    const dto = await endpoints.getHomeConfig();
    return { heroAlbumId: dto.hero_album_id, rails: dto.rails.map(mapHomeRail) };
  }

  async listAlbums(): Promise<Album[]> {
    return (await endpoints.listAlbums()).map(mapAlbum);
  }

  async getAlbum(id: string): Promise<Album | null> {
    return mapAlbum(await endpoints.getAlbum(id));
  }

  async listArtists(): Promise<Artist[]> {
    return (await endpoints.listArtists()).map(mapArtist);
  }

  async getArtist(id: string): Promise<Artist | null> {
    return mapArtist(await endpoints.getArtist(id));
  }

  async getArtistAlbums(artistId: string): Promise<Album[]> {
    return (await endpoints.getArtistAlbums(artistId)).map(mapAlbum);
  }

  async getArtistTopTracks(artistId: string): Promise<Track[]> {
    return (await endpoints.getArtistTopTracks(artistId)).map(mapTrack);
  }

  async search(query: string): Promise<SearchResults> {
    const res = await endpoints.search(query);
    return {
      albums: res.albums.map(mapAlbum),
      artists: res.artists.map(mapArtist),
      tracks: res.tracks.map(mapTrack),
    };
  }
}
