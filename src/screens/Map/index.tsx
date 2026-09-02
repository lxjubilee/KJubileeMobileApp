import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText } from '@/components/common';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import { getStationsBySlugs } from '@/services/radio';
import type { RootStackParamList } from '@/navigation/types';
import { tabBarStyle } from '@/navigation/tabBarStyle';
import { StationRow } from '@/screens/Browse/components/StationRow';
import { MapCanvas } from './MapCanvas';
import { MapControls } from './MapControls';
import { FullscreenMap } from './FullscreenMap';
import { useMapViewport } from './useMapViewport';
import { useLandscapeMap } from './useLandscapeMap';
import { City, WORLD, bandFor, flagUrl, fullSphereHeight } from './types';

/**
 * The broadcast map — every HM transmit location on earth.
 *
 * Ported from the website's map page. The dots are the site's own tower roster,
 * all 347 across 132 countries, joined to the station bases so a tap can still
 * say what broadcasts from a place — the two are different files answering
 * different questions; see scripts/build-map-data.mjs.
 *
 * Dots are per CITY, not per station: drawing one per station would stack
 * thirty of them on Los Angeles. A dot's size carries the count instead, which
 * is the information that stacking would have destroyed.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

const sameCity = (a: City, b: City | null) =>
  b != null && a.city === b.city && a.cc === b.cc;

export const MapScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const radio = useRadio();
  const { width } = useWindowDimensions();

  const [selected, setSelected] = useState<City | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  /**
   * Turning the phone opens the map, and turning it back closes it.
   *
   * Only this screen can be turned at all — the rest of the app is portrait,
   * and `useLandscapeMap` asks for the exception only while the map is focused.
   * A phone held sideways is a wide short box, which is the worst shape there
   * is for a screen that is a strip of map above a list of 347 cities and the
   * best one for the map alone, so the rotation IS the request.
   *
   * OR rather than a setState from an effect: `expanded` stays whatever the
   * expand button last made it, so turning the phone and turning it back leaves
   * a map opened by hand still open, and one opened by the rotation shut.
   */
  const landscape = useLandscapeMap();
  const fullscreen = expanded || landscape;

  // As tall as an all-longitudes map can be: the projection is 2:1, so full
  // width fixes the height at half of it. Anything taller would have to drop
  // longitudes, which is what the fullscreen map is for.
  const mapW = width;
  const mapH = fullSphereHeight(mapW);
  const band = useMemo(() => bandFor(mapW, mapH), [mapW, mapH]);
  const map = useMapViewport(band, mapW, mapH);

  const c = theme.colors;
  const playingSlug = radio.playing ? radio.slug : null;

  /**
   * Take the tab bar and the MiniPlayer down with the rest of the screen.
   *
   * The fullscreen map is an overlay inside this tab, not a Modal (see
   * FullscreenMap for why), so it fills the tab's content area and stops above
   * the bar. Portrait that was a strip at the bottom; turned, it is a large
   * fraction of a short screen. `tabBarStyle` is read by the custom tab bar,
   * which drops the MiniPlayer with it — `display: 'none'` alone would hide
   * only the bar underneath it.
   */
  useEffect(() => {
    // `navigation` is typed as the root stack's, for the pushes below; the
    // object this screen actually holds is the tab's, and `tabBarStyle` is one
    // of its options. The visible style has to be spelled out to put the bar
    // back rather than left off — see `tabBarStyle`.
    const tab = navigation as unknown as {
      setOptions: (o: { tabBarStyle: ViewStyle }) => void;
    };
    tab.setOptions({ tabBarStyle: tabBarStyle(c, fullscreen) });
  }, [c, fullscreen, navigation]);

  const stations = useMemo(
    () => (selected ? getStationsBySlugs(selected.stations) : []),
    [selected],
  );

  const totalStations = useMemo(
    () => new Set(WORLD.cities.flatMap((x) => x.stations)).size,
    [],
  );

  // ---- selection -----------------------------------------------------------

  const pick = useCallback(
    (city: City) => setSelected((cur) => (sameCity(city, cur) ? null : city)),
    [],
  );

  /** Choosing from the list centres the map on that tower, as the site's list does. */
  const pickFromList = useCallback(
    (city: City) => {
      setSelected(city);
      map.centreOn(city);
    },
    [map],
  );

  const onPickStation = useCallback(
    (slug: string, live: boolean) => {
      if (!live) return;
      navigation.navigate('StationDetail', { slug });
    },
    [navigation],
  );

  // ---- the location list ---------------------------------------------------

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? WORLD.cities.filter(
          (x) => x.city.toLowerCase().includes(q) || x.cc.toLowerCase().includes(q),
        )
      : WORLD.cities;
    // Region order comes from the roster, not from the data's own ordering,
    // which is sorted by station count so the busiest dots draw on top.
    return WORLD.regions
      .map((region) => ({
        title: region,
        data: matches
          .filter((x) => x.region === region)
          .sort((a, b) => a.city.localeCompare(b.city)),
      }))
      .filter((s) => s.data.length > 0);
  }, [query]);

  const canvasColors = useMemo(
    () => ({
      surface: c.surface,
      border: c.border,
      accent: c.accent,
      danger: c.danger,
      text: c.text,
    }),
    [c.surface, c.border, c.accent, c.danger, c.text],
  );

  const header = (
    <View>
      <View style={styles.head}>
        {/* The site's own name for this surface — its nav says "AI Towers Map"
            and the page heads "AI Radio Towers Worldwide". The list below keeps
            "Broadcast Locations", which is what the site calls that panel. */}
        <AppText variant="display" style={styles.title}>
          AI Towers Map
        </AppText>
        <AppText style={[styles.sub, { color: c.textMuted }]}>
          {`${WORLD.cities.length} broadcast locations across ${WORLD.countryCount} countries carry the whole dial · ${totalStations} stations on the HM band`}
        </AppText>
      </View>

      <View style={[styles.mapWrap, { backgroundColor: c.backgroundElevated }]}>
        <View ref={map.mapRef} collapsable={false} {...map.panHandlers}>
          <MapCanvas
            world={WORLD}
            width={mapW}
            height={mapH}
            band={band}
            view={map.view}
            selected={selected}
            playingSlug={playingSlug}
            onPick={pick}
            colors={canvasColors}
          />
        </View>

        {/* Zoom sits on the map, as it does on the site. Expand is a button and
            not a tap on the map: every dot here is already a tap target, and
            taking that gesture would cost the map its selection. */}
        <MapControls
          actions={[
            { icon: 'remove', onPress: map.zoomOut, label: 'Zoom out' },
            { icon: 'add', onPress: map.zoomIn, label: 'Zoom in' },
            { icon: 'refresh', onPress: map.reset, label: 'Reset the map' },
            { icon: 'expand', onPress: () => setExpanded(true), label: 'Open the map fullscreen' },
          ]}
        />
      </View>

      {selected ? (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View style={styles.panelTitleWrap}>
              <AppText style={[styles.panelCity, { color: c.text }]}>{selected.city}</AppText>
              <AppText style={[styles.panelMeta, { color: c.textMuted }]}>
                {`${selected.region} · ${selected.stations.length} station${
                  selected.stations.length === 1 ? '' : 's'
                }${selected.tower ? ' · tower' : ''}`}
              </AppText>
            </View>
            <Pressable
              onPress={() => setSelected(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <AppText style={[styles.close, { color: c.textMuted }]}>CLOSE</AppText>
            </Pressable>
          </View>

          {stations.length ? (
            stations.map((s) => (
              <StationRow
                key={s.slug}
                station={s}
                playing={s.slug === playingSlug}
                onPress={(picked) => onPickStation(picked.slug, picked.live)}
              />
            ))
          ) : (
            // Not an error, and worth saying plainly: most of the 347 are relays
            // that carry the dial without any station naming them as a base.
            <AppText style={[styles.empty, { color: c.textMuted }]}>
              A relay for the whole dial — no station broadcasts from here.
            </AppText>
          )}
        </View>
      ) : (
        <AppText style={[styles.hint, { color: c.textMuted }]}>
          {map.view.scale > 1
            ? 'Pinch to zoom, drag to pan. Tap a transmitter to see what broadcasts from it.'
            : 'Pinch to zoom, or tap a transmitter to see what broadcasts from it.'}
        </AppText>
      )}

      <View style={styles.listHead}>
        <AppText style={[styles.listTitle, { color: c.textMuted }]}>BROADCAST LOCATIONS</AppText>
        <View style={[styles.search, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Ionicons name="search" size={15} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find a city or country code…"
            placeholderTextColor={c.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: c.text }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear">
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.city}|${item.cc}`}
        ListHeaderComponent={header}
        // See `gesturing`: the native Android scroller will otherwise take the
        // second finger of a pinch off the map mid-gesture.
        scrollEnabled={!map.gesturing}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        initialNumToRender={14}
        ListEmptyComponent={
          <AppText style={[styles.empty, { color: c.textMuted }]}>
            No broadcast location matches that.
          </AppText>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.regionHead, { borderBottomColor: c.border }]}>
            <AppText style={[styles.regionName, { color: c.accent }]}>
              {section.title.toUpperCase()}
            </AppText>
            <AppText style={[styles.regionCount, { color: c.textMuted }]}>
              {section.data.length}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => {
          const on = sameCity(item, selected);
          return (
            <Pressable
              onPress={() => pickFromList(item)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: on ? c.surface : 'transparent', opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Image source={{ uri: flagUrl(item.cc) }} style={styles.flag} />
              <AppText numberOfLines={1} style={[styles.rowCity, { color: c.text }]}>
                {item.city}
              </AppText>
              {item.stations.length ? (
                <AppText style={[styles.rowCount, { color: c.textMuted }]}>
                  {item.stations.length}
                </AppText>
              ) : null}
              <AppText style={[styles.rowCc, { color: c.textMuted }]}>{item.cc}</AppText>
            </Pressable>
          );
        }}
      />

      {/* Mounted only while open, as LanguagePanel is — a Modal kept mounted
          behind `visible={false}` wedges the Android UI thread. */}
      {fullscreen ? (
        <FullscreenMap
          selected={selected}
          playingSlug={playingSlug}
          onPick={pick}
          onClose={() => setExpanded(false)}
          colors={canvasColors}
          landscape={landscape}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  head: { paddingHorizontal: 16 },
  title: { marginTop: 8 },
  sub: { fontSize: 12.5, marginTop: 6, marginBottom: 16, lineHeight: 18 },
  mapWrap: { overflow: 'hidden' },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 20, paddingHorizontal: 32 },
  panel: { marginTop: 18 },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  panelTitleWrap: { flex: 1, marginRight: 12 },
  // Same reason as StationDetail's title: body's 21 is no line box for 20pt
  // type, and the broadcast list carries Tokyo, Sydney and Jerusalem.
  panelCity: { fontSize: 20, lineHeight: 26 },
  panelMeta: { fontSize: 12.5, marginTop: 3 },
  close: { fontSize: 10, letterSpacing: 1.4, marginTop: 6 },
  empty: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 10 },

  listHead: { paddingHorizontal: 16, marginTop: 26 },
  listTitle: { fontSize: 11, letterSpacing: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginTop: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  regionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  regionName: { fontSize: 11, letterSpacing: 1.6 },
  regionCount: { fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 44 },
  // Fixed box so the names line up whatever shape the flag is.
  flag: { width: 22, height: 15, borderRadius: 2 },
  rowCity: { flex: 1, fontSize: 15 },
  rowCount: { fontSize: 12 },
  rowCc: { fontSize: 12, letterSpacing: 1, width: 26, textAlign: 'right' },
});

export default MapScreen;
