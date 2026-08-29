import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, AppText, LanguagePanel } from '@/components/common';
import { useAppSelector, useRadio } from '@/hooks';
import { getFeatured, getSections, getStationsBySlugs, tune, toggle } from '@/services/radio';
import type { RadioStation } from '@/services/radio';
import type { RootStackParamList } from '@/navigation/types';
import { FeaturedCarousel } from './components/FeaturedCarousel';
import { StationShelf } from './components/StationShelf';
import {
  HomeHeader,
  HomeFilter,
  HOME_FILTER_ALL,
  HOME_FILTER_BAND,
  CHIP_ROW_HEIGHT,
  HEADER_TOP_BLOCK,
} from './components/HomeHeader';

/**
 * Home — the station browser.
 *
 * This was an album/artist home inherited from the music app. Radio has no
 * albums to browse, so it now shows the network the way KJubilee.com does: a
 * featured strip, then the site's own sections — Christian Music, Bible Studies
 * & Prayers, Family Friendly, and International split by region.
 *
 * The whole 105-station network is listed, not just the 15 that can play. Most
 * of the band is announced but not yet on air, and hiding it would misrepresent
 * the network's size; those tiles are dimmed, marked "coming soon", and not
 * pressable. The Dial takes the opposite rule — only tunable stations get a mark
 * there, because a dial that stops on silence teaches you that next is broken.
 *
 * Tapping a station tunes it and opens the Dial, so playback and the tuner never
 * disagree about what is on.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const radio = useRadio();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const language = useAppSelector((s) => s.settings.language);

  const [filter, setFilter] = useState<HomeFilter>(HOME_FILTER_ALL);
  const [langPanelOpen, setLangPanelOpen] = useState(false);

  const sections = useMemo(() => getSections(), []);
  const featured = useMemo(() => getFeatured(), []);
  const filters = useMemo<HomeFilter[]>(
    // Last, as the site puts it last. Unlike every other chip this one is not a
    // filter — see onPickFilter.
    () => [HOME_FILTER_ALL, ...sections.map((s) => s.label), HOME_FILTER_BAND],
    [sections],
  );

  /**
   * The chip row does two different things.
   *
   * All but one narrow the shelves below; The Heavenly Band leaves for the
   * band's essays instead. Branching here rather than inside HomeHeader keeps
   * the header a presentation component that only reports which chip was
   * pressed.
   */
  const onPickFilter = useCallback(
    (next: HomeFilter) => {
      if (next === HOME_FILTER_BAND) navigation.navigate('BandArticles');
      else setFilter(next);
    },
    [navigation],
  );

  /** Shelves to render: everything in site order, or one section when filtered. */
  const shelves = useMemo(() => {
    const chosen =
      filter === HOME_FILTER_ALL ? sections : sections.filter((s) => s.label === filter);
    return chosen.flatMap((section) =>
      section.shelves.map((shelf, i) => ({
        // A section's single flat shelf carries no title of its own, so it takes
        // the section's name; International's six shelves are region-titled and
        // keep theirs, prefixed so the grouping still reads.
        key: `${section.id}:${i}`,
        title: shelf.title ? `${section.label} · ${shelf.title}` : section.label,
        stations: getStationsBySlugs(shelf.stations),
      })),
    );
  }, [sections, filter]);

  const onPickStation = useCallback(
    (station: RadioStation) => {
      if (!station.live) return;
      // The spec's rule for a tile: open the station's page AND start playback.
      // It used to jump to the Dial, which plays a station but says nothing
      // about it — the page is where the story, host and schedule live.
      void tune(station.slug);
      navigation.navigate('StationDetail', { slug: station.slug });
    },
    [navigation],
  );

  /** The featured card toggles rather than always tuning — it shows transport. */
  const onPickFeatured = useCallback(
    (station: RadioStation) => {
      if (!station.live) return;
      if (radio.slug === station.slug) void toggle(station.slug);
      else onPickStation(station);
    },
    [radio.slug, onPickStation],
  );

  /** "See all" — hand the grid the slugs, not the resolved stations. */
  const openSeeAll = useCallback(
    (title: string, stations: RadioStation[]) =>
      navigation.navigate('StationList', { title, slugs: stations.map((s) => s.slug) }),
    [navigation],
  );

  const openProfile = useCallback(
    () => navigation.navigate('MainTabs', { screen: 'ProfileTab', params: { screen: 'Profile' } }),
    [navigation],
  );

  // Animated state for the collapsing header (chips) and its solid background.
  const chipsAnim = useRef(new Animated.Value(1)).current; // 1 = chips visible
  const bgAnim = useRef(new Animated.Value(0)).current; // 0 = gradient, 1 = solid
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

  // Full-bleed, like the website banner — the hero is the one thing on Home
  // that is not inset to the page gutter.
  const heroW = width;
  const playingSlug = radio.playing ? radio.slug : null;
  // Only while it is actually sounding — a paused station should read as the
  // station again, not as a track frozen mid-play.
  const nowPlaying = radio.playing ? radio.track : null;

  return (
    <Screen safeArea={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          // The header is fixed and overlays the top; push content clear of it.
          { paddingTop: insets.top + HEADER_TOP_BLOCK + CHIP_ROW_HEIGHT },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {filter === HOME_FILTER_ALL ? (
          <FeaturedCarousel
            stations={featured}
            width={heroW}
            playingSlug={playingSlug}
            nowPlaying={nowPlaying}
            // Only advance while Home is the visible tab and the strip is
            // actually rendered — a timer ticking behind the Dial is waste.
            active={isFocused}
            onPress={onPickFeatured}
          />
        ) : null}

        {shelves.map((shelf) => (
          <StationShelf
            key={shelf.key}
            title={shelf.title}
            stations={shelf.stations}
            playingSlug={playingSlug}
            onPick={onPickStation}
            onSeeAll={openSeeAll}
          />
        ))}

        <AppText style={styles.footnote} color="textMuted">
          {`${sections.reduce((n, s) => n + s.shelves.reduce((m, sh) => m + sh.stations.length, 0), 0)} stations on the Heavenly Modulation band`}
        </AppText>
      </ScrollView>

      <HomeHeader
        filters={filters}
        selected={filter}
        onSelect={onPickFilter}
        chipsAnim={chipsAnim}
        bgAnim={bgAnim}
        onPressProfile={openProfile}
        language={language}
        onPressLanguage={() => setLangPanelOpen(true)}
      />

      {langPanelOpen ? (
        <LanguagePanel selected={language} onClose={() => setLangPanelOpen(false)} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 28 },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: 34, paddingHorizontal: 24 },
});

export default HomeScreen;
