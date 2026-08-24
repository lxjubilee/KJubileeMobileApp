import albumsJson from '@/assets/mock/albums.json';
import artistsJson from '@/assets/mock/artists.json';
import tracksJson from '@/assets/mock/tracks.json';
import homeJson from '@/assets/mock/home.json';
import { CONFIG } from '@/constants';
import { Album, Artist, HomeRail, SearchResults, Track } from '@/types';
import { delay } from '@/utils';
import { HomeConfig, MusicDataSource } from './DataSource';

const albums = albumsJson as Album[];
const artists = artistsJson as Artist[];
const tracks = tracksJson as Track[];
const home = homeJson as { heroAlbumId: string; rails: HomeRail[] };

/**
 * Local data source backed by the bundled mock JSON. Composes related entities
 * (e.g. attaches tracks to albums) so it satisfies the same contract the real
 * API will. Adds simulated latency so loading states are exercised in dev.
 */
export class MockDataSource implements MusicDataSource {
  private tracksForAlbum(albumId: string): Track[] {
    return tracks
      .filter((t) => t.albumId === albumId)
      .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
  }

  async getHomeConfig(): Promise<HomeConfig> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    return { heroAlbumId: home.heroAlbumId, rails: home.rails };
  }

  async listAlbums(): Promise<Album[]> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    return albums;
  }

  async getAlbum(id: string): Promise<Album | null> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    const album = albums.find((a) => a.id === id);
    if (!album) return null;
    return { ...album, tracks: this.tracksForAlbum(id) };
  }

  async listArtists(): Promise<Artist[]> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    return artists;
  }

  async getArtist(id: string): Promise<Artist | null> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    return artists.find((a) => a.id === id) ?? null;
  }

  async getArtistAlbums(artistId: string): Promise<Album[]> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    return albums.filter((a) => a.artistId === artistId);
  }

  async getArtistTopTracks(artistId: string): Promise<Track[]> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    return tracks.filter((t) => t.artistId === artistId).slice(0, 5);
  }

  async search(query: string): Promise<SearchResults> {
    await delay(CONFIG.MOCK_LATENCY_MS);
    const q = query.trim().toLowerCase();
    if (!q) return { albums: [], artists: [], tracks: [] };
    return {
      albums: albums.filter((a) => a.title.toLowerCase().includes(q)),
      artists: artists.filter((a) => a.name.toLowerCase().includes(q)),
      tracks: tracks.filter((t) => t.title.toLowerCase().includes(q)),
    };
  }
}
