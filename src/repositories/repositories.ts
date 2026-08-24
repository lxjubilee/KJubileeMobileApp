import { CONFIG } from '@/constants';
import { Album, Artist, ResolvedHomeFeed, ResolvedRail, SearchResults, Track } from '@/types';
import { pickByIds } from '@/utils';
import { MusicDataSource } from './DataSource';
import { MockDataSource } from './MockDataSource';
import { ApiDataSource } from './ApiDataSource';
import { ManifestDataSource } from './ManifestDataSource';

/**
 * Single factory deciding which data source backs every repository.
 * THIS is the swap point: set CONFIG.DATA_SOURCE (app.json `extra.dataSource`):
 *  - 'mock'     → bundled JSON (offline dev),
 *  - 'manifest' → live CDN catalog manifest (cdn.jubileeverse.com),
 *  - 'api'      → future REST backend.
 */
function createDataSource(): MusicDataSource {
  switch (CONFIG.DATA_SOURCE) {
    case 'manifest':
      return new ManifestDataSource();
    case 'api':
      return new ApiDataSource();
    case 'mock':
    default:
      return new MockDataSource();
  }
}

const dataSource: MusicDataSource = createDataSource();

/**
 * HomeRepository turns the raw home config (rails of ids) into a fully-resolved
 * feed of entities the Home screen can render directly — business logic that
 * belongs above the data source, not in the UI.
 */
export const HomeRepository = {
  async getFeed(): Promise<ResolvedHomeFeed> {
    const [config, albums, artists] = await Promise.all([
      dataSource.getHomeConfig(),
      dataSource.listAlbums(),
      dataSource.listArtists(),
    ]);

    const rails: ResolvedRail[] = config.rails.map((rail) => {
      if (rail.itemType === 'artist') {
        return {
          id: rail.id,
          title: rail.title,
          itemType: rail.itemType,
          seeAllArtistId: rail.seeAllArtistId,
          categoryLabel: rail.categoryLabel,
          artists: pickByIds(artists, rail.itemIds),
        };
      }
      return {
        id: rail.id,
        title: rail.title,
        itemType: rail.itemType,
        seeAllArtistId: rail.seeAllArtistId,
        categoryLabel: rail.categoryLabel,
        showGenre: rail.showGenre,
        genreByItem: rail.genreByItem,
        albums: pickByIds(albums, rail.itemIds),
      };
    });

    const heroIds = config.heroAlbumIds?.length ? config.heroAlbumIds : [config.heroAlbumId];
    const heroes = pickByIds(albums, heroIds);

    // Resolve per-page heroes (v2) so the Home screen can swap the carousel to
    // whichever page/chip is active.
    let heroesByCategory: Record<string, Album[]> | undefined;
    if (config.heroesByCategory) {
      heroesByCategory = {};
      for (const [label, ids] of Object.entries(config.heroesByCategory)) {
        heroesByCategory[label] = pickByIds(albums, ids);
      }
    }

    return {
      heroes,
      heroesByCategory,
      categoryLabels: config.categoryLabels,
      categoryKeys: config.categoryKeys,
      rails,
    };
  },
};

export const AlbumRepository = {
  list: (): Promise<Album[]> => dataSource.listAlbums(),
  getById: (id: string): Promise<Album | null> => dataSource.getAlbum(id),
};

export const ArtistRepository = {
  getById: (id: string): Promise<Artist | null> => dataSource.getArtist(id),
  getAlbums: (artistId: string): Promise<Album[]> => dataSource.getArtistAlbums(artistId),
  getTopTracks: (artistId: string): Promise<Track[]> => dataSource.getArtistTopTracks(artistId),
};

export const SearchRepository = {
  search: (query: string): Promise<SearchResults> => dataSource.search(query),
};
