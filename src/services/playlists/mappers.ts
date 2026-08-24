import { Track } from '@/types';
import type { PlaylistDetailDto, PlaylistDto, PlaylistItemDto } from './dto';
import type { PlaylistDetail, PlaylistItem, PlaylistSummary } from './models';

const WEB_ORIGIN = 'https://kjubilee.com';

/** A server `cover` may be a web path (e.g. /cover/CODE.png); make it absolute. */
function absCover(cover?: string | null): string {
  if (!cover) return '';
  if (/^https?:\/\//i.test(cover)) return cover;
  return `${WEB_ORIGIN}${cover.startsWith('/') ? '' : '/'}${cover}`;
}

export function mapSummary(d: PlaylistDto): PlaylistSummary {
  return {
    id: d.id,
    name: d.name,
    description: d.description ?? null,
    isPublic: !!d.is_public,
    isDefault: !!d.is_default,
    itemCount: d.item_count ?? 0,
    // Server sends a web path (e.g. /cover/CODE.png); make it absolute so it
    // resolves directly instead of being mistaken for a CDN-relative path.
    cover: absCover(d.cover) || null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

/** Build a playable Track from server item fields when the song isn't in the local catalog. */
function fallbackTrack(d: PlaylistItemDto): Track {
  return {
    id: d.song_id,
    title: d.song_title,
    url: d.url ?? '',
    artwork: absCover(d.cover),
    duration: 0,
    artistId: '',
    artistName: d.artist_name ?? '',
    albumId: '',
    albumName: d.album_title ?? '',
    trackNumber: undefined,
  };
}

/** Resolve a server item to a local Track (full fidelity) or a fallback. */
export function mapItem(d: PlaylistItemDto, resolve: Map<string, Track>): PlaylistItem {
  return {
    id: d.id,
    songId: d.song_id,
    position: d.position,
    track: resolve.get(d.song_id) ?? fallbackTrack(d),
  };
}

export function mapDetail(d: PlaylistDetailDto, resolve: Map<string, Track>): PlaylistDetail {
  return {
    ...mapSummary(d),
    items: (d.items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((it) => mapItem(it, resolve)),
  };
}
