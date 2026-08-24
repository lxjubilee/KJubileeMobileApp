import { Album, Artist, HomeRail, Track } from '@/types';
import { AlbumDTO, ArtistDTO, HomeRailDTO, TrackDTO } from './dto';

/**
 * DTO -> domain-model mappers. This is the only place that knows the API's
 * field naming. Note: CDN-relative paths are preserved as-is; utils/cdn.cdnUrl
 * resolves them to full URLs at render time.
 */
export const mapTrack = (d: TrackDTO): Track => ({
  id: d.id,
  title: d.title,
  url: d.audio_path,
  artwork: d.artwork_path,
  duration: d.duration_seconds,
  artistId: d.artist_id,
  artistName: d.artist_name,
  albumId: d.album_id,
  albumName: d.album_name,
  trackNumber: d.track_number,
  explicit: d.explicit,
});

export const mapArtist = (d: ArtistDTO): Artist => ({
  id: d.id,
  name: d.name,
  image: d.image_path,
  bio: d.bio,
  monthlyListeners: d.monthly_listeners,
  genres: d.genres,
});

export const mapAlbum = (d: AlbumDTO): Album => ({
  id: d.id,
  title: d.title,
  cover: d.cover_path,
  artistId: d.artist_id,
  artistName: d.artist_name,
  year: d.release_year,
  genre: d.genre,
  trackCount: d.track_count,
  accentColor: d.color_hex,
  tracks: d.tracks?.map(mapTrack),
});

export const mapHomeRail = (d: HomeRailDTO): HomeRail => ({
  id: d.id,
  title: d.title,
  itemType: d.item_type,
  itemIds: d.item_ids,
});
