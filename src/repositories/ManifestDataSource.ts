import { Album, Artist, SearchResults, Track } from '@/types';
import { CatalogIndex, getCatalogIndex, applyMobileConfig } from '@/services/catalog';
import { getMobileConfig } from '@/services/mobileConfig';
import { HomeConfig, MusicDataSource } from './DataSource';

/**
 * Live data source backed by the CDN catalog manifest
 * (`cdn.jubileeverse.com/music/catalog-manifest.json`). Reads from the shared,
 * module-level catalog index (built once, refreshed in the background), so it
 * satisfies the same contract as Mock/Api with no work above the data source.
 *
 * Selected when `CONFIG.DATA_SOURCE === 'manifest'`.
 */
export class ManifestDataSource implements MusicDataSource {
  private index(): Promise<CatalogIndex> {
    return getCatalogIndex();
  }

  async getHomeConfig(): Promise<HomeConfig> {
    // Overlay the admin-managed mobile config on the catalog; falls back to the
    // manifest-derived feed when the config is unavailable (getMobileConfig
    // never rejects — it resolves null on any error).
    const [index, config] = await Promise.all([this.index(), getMobileConfig()]);
    return applyMobileConfig(index, config);
  }

  async listAlbums(): Promise<Album[]> {
    return (await this.index()).albums;
  }

  async getAlbum(id: string): Promise<Album | null> {
    return (await this.index()).albumsById.get(id) ?? null;
  }

  async listArtists(): Promise<Artist[]> {
    return (await this.index()).artists;
  }

  async getArtist(id: string): Promise<Artist | null> {
    return (await this.index()).artistsById.get(id) ?? null;
  }

  async getArtistAlbums(artistId: string): Promise<Album[]> {
    return (await this.index()).albumsByArtist.get(artistId) ?? [];
  }

  async getArtistTopTracks(artistId: string): Promise<Track[]> {
    return ((await this.index()).tracksByArtist.get(artistId) ?? []).slice(0, 5);
  }

  async search(query: string): Promise<SearchResults> {
    const q = query.trim().toLowerCase();
    if (!q) return { albums: [], artists: [], tracks: [] };
    const idx = await this.index();
    const tracks: Track[] = [];
    for (const album of idx.albumsById.values()) {
      for (const t of album.tracks ?? []) {
        if (t.title.toLowerCase().includes(q)) tracks.push(t);
        if (tracks.length >= 50) break;
      }
      if (tracks.length >= 50) break;
    }
    return {
      albums: idx.albums.filter((a) => a.title.toLowerCase().includes(q)).slice(0, 50),
      artists: idx.artists.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 50),
      tracks,
    };
  }
}
