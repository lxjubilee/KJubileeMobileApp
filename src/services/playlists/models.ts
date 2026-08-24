import { Track } from '@/types';

/** App-facing playlist shapes (camelCase), mapped from the server DTOs. */

export interface PlaylistSummary {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  /** The auto-provisioned "My Favorites" playlist (hidden from the list, like web). */
  isDefault: boolean;
  itemCount: number;
  /** CDN/web cover url, or null. */
  cover: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  /** Playlist-item id (needed to remove a single item). */
  id: string;
  /** Server song uuid. */
  songId: string;
  position: number;
  /** Resolved playable track (local catalog track, or a server-derived fallback). */
  track: Track;
}

export interface PlaylistDetail extends PlaylistSummary {
  items: PlaylistItem[];
}
