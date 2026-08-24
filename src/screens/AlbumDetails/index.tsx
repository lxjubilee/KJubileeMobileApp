import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen, Loader, AppText, Artwork, Button, IconButton, SectionHeader } from '@/components/common';
import { useTheme } from '@/context';
import { TrackRow, AlbumCard } from '@/components/cards';
import { FloatingMiniPlayer } from '@/components/player';
import { AlbumRatingSummary, ReviewComposer, SongRatingControl } from '@/components/reviews';
import {
  useAppDispatch,
  useAppSelector,
  useIsAlbumLiked,
  usePlayer,
  useReviews,
  useSongSummaries,
  useVisibleAlbums,
} from '@/hooks';
import { usePlaylistMenu } from '@/components/playlists';
import { shareAlbum } from '@/services/share';
import { albumUuid, trackSongUuid } from '@/services/playlists';
import { songLikeKey } from '@/services/likes';
import { toggleAlbumLike, toggleSongLike } from '@/redux';
import { AlbumRepository, ArtistRepository } from '@/repositories';
import { Album, MyReview, ReviewTargetType, Track } from '@/types';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
// Match the Home hero image's poster size exactly (see HeroBanner): full content
// width, with the height tracking the artwork's own aspect ratio under the same
// clamps so the cover fills its frame with no crop and no letterbox.
const H_PADDING = 16;
const POSTER_W = width - H_PADDING * 2;
const POSTER_H_DEFAULT = Math.round(POSTER_W * 1.36);
const MIN_ASPECT = 0.6; // portrait limit  (h ≈ 1.66×w)
const MAX_ASPECT = 1.9; // landscape limit (h ≈ 0.53×w)
// Height of the pinned black header row (below the status bar) that holds the
// back button and stays visible while the page scrolls.
const HEADER_HEIGHT = 38;
// Green used for the primary-genre pill (border + text), matching the web album
// header — not the app's purple `primary` accent.
const GENRE_GREEN = '#3FA45C';

/** "·" separator between items in the one-line album metadata row. */
const MetaDot: React.FC = () => (
  <AppText variant="bodySm" color="textMuted" style={styles.metaDot}>
    ·
  </AppText>
);

/** Horizontal album rail (recommendations below the track list). Renders nothing
 *  when there are no albums to show, so an empty section leaves no gap. */
const AlbumRail: React.FC<{
  title: string;
  albums: Album[];
  onPress: (album: Album) => void;
  onSeeAll?: () => void;
}> = ({ title, albums, onPress, onSeeAll }) => {
  if (!albums.length) return null;
  return (
    <View style={styles.railSection}>
      {/* "See all" appears once the rail holds more than 4 albums. */}
      <SectionHeader title={title} onSeeAll={albums.length > 4 ? onSeeAll : undefined} />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={albums}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.railContent}
        ItemSeparatorComponent={() => <View style={styles.railSep} />}
        renderItem={({ item }) => <AlbumCard album={item} onPress={onPress} />}
      />
    </View>
  );
};

