import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen, Loader, AppText, Artwork, Button, IconButton, SectionHeader } from '@/components/common';
import { AlbumCard } from '@/components/cards';
import { FloatingMiniPlayer } from '@/components/player';
import { useAppDispatch, useAppSelector, usePlayer, useVisibleAlbums, useVisibleTracks } from '@/hooks';
import { toggleFollowArtist } from '@/redux';
import { AlbumRepository, ArtistRepository } from '@/repositories';
import { Album, Artist, Track } from '@/types';
import { personaImage } from '@/assets/personaImages';
import { heroBannerImage } from '@/assets/heroBannerImages';
import { formatCount } from '@/utils';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');
const HERO = width * 0.95;
// The overlaid artist name must never wrap: it shrinks from displayLg (34px)
// down to 40% of that (~14px) so even the longest persona name fits one line on
// a narrow phone. Never 0 — a fontSize of 0 hard-crashes Text on Fabric.
const MIN_NAME_SCALE = 0.4;

export const ArtistDetailsScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'ArtistDetails'>['route']>();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { playTracks, currentTrack, isPlaying, toggle } = usePlayer();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [catalog, setCatalog] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  // Wide persona banner sizes to the slide's natural aspect once it loads (the
  // slides are ~2.37:1); default ≈ that so there's no jump before onLoad.
  const [bannerH, setBannerH] = useState(Math.round(width * 0.42));
  const visibleAlbums = useVisibleAlbums(albums);
  const visibleTopTracks = useVisibleTracks(topTracks);

  // "Similar Music": albums by other artists that share a genre with this
  // artist (or any of its albums). Genre is the catalog's category proxy —
  // artist.genres and album.genre line up (e.g. "Electro-Pop"). Empty when
  // nothing matches, in which case the section is hidden below.
  const similarSource = React.useMemo(() => {
    const wanted = new Set(
      [
        ...(artist?.genres ?? []),
        ...albums.flatMap((a) => [a.genre, ...(a.genres ?? [])]),
      ]
        .filter((g): g is string => !!g)
        .map((g) => g.toLowerCase()),
    );
    if (!wanted.size) return [];
    return catalog.filter((al) => {
      if (al.artistId === artist?.id) return false;
      const tags = [al.genre, ...(al.genres ?? [])]
        .filter((g): g is string => !!g)
        .map((g) => g.toLowerCase());
      return tags.some((tag) => wanted.has(tag));
    });
  }, [artist, albums, catalog]);
  const similarAlbums = useVisibleAlbums(similarSource);

  const following = useAppSelector((s) => s.library.followedArtistIds.includes(params.artistId));

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      ArtistRepository.getById(params.artistId),
      ArtistRepository.getAlbums(params.artistId),
      ArtistRepository.getTopTracks(params.artistId),
      AlbumRepository.list(),
    ])
      .then(([a, al, tt, all]) => {
        if (!active) return;
        setArtist(a);
        setAlbums(al);
        setTopTracks(tt);
        setCatalog(all);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.artistId]);

  if (loading) {
    return (
      <Screen safeArea={false}>
        <Loader />
      </Screen>
    );
  }

  if (!artist) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText color="textMuted">{t('errors.artistNotFound')}</AppText>
        </View>
      </Screen>
    );
  }

  // Persona summary (mirrors the web artist header, adapted for mobile). The
  // manifest maps the artist's role -> `bio` and its category label -> `genres[0]`;
  // counts are over the playable albums the app actually shows.
  const category = artist.genres?.[0];
  const role = artist.bio?.trim() || category;
  const albumCount = visibleAlbums.length;
  const totalTracks = visibleAlbums.reduce((n, a) => n + (a.trackCount ?? 0), 0);

  // Jubilee "-inspire" personas get a wide hero-banner slide; everyone else keeps
  // the tall portrait hero.
  const banner = heroBannerImage(artist.id);

  // This artist's music is the active, playing queue → the play button pauses.
  const isThisArtistPlaying = !!currentTrack && currentTrack.artistId === artist.id && isPlaying;

  const onPlayPause = () => {
    // Already playing/paused this artist → just toggle; otherwise start the top
    // tracks from the beginning.
    if (currentTrack && currentTrack.artistId === artist.id) {
      toggle();
    } else if (visibleTopTracks.length) {
      playTracks(visibleTopTracks, 0);
    }
  };

  return (
    <Screen safeArea={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {banner ? (
          /* Wide persona hero-banner slide (portrait baked in on the right, empty
             circuit art on the left). Height tracks the slide's true aspect so the
             whole image shows with no crop; the name overlays the empty left side. */
          <View style={[styles.banner, { height: bannerH, marginTop: insets.top }]}>
            <Artwork
              source={banner}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              onLoad={({ source }) => {
                if (source?.width && source?.height) {
                  setBannerH(Math.round(width / (source.width / source.height)));
                }
              }}
            />
            <LinearGradient
              colors={['rgba(11,11,15,0.55)', 'transparent', 'rgba(11,11,15,0.85)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.bannerText}>
              <AppText
                variant="displayLg"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={MIN_NAME_SCALE}
              >
                {artist.name}
              </AppText>
            </View>
          </View>
        ) : (
          /* Shift the portrait down by the top inset so its top clears the status
             bar band and the whole circle stays visible — the header/back button
             keep their size and position. */
          <View style={[styles.hero, { height: HERO, marginTop: insets.top }]}>
            <Artwork uri={artist.image} source={personaImage(artist.id)} style={StyleSheet.absoluteFill} iconSize={72} />
            <LinearGradient colors={['transparent', 'transparent', '#0B0B0F']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroText}>
              <AppText
                variant="displayLg"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={MIN_NAME_SCALE}
              >
                {artist.name}
              </AppText>
              {artist.monthlyListeners ? (
                <AppText variant="bodySm" color="textSecondary" style={styles.listeners}>
                  {t('artist.monthlyListeners', { listeners: formatCount(artist.monthlyListeners) })}
                </AppText>
              ) : null}
            </View>
          </View>
        )}

        {/* Back button pinned to the top of the scroll content (over the hero's
            top-left), kept out of the hero so the image's downward shift never
            moves it — the header stays the same size and position. */}
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <IconButton name="chevron-back" onPress={() => navigation.goBack()} style={styles.backBtn} />
        </View>

        <View style={styles.actions}>
          <Button
            label={following ? t('common.following') : t('common.follow')}
            icon={following ? 'checkmark' : 'add'}
            variant={following ? 'ghost' : 'secondary'}
            onPress={() => dispatch(toggleFollowArtist(artist.id))}
          />
          <IconButton
            name={isThisArtistPlaying ? 'pause-circle' : 'play-circle'}
            size={52}
            color="#007FFF"
            onPress={onPlayPause}
          />
        </View>

        <View style={styles.summary}>
          {category ? (
            <AppText variant="caption" color="textMuted" style={styles.kicker}>
              {`${category} · ${t('artist.personaSummary')}`}
            </AppText>
          ) : null}
          {role || category ? (
            <AppText variant="bodySm" color="textSecondary" style={styles.summarySub}>
              {role ? `${role} · ` : ''}
              {category
                ? t('artist.albumsAnchoring', { n: albumCount, category })
                : t('artist.albumCount', { n: albumCount })}
            </AppText>
          ) : null}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <AppText variant="caption" color="textMuted" style={styles.statLabel}>
                {t('artist.statAlbums')}
              </AppText>
              <AppText variant="h2">{albumCount}</AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="caption" color="textMuted" style={styles.statLabel}>
                {t('artist.statTracks')}
              </AppText>
              <AppText variant="h2">{totalTracks.toLocaleString()}</AppText>
            </View>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <SectionHeader
            title={t('artist.popularAlbums')}
            onSeeAll={
              visibleAlbums.length
                ? () =>
                    navigation.navigate('AlbumList', {
                      title: t('artist.popularAlbums'),
                      artistId: artist.id,
                    })
                : undefined
            }
          />
        </View>
        {visibleAlbums.length ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={visibleAlbums}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.albumRow}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <AlbumCard album={item} onPress={(al) => navigation.navigate('AlbumDetails', { albumId: al.id })} />
            )}
          />
        ) : (
          <View style={styles.emptyAlbums}>
            <AppText variant="bodySm" color="textMuted" style={styles.emptyAlbumsText}>
              {t('artist.noAlbums')}
            </AppText>
          </View>
        )}

        {similarAlbums.length ? (
          <>
            <View style={styles.sectionHead}>
              <SectionHeader
                title={t('artist.similarMusic')}
                onSeeAll={() =>
                  navigation.navigate('AlbumList', {
                    title: t('artist.similarMusic'),
                    albumIds: similarAlbums.map((a) => a.id),
                  })
                }
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={similarAlbums}
              keyExtractor={(a) => a.id}
              contentContainerStyle={styles.albumRow}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => (
                <AlbumCard album={item} onPress={(al) => navigation.navigate('AlbumDetails', { albumId: al.id })} />
              )}
            />
          </>
        ) : null}
      </ScrollView>

      {/* Solid-black safe-area bands so the hero never scrolls behind the status
          bar or the gesture/navigation bar. Heights come from the device insets,
          so notches, punch-holes and varying status-bar heights are all covered
          identically on Android and iOS (mirrors AlbumDetails). */}
      {insets.top > 0 ? (
        <View style={[styles.safeBand, styles.safeBandTop, { height: insets.top }]} pointerEvents="none" />
      ) : null}
      {insets.bottom > 0 ? (
        <View style={[styles.safeBand, styles.safeBandBottom, { height: insets.bottom }]} pointerEvents="none" />
      ) : null}

      <FloatingMiniPlayer />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 96 },
  hero: { width: '100%', justifyContent: 'flex-end' },
  banner: { width: '100%', justifyContent: 'flex-end', backgroundColor: '#0B0B0F' },
  // Name overlays the banner's empty left side; capped so it stays off the
  // right-side portrait.
  bannerText: { paddingHorizontal: 16, paddingBottom: 12, maxWidth: '62%' },
  topBar: { position: 'absolute', left: 12 },
  // Circular scrim behind the back button so it stays legible over any portrait,
  // bright or dark (matches AlbumDetails).
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroText: { paddingHorizontal: 16, paddingBottom: 12 },
  listeners: { marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  summary: { paddingHorizontal: 16, marginTop: 18 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2 },
  summarySub: { marginTop: 6, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 36, marginTop: 16 },
  stat: {},
  statLabel: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  // Top spacing for a section; SectionHeader supplies its own horizontal padding
  // (spacing.lg = 16, matching the album rows) and bottom margin.
  sectionHead: { marginTop: 28 },
  albumRow: { paddingHorizontal: 16 },
  emptyAlbums: { paddingHorizontal: 16, paddingVertical: 8 },
  emptyAlbumsText: { lineHeight: 20 },
  sep: { width: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeBand: { position: 'absolute', left: 0, right: 0, backgroundColor: '#000' },
  safeBandTop: { top: 0 },
  safeBandBottom: { bottom: 0 },
});

export default ArtistDetailsScreen;
