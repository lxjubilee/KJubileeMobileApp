import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Loader, AppText, LanguagePanel } from '@/components/common';
import { useAppDispatch, useAppSelector, usePlayer, useVisibleAlbums, useVisibleRails } from '@/hooks';
import { fetchHomeFeed } from '@/redux';
import { onMobileConfigUpdated, resetMobileConfigCache } from '@/services/mobileConfig';
import { DEFAULT_LANG, langName, localizeCategory } from '@/localization';
import { AlbumRepository } from '@/repositories';
import { Album, Artist, ResolvedRail } from '@/types';
import { logger } from '@/utils';
import type { RootStackParamList } from '@/navigation/types';
import { HeroCarousel } from './components/HeroCarousel';
import { Rail } from './components/Rail';
import { HomeHeader, HomeFilter, HOME_FILTER_ALL, CHIP_ROW_HEIGHT } from './components/HomeHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { playTracks } = usePlayer();
  const { feed, status } = useAppSelector((s) => s.home);
  const language = useAppSelector((s) => s.settings.language);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<HomeFilter>(HOME_FILTER_ALL);
  const [langPanelOpen, setLangPanelOpen] = useState(false);
  // Per-page hero (v2): a page shows ONLY its own hero (empty when the admin
  // turned it off, so a deactivated hero never renders). NB: HOME_FILTER_ALL is
  // the string 'Home', which COLLIDES with the real "Home" page label — so we must
  // NOT branch on it here. In config mode (categoryLabels present) every chip is a
  // real page, so we never fall back to the default `heroes`; that fallback is
  // only for manifest/legacy mode (no admin config).
  const heroSource =
    feed?.heroesByCategory?.[filter]
    ?? (feed?.categoryLabels?.length ? [] : feed?.heroes ?? []);
  // Hero albums minus any whose cover is missing.
  const heroes = useVisibleAlbums(heroSource);
  // Rails with artwork-less items removed and emptied rails dropped — so no
  // blank gap is left where an all-missing rail used to be.
  const railsWithArt = useVisibleRails(feed?.rails ?? []);

  // Config mode: every rail carries a categoryLabel (admin-managed categories,
  // first one is "Home"), so the chips ARE the categories and "Home" is a real
  // category. Fallback mode (manifest-derived): some rails are uncategorized, so
  // we prepend a synthetic "Home" chip that shows everything (legacy behavior).
  const { filters, showAllChip } = useMemo<{ filters: HomeFilter[]; showAllChip: boolean }>(() => {
    // Config mode: the chips ARE the configured pages, in order — including a
    // page that currently has only a hero and no rails, so a newly created page
    // still appears in the nav.
    if (feed?.categoryLabels?.length) {
      return { filters: feed.categoryLabels, showAllChip: false };
    }
    // Fallback (manifest-derived): derive chips from the rails + a synthetic
    // "all" chip (legacy behavior when there is no admin config).
    const labels: string[] = [];
    let hasUncategorized = false;
    for (const rail of railsWithArt) {
      if (rail.categoryLabel) {
        if (!labels.includes(rail.categoryLabel)) labels.push(rail.categoryLabel);
      } else {
        hasUncategorized = true;
      }
    }
    const all = hasUncategorized || labels.length === 0;
    return { filters: all ? [HOME_FILTER_ALL, ...labels] : labels, showAllChip: all };
  }, [feed, railsWithArt]);

  // Reset to the first chip if the selected one vanishes after a feed refresh.
  useEffect(() => {
    if (!filters.includes(filter)) setFilter(filters[0] ?? HOME_FILTER_ALL);
  }, [filters, filter]);

  // Localized chip TEXT only — the raw `value` stays the filter identity (rail
  // match + hero lookup). Config chips translate by their stable key; the
  // fallback-mode "all" sentinel reuses the Home tab label.
  const labelFor = useCallback(
    (value: HomeFilter) =>
      value === HOME_FILTER_ALL && showAllChip
        ? t('tabs.home', { defaultValue: value })
        : localizeCategory(t, feed?.categoryKeys?.[value], value),
    [t, feed?.categoryKeys, showAllChip],
  );

  // The "all" chip shows every rail; any category chip shows only its rails.
  const visibleRails = useMemo(
    () =>
      railsWithArt.filter((rail) =>
        showAllChip && filter === HOME_FILTER_ALL ? true : rail.categoryLabel === filter,
      ),
    [railsWithArt, filter, showAllChip],
  );

  // The genre line under album titles is a Home-page treatment only — every other
  // category page keeps the plain title. Match on the STABLE config key, not the
  // label, so an admin renaming the page can't silently switch it off (the label
  // also collides with the HOME_FILTER_ALL sentinel). In fallback mode the
  // synthetic "all" chip is the Home page; with no key at all (older config
  // payload) the first configured page is Home.
  const showAlbumGenre = useMemo(() => {
    if (showAllChip) return filter === HOME_FILTER_ALL;
    const key = feed?.categoryKeys?.[filter];
    if (!key) return filter === filters[0];
    // Backend keys drift between `_` and `-` separators — normalize like the
    // category localizer does.
    return key.replace(/-/g, '_') === 'home';
  }, [showAllChip, filter, filters, feed?.categoryKeys]);

  // Animated state for the collapsing header (chips) and its solid background.
  const chipsAnim = useRef(new Animated.Value(1)).current; // 1 = chips visible
  const bgAnim = useRef(new Animated.Value(0)).current; // 0 = gradient, 1 = solid black
  const lastY = useRef(0);
  const chipsVisible = useRef(true);
  const bgSolid = useRef(false);

  const animate = useCallback(
    (value: Animated.Value, toValue: number) =>
      Animated.timing(value, { toValue, duration: 200, useNativeDriver: false }).start(),
    [],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;

      // Background: solid black once we leave the very top.
      const solid = y > 12;
      if (solid !== bgSolid.current) {
        bgSolid.current = solid;
        animate(bgAnim, solid ? 1 : 0);
      }

      // Chips: hide on scroll-down, show on scroll-up (always shown at the top).
      const dy = y - lastY.current;
      if (y <= 12) {
        if (!chipsVisible.current) {
          chipsVisible.current = true;
          animate(chipsAnim, 1);
        }
      } else if (dy > 6 && chipsVisible.current) {
        chipsVisible.current = false;
        animate(chipsAnim, 0);
      } else if (dy < -6 && !chipsVisible.current) {
        chipsVisible.current = true;
        animate(chipsAnim, 1);
      }
      lastY.current = y;
    },
    [animate, bgAnim, chipsAnim],
  );

  useEffect(() => {
    if (status === 'idle') dispatch(fetchHomeFeed());
  }, [dispatch, status]);

  // Rebuild Home whenever the admin config changes. The config client fetches a
  // fresh copy in the background (stale-while-revalidate) and fires this when it
  // differs — without this subscription, added hero slides / sections / pages
  // would never appear until the app was restarted twice.
  useEffect(() => onMobileConfigUpdated(() => { dispatch(fetchHomeFeed()); }), [dispatch]);

  const openAlbum = useCallback(
    (album: Album) => navigation.navigate('AlbumDetails', { albumId: album.id }),
    [navigation],
  );
  const openArtist = useCallback(
    (artist: Artist) => navigation.navigate('ArtistDetails', { artistId: artist.id }),
    [navigation],
  );
  const openProfile = useCallback(
    () => navigation.navigate('MainTabs', { screen: 'PlaylistsTab', params: { screen: 'Profile' } }),
    [navigation],
  );
  const openSeeAll = useCallback(
    (rail: ResolvedRail) => {
      // Carry the Home page's genre-under-title treatment into the grid, so
      // "See all" looks like the rail it was opened from.
      const genreLine = showAlbumGenre ? { showAlbumGenre: true } : {};
      if (rail.itemType === 'artist') {
        // An artist rail opens the artist grid, not an album list.
        if (!rail.artists?.length) return;
        navigation.navigate('ArtistList', {
          title: rail.title,
          artistIds: rail.artists.map((a) => a.id),
        });
      } else if (rail.seeAllArtistId) {
        navigation.navigate('AlbumList', {
          title: rail.title,
          artistId: rail.seeAllArtistId,
          ...genreLine,
        });
      } else if (rail.albums?.length) {
        // A section with more albums than the preview shows — open the full grid.
        navigation.navigate('AlbumList', {
          title: rail.title,
          albumIds: rail.albums.map((a) => a.id),
          ...(rail.showGenre ? { genreByItem: rail.genreByItem } : {}),
          ...genreLine,
        });
      }
    },
    [navigation, showAlbumGenre],
  );

  /** Hero "Play" — fetch the album's tracks then start the queue. */
  const playAlbum = useCallback(
    async (album: Album) => {
      try {
        const full = await AlbumRepository.getById(album.id);
        if (full?.tracks?.length) await playTracks(full.tracks, 0);
      } catch (e) {
        logger.warn('Home.playAlbum failed', e);
      }
    },
    [playTracks],
  );

  const refreshing = status === 'loading' && feed != null;

  // A non-English language with nothing in the catalog yet → "coming soon"
  // (mirrors the web's per-language Home). English always has content.
  const emptyForLanguage =
    feed != null &&
    language !== DEFAULT_LANG &&
    heroes.length === 0 &&
    visibleRails.length === 0;

  // A selected category with no playable content on-device (e.g. its albums
  // aren't published/playable yet). We still show the chip — categories mirror
  // the backend — but the page shows an empty state instead of a blank scroll.
  const emptyCategory =
    feed != null &&
    !emptyForLanguage &&
    heroes.length === 0 &&
    visibleRails.length === 0;

  if (status === 'loading' && !feed) {
    return (
      <Screen safeArea={false}>
        <Loader message="Loading your music…" />
      </Screen>
    );
  }

  if (status === 'failed' && !feed) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="body" color="textMuted" style={styles.errorText}>
            {t('home.loadError')}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeArea={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          // No hero to sit behind the fixed header → push content below it so the
          // first rail isn't hidden under the logo + filter chips.
          heroes.length === 0 && { paddingTop: insets.top + 64 + CHIP_ROW_HEIGHT },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { resetMobileConfigCache(); dispatch(fetchHomeFeed()); }}
            tintColor="#fff"
          />
        }
      >
        {emptyForLanguage ? (
          <View style={styles.comingSoon}>
            <AppText variant="body" color="textMuted" style={styles.comingSoonText}>
              {t('home.comingSoon', { language: langName(language) })}
            </AppText>
          </View>
        ) : emptyCategory ? (
          <View style={styles.comingSoon}>
            <AppText variant="body" color="textMuted" style={styles.comingSoonText}>
              {t('home.emptyCategory')}
            </AppText>
          </View>
        ) : (
          <>
            {heroes.length ? (
              <HeroCarousel albums={heroes} onPlay={playAlbum} onOpen={openAlbum} />
            ) : null}

            {visibleRails.map((rail) => (
              <View key={rail.id} style={styles.railWrap}>
                <Rail
                  rail={rail}
                  onAlbumPress={openAlbum}
                  onArtistPress={openArtist}
                  onSeeAll={openSeeAll}
                  showAlbumGenre={showAlbumGenre}
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Fixed Netflix-style header overlaying the hero. */}
      <HomeHeader
        filters={filters}
        selected={filter}
        onSelect={setFilter}
        chipsAnim={chipsAnim}
        bgAnim={bgAnim}
        onPressProfile={openProfile}
        language={language}
        onPressLanguage={() => setLangPanelOpen(true)}
        getLabel={labelFor}
      />

      {langPanelOpen ? (
        <LanguagePanel
          selected={language}
          onClose={() => setLangPanelOpen(false)}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 24 },
  railWrap: { marginBottom: 28 },
  comingSoon: { paddingTop: 180, paddingHorizontal: 32, alignItems: 'center' },
  comingSoonText: { textAlign: 'center', lineHeight: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { textAlign: 'center' },
});

export default HomeScreen;