export const AlbumDetailsScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'AlbumDetails'>['route']>();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { playTracks, playFrom, currentTrack, isPlaying, toggle } = usePlayer();
  const { addToPlaylist, addAlbumToPlaylist } = usePlaylistMenu();

  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  // Whole catalog + this artist's albums, used to build the recommendation rails
  // (Popular Albums / More from … / Similar Music) below the track list.
  const [catalog, setCatalog] = useState<Album[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  // Poster height, learned once the cover loads, so the frame tracks the
  // artwork's real aspect ratio — exactly like the Home hero image.
  const [posterH, setPosterH] = useState(POSTER_H_DEFAULT);

  const albumLiked = useIsAlbumLiked({ id: params.albumId });
  const likeKeys = useAppSelector((s) => s.likes.keys);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPosterH(POSTER_H_DEFAULT); // reset until the new cover reports its dimensions
    AlbumRepository.getById(params.albumId)
      .then((a) => active && setAlbum(a))
      .finally(() => active && setLoading(false));
    AlbumRepository.list().then((all) => active && setCatalog(all));
    return () => {
      active = false;
    };
  }, [params.albumId]);

  // This artist's other albums, once we know who the artist is.
  useEffect(() => {
    if (!album?.artistId) return;
    let active = true;
    ArtistRepository.getAlbums(album.artistId).then((a) => active && setArtistAlbums(a));
    return () => {
      active = false;
    };
  }, [album?.artistId]);

  const tracks = useMemo(() => album?.tracks ?? [], [album]);

  // Recommendation rails shown below the track list. All exclude the current
  // album; each is capped so the horizontal rails stay light.
  const RAIL_MAX = 12;
  const moreFromArtistRaw = useMemo(
    () => artistAlbums.filter((a) => a.id !== album?.id).slice(0, RAIL_MAX),
    [artistAlbums, album?.id],
  );
  const similarMusicRaw = useMemo(() => {
    if (!album) return [];
    const genres = new Set(
      (album.genres?.length ? album.genres : album.genre ? [album.genre] : []).map((g) =>
        g.toLowerCase(),
      ),
    );
    if (!genres.size) return [];
    return catalog
      .filter(
        (a) =>
          a.id !== album.id &&
          a.artistId !== album.artistId &&
          (a.genres?.length ? a.genres : a.genre ? [a.genre] : []).some((g) =>
            genres.has(g.toLowerCase()),
          ),
      )
      .slice(0, RAIL_MAX);
  }, [catalog, album]);
  // Hide artwork-less / out-of-language albums the same way the rest of the app does.
  const moreFromArtist = useVisibleAlbums(moreFromArtistRaw);
  const similarMusic = useVisibleAlbums(similarMusicRaw);

  const openAlbum = useCallback(
    (a: Album) => navigation.push('AlbumDetails', { albumId: a.id }),
    [navigation],
  );
  const openSeeAll = useCallback(
    (railTitle: string, list: Album[]) =>
      navigation.push('AlbumList', { title: railTitle, albumIds: list.map((a) => a.id) }),
    [navigation],
  );

  // "Added to a playlist" state for the album: true once every playable track is
  // in at least one playlist. `membership` (song uuid -> playlist count) is kept
  // live by the add/remove thunks, so this flips the icon the moment an add
  // succeeds — and stays flipped on return visits.
  const membership = useAppSelector((s) => s.playlists.membership);
  const albumInPlaylist = useMemo(() => {
    const ids = tracks.map((tr) => trackSongUuid(tr)).filter((x): x is string => !!x);
    return ids.length > 0 && ids.every((id) => (membership[id] ?? 0) > 0);
  }, [tracks, membership]);

  // Same footprint as the Home hero image: full content width, height driven by
  // the cover's aspect ratio (learned on load) so nothing is cropped.
  const artSize = { width: POSTER_W, height: posterH };

  // Ratings: the reviews API keys by the backend's deterministic uuids, while
  // the mobile catalog uses codes — so convert album code -> albumUuid and each
  // track -> its song uuid (same scheme playlists use). See songId.ts.
  const albumTargetId = useMemo(() => (album ? albumUuid(album.id) : undefined), [album]);
  const { summary: albumSummary, applySummary: applyAlbumSummary } = useReviews(
    'album',
    albumTargetId,
  );
  const songTargets = useMemo(
    () =>
      tracks
        .map((tr) => ({ localId: tr.id, targetId: trackSongUuid(tr) }))
        .filter((s): s is { localId: string; targetId: string } => s.targetId != null),
    [tracks],
  );
  const { summaries: songSummaries, applyOne: applySongSummary } = useSongSummaries(songTargets);
  const [composer, setComposer] = useState<{
    type: ReviewTargetType;
    targetId: string; // uuid sent to the API
    localId?: string; // local Track.id, for keying the per-song summary
    label: string;
    initial: MyReview | null;
  } | null>(null);

  const onPlay = useCallback(() => {
    // If this album is already the active queue, just pause/resume; otherwise
    // start it from the top.
    if (currentTrack && currentTrack.albumId === album?.id) {
      toggle();
    } else if (tracks.length) {
      playTracks(tracks, 0);
    }
  }, [currentTrack, album?.id, tracks, playTracks, toggle]);

  const onShuffle = useCallback(() => {
    if (!tracks.length) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTracks(shuffled, 0);
  }, [tracks, playTracks]);

  const onShare = useCallback(() => {
    if (album) {
      void shareAlbum({ code: album.id, title: album.title, artistName: album.artistName });
    }
  }, [album]);

  if (loading) {
    return (
      <Screen safeArea={false}>
        <Loader />
      </Screen>
    );
  }

  if (!album) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText color="textMuted">{t('errors.albumNotFound')}</AppText>
        </View>
      </Screen>
    );
  }

  // This album is the active queue AND currently playing → show Pause.
  const isThisAlbumPlaying =
    !!currentTrack && currentTrack.albumId === album.id && isPlaying;

  return (
    <Screen safeArea={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          // Start below the fixed header so the cover isn't hidden behind it.
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: 96 + insets.bottom },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.artFrame, artSize]}>
            <Artwork
              uri={album.cover}
              accentColor={album.accentColor}
              style={styles.artImage}
              contentFit="cover"
              iconSize={Math.round(POSTER_W * 0.3)}
              onLoad={(e) => {
                const w = e.source?.width;
                const h = e.source?.height;
                if (!w || !h) return;
                // Clamp the same way the hero does so a pathological aspect ratio
                // can't produce an unusably tall/short cover.
                const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, w / h));
                setPosterH(Math.round(POSTER_W / aspect));
              }}
            />
          </View>
          <AppText variant="display" style={styles.title} numberOfLines={2}>
            {album.title}
          </AppText>
          {/* Metadata over two lines (mirrors the web album header):
              line 1 — persona · N songs;  line 2 — GENRE pill · secondary genres. */}
          <View style={styles.metaRow}>
            <Pressable onPress={() => navigation.navigate('ArtistDetails', { artistId: album.artistId })}>
              <AppText variant="bodySm" color="text">
                {album.artistName}
              </AppText>
            </Pressable>
            <MetaDot />
            <AppText variant="bodySm" color="textMuted">
              {t('album.tracks', { count: tracks.length })}
            </AppText>
          </View>
          {album.genres?.length ? (
            <View style={styles.metaRow}>
              <View style={[styles.genrePill, { borderColor: GENRE_GREEN }]}>
                <AppText variant="caption" style={[styles.genrePillText, { color: GENRE_GREEN }]}>
                  {album.genres[0].toUpperCase()}
                </AppText>
              </View>
              {album.genres.slice(1).map((g) => (
                <React.Fragment key={g}>
                  <MetaDot />
                  <AppText variant="bodySm" color="text">
                    {g}
                  </AppText>
                </React.Fragment>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <View style={styles.actionsLeft}>
            <IconButton
              name={albumLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={albumLiked ? theme.colors.accent : undefined}
              onPress={() => dispatch(toggleAlbumLike(album))}
            />
            <IconButton name="share-outline" size={26} onPress={onShare} style={styles.share} />
            <Pressable
              onPress={() => addAlbumToPlaylist(tracks)}
              hitSlop={10}
              disabled={!tracks.length}
              style={[styles.share, { opacity: tracks.length ? 1 : 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel={albumInPlaylist ? t('playlist.inPlaylist') : t('playlist.addToPlaylist')}
            >
              <MaterialCommunityIcons
                name={albumInPlaylist ? 'playlist-check' : 'playlist-plus'}
                size={28}
                color={albumInPlaylist ? theme.colors.accent : '#FFFFFF'}
              />
            </Pressable>
          </View>
          <View style={styles.actionsRight}>
            <IconButton name="shuffle" size={26} onPress={onShuffle} style={styles.dl} />
            <Button
              label={isThisAlbumPlaying ? t('common.pause') : t('common.play')}
              icon={isThisAlbumPlaying ? 'pause' : 'play'}
              onPress={onPlay}
            />
          </View>
        </View>

        <AlbumRatingSummary
          summary={albumSummary}
          targetId={albumTargetId}
          onApplySummary={applyAlbumSummary}
          onRate={() =>
            albumTargetId &&
            setComposer({
              type: 'album',
              targetId: albumTargetId,
              label: album.title,
              initial: albumSummary?.mine ?? null,
            })
          }
          onSeeAll={() =>
            navigation.navigate('AlbumReviews', { albumId: album.id, albumTitle: album.title })
          }
        />

        <View style={styles.list}>
          {tracks.map((track: Track, i) => (
            <React.Fragment key={track.id}>
              {/* Hairline separator between rows (not before the first). */}
              {i > 0 ? (
                <View style={[styles.trackDivider, { backgroundColor: theme.colors.border }]} />
              ) : null}
              <TrackRow
                track={track}
                index={i + 1}
                isActive={currentTrack?.id === track.id}
                isFavorite={!!likeKeys[songLikeKey(track) ?? '']}
                onToggleFavorite={
                  songLikeKey(track) ? (tr) => dispatch(toggleSongLike(tr)) : undefined
                }
                onPress={() => playFrom(tracks, track.id)}
                onAddToPlaylist={addToPlaylist}
                isInPlaylist={(membership[trackSongUuid(track) ?? ''] ?? 0) > 0}
                showDuration
                ratingSlot={
                  trackSongUuid(track) ? (
                    <SongRatingControl
                      summary={songSummaries[track.id]}
                      targetId={trackSongUuid(track)!}
                      onApplySummary={(s) => applySongSummary(track.id, s)}
                      onRate={() =>
                        setComposer({
                          type: 'song',
                          targetId: trackSongUuid(track)!,
                          localId: track.id,
                          label: track.title,
                          initial: songSummaries[track.id]?.mine ?? null,
                        })
                      }
                    />
                  ) : null
                }
              />
            </React.Fragment>
          ))}
        </View>

        {/* Recommendation rails below the song list. */}
        <AlbumRail
          title={t('album.moreFrom', { name: album.artistName })}
          albums={moreFromArtist}
          onPress={openAlbum}
          onSeeAll={() =>
            openSeeAll(t('album.moreFrom', { name: album.artistName }), moreFromArtist)
          }
        />
        <AlbumRail
          title={t('album.similarMusic')}
          albums={similarMusic}
          onPress={openAlbum}
          onSeeAll={() => openSeeAll(t('album.similarMusic'), similarMusic)}
        />
      </ScrollView>

      {/* Solid-black safe-area band at the bottom so nothing scrolls behind the
          gesture/navigation bar (kept below the mini player, which paints its own
          backdrop while playing). The top is covered by the fixed header below. */}
      {insets.bottom > 0 ? (
        <View style={[styles.safeBand, styles.safeBandBottom, { height: insets.bottom }]} pointerEvents="none" />
      ) : null}

      {/* Persistent black header with the back button — rendered outside the
          ScrollView so it stays pinned while the page scrolls, keeping "back"
          reachable at any scroll depth without returning to the top. */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
      </View>

      <FloatingMiniPlayer />

      {composer ? (
        <ReviewComposer
          type={composer.type}
          id={composer.targetId}
          targetLabel={composer.label}
          initial={composer.initial}
          onClose={() => setComposer(null)}
          onSaved={(summary, mine) =>
            composer.type === 'album'
              ? applyAlbumSummary({ ...summary, mine })
              : applySongSummary(composer.localId!, { ...summary, mine })
          }
          onDeleted={(summary) =>
            composer.type === 'album'
              ? applyAlbumSummary(summary)
              : applySongSummary(composer.localId!, summary)
          }
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 96 },
  header: { alignItems: 'center', paddingBottom: 16, paddingTop: 0 },
  // Solid-black header pinned to the top (outside the ScrollView) so it never
  // scrolls away. It also covers the status-bar area, replacing the top safe
  // band. `paddingTop: insets.top` pushes the back button below the status bar.
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  // Full-bleed poster matching the Home hero image's footprint: no padding so
  // the cover fills the frame edge-to-edge; rounded corners are clipped via
  // overflow. `#222` shows behind the artwork while it loads.
  artFrame: {
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  artImage: { flex: 1 },
  title: { textAlign: 'center', marginTop: 16, paddingHorizontal: 24 },
  // Single metadata line: persona · N songs · GENRE pill · secondary genres.
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingHorizontal: 24,
  },
  metaDot: { marginHorizontal: 6 },
  genrePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  genrePillText: { letterSpacing: 0.5 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  actionsLeft: { flexDirection: 'row', alignItems: 'center' },
  share: { marginLeft: 18 },
  actionsRight: { flexDirection: 'row', alignItems: 'center' },
  dl: { marginHorizontal: 14 },
  list: { paddingHorizontal: 16 },
  // Hairline rule between track rows; inset to line up with the row text.
  trackDivider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  // Recommendation rails below the track list.
  railSection: { marginTop: 28 },
  railContent: { paddingHorizontal: 16 },
  railSep: { width: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeBand: { position: 'absolute', left: 0, right: 0, backgroundColor: '#000' },
  safeBandBottom: { bottom: 0 },
});

export default AlbumDetailsScreen;
