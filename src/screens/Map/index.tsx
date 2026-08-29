import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText } from '@/components/common';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import { getStationsBySlugs } from '@/services/radio';
import type { RootStackParamList } from '@/navigation/types';
import { StationRow } from '@/screens/Browse/components/StationRow';
import { MapCanvas } from './MapCanvas';
import {
  City,
  HOME_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  VIEW_H,
  VIEW_TOP,
  Viewport,
  WORLD,
  ZOOM_STEP,
  flagUrl,
} from './types';

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
  const [view, setView] = useState<Viewport>(HOME_VIEW);

  // Sized to the CROPPED band, not the whole sphere — see VIEW_TOP. Using the
  // full 2:1 ratio here is what left an empty fifth of the map at each end.
  const mapW = width;
  const mapH = Math.round((mapW * VIEW_H) / WORLD.width);

  const c = theme.colors;
  const playingSlug = radio.playing ? radio.slug : null;

  const stations = useMemo(
    () => (selected ? getStationsBySlugs(selected.stations) : []),
    [selected],
  );

  const totalStations = useMemo(
    () => new Set(WORLD.cities.flatMap((x) => x.stations)).size,
    [],
  );

  // ---- pan and zoom --------------------------------------------------------

  /**
   * Keep the map from being dragged off its own edges: at any scale the visible
   * window has to stay inside the world, and at 1x there is nowhere to go.
   */
  const clamp = useCallback((v: Viewport): Viewport => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    // A world point y lands at `ty + y * scale`, and the visible band runs from
    // VIEW_TOP to VIEW_BOTTOM — so the offsets that keep the band covered are
    // these, and at 1x they collapse to zero, which is exactly right: there is
    // nowhere to drag to when the whole world already fits.
    const maxTy = VIEW_TOP * (1 - scale);
    const minTy = (VIEW_TOP + VIEW_H) * (1 - scale);
    return {
      scale,
      tx: Math.min(0, Math.max(WORLD.width * (1 - scale), v.tx)),
      ty: Math.min(maxTy, Math.max(minTy, v.ty)),
    };
  }, []);

  /** Zoom about the middle of the viewport, so the centre of what you are looking at stays put. */
  const zoomBy = useCallback(
    (factor: number) =>
      setView((v) => {
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        const k = scale / v.scale;
        const cx = WORLD.width / 2;
        const cy = VIEW_TOP + VIEW_H / 2;
        return clamp({ scale, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k });
      }),
    [clamp],
  );

  /**
   * Drag to pan.
   *
   * The responder is claimed only once a finger has actually MOVED — the dots
   * carry their own onPress inside the SVG, and grabbing the gesture on touch
   * down would swallow every tap on a transmitter.
   */
  const viewRef = useRef(view);
  viewRef.current = view;
  const panFrom = useRef(HOME_VIEW);
  /** The map's position on screen, so a pinch can be anchored where the fingers are. */
  const mapBox = useRef({ x: 0, y: 0 });
  const mapRef = useRef<View>(null);
  /** Set on the first two-finger frame and cleared when a finger lifts. */
  const pinch = useRef<{ dist: number; view: Viewport; vx: number; vy: number } | null>(null);

  /**
   * Zoom to `scale` while holding one point of the world still.
   *
   * `(vx, vy)` is in viewBox units. The world point under it is
   * `(vx - tx) / scale`, and after the change it has to land back on `vx` — so
   * the new offset falls straight out. Anchoring on the finger midpoint rather
   * than the centre is what makes a pinch feel attached to the map.
   */
  const zoomAbout = useCallback(
    (from: Viewport, scale: number, vx: number, vy: number): Viewport => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      return clamp({
        scale: s,
        tx: vx - ((vx - from.tx) / from.scale) * s,
        ty: vy - ((vy - from.ty) / from.scale) * s,
      });
    },
    [clamp],
  );
  const pan = useMemo(
    () =>
      PanResponder.create({
        // CAPTURE, not the bubbling phase. Every dot inside the SVG carries its
        // own onPress, so react-native-svg claims the responder the moment a
        // finger lands and the parent is never asked. Capture runs top-down, so
        // this takes the gesture back — but only once the finger has actually
        // MOVED, which leaves a plain tap on a transmitter untouched.
        onStartShouldSetPanResponderCapture: () => false,
        // Two fingers always win, at any zoom — a pinch is how someone zooms IN
        // from 1x, so gating it on scale > 1 would make it impossible to start.
        onMoveShouldSetPanResponderCapture: (e, g) =>
          e.nativeEvent.touches.length >= 2 ||
          (viewRef.current.scale > 1 && (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6)),
        // Once panning, keep it: the SectionList underneath would otherwise
        // steal a drag that wandered vertically.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          panFrom.current = viewRef.current;
          pinch.current = null;
          mapRef.current?.measureInWindow((x, y) => {
            mapBox.current = { x, y };
          });
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;

          if (touches.length >= 2) {
            const [a, b] = touches;
            const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            if (!pinch.current) {
              // Anchor on the midpoint between the fingers, converted from page
              // pixels into viewBox units.
              const mx = (a.pageX + b.pageX) / 2 - mapBox.current.x;
              const my = (a.pageY + b.pageY) / 2 - mapBox.current.y;
              pinch.current = {
                dist,
                view: viewRef.current,
                vx: mx * (WORLD.width / mapW),
                vy: VIEW_TOP + my * (VIEW_H / mapH),
              };
              return;
            }
            const p = pinch.current;
            // A pinch that has barely moved is a two-finger rest, not a zoom.
            if (Math.abs(dist - p.dist) < 4) return;
            setView(zoomAbout(p.view, (p.view.scale * dist) / p.dist, p.vx, p.vy));
            return;
          }

          // Back to one finger: the next two-finger frame starts a fresh pinch
          // rather than resuming one measured against a lifted thumb.
          pinch.current = null;
          // Gesture deltas are device pixels; the transform is in viewBox units.
          const k = WORLD.width / mapW;
          setView(
            clamp({
              scale: panFrom.current.scale,
              tx: panFrom.current.tx + g.dx * k,
              ty: panFrom.current.ty + g.dy * k,
            }),
          );
        },
        onPanResponderRelease: () => {
          pinch.current = null;
        },
      }),
    [clamp, mapH, mapW, zoomAbout],
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
      setView((v) => {
        const scale = Math.max(v.scale, 4);
        return clamp({
          scale,
          tx: WORLD.width / 2 - city.x * scale,
          ty: VIEW_TOP + VIEW_H / 2 - city.y * scale,
        });
      });
    },
    [clamp],
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
        <View ref={mapRef} collapsable={false} {...pan.panHandlers}>
          <MapCanvas
            world={WORLD}
            width={mapW}
            height={mapH}
            view={view}
            selected={selected}
            playingSlug={playingSlug}
            onPick={pick}
            colors={canvasColors}
          />
        </View>

        {/* Zoom sits on the map, as it does on the site. Drag is only offered
            once there is somewhere to drag to — at 1x the world already fits. */}
        <View style={styles.zoomCol}>
          {(
            [
              ['remove', () => zoomBy(1 / ZOOM_STEP), 'Zoom out'],
              ['add', () => zoomBy(ZOOM_STEP), 'Zoom in'],
              ['refresh', () => setView(HOME_VIEW), 'Reset the map'],
            ] as const
          ).map(([icon, onPress, label]) => (
            <Pressable
              key={icon}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({ pressed }) => [
                styles.zoomBtn,
                {
                  backgroundColor: c.backgroundElevated,
                  borderColor: c.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name={icon} size={18} color={c.text} />
            </Pressable>
          ))}
        </View>
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
          {view.scale > 1
            ? 'Drag to pan. Tap a transmitter to see what broadcasts from it.'
            : 'Tap a transmitter to see what broadcasts from it, or zoom in to pan.'}
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  head: { paddingHorizontal: 16 },
  title: { marginTop: 8 },
  sub: { fontSize: 12.5, marginTop: 6, marginBottom: 16, lineHeight: 18 },
  mapWrap: { overflow: 'hidden' },
  zoomCol: { position: 'absolute', right: 10, top: 10, gap: 8 },
  zoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  panelCity: { fontSize: 20 },
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
