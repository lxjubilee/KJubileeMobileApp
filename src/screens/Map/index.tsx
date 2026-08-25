import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText } from '@/components/common';
import { useTheme } from '@/context';
import { useRadio } from '@/hooks';
import { getStationsBySlugs } from '@/services/radio';
import map from '@/assets/radio/worldMap.json';
import type { RootStackParamList } from '@/navigation/types';
import { StationRow } from '@/screens/Browse/components/StationRow';

/**
 * The broadcast map — every HM transmit location on earth.
 *
 * Ported from the website's map.html: "Every Heavenly Modulation broadcast
 * location on earth, drawn city by city." The geometry and the projection are
 * precomputed by scripts/build-map-data.mjs, so this renders SVG paths rather
 * than projecting ten thousand coordinates on mount.
 *
 * Dots are per CITY, not per station: 315 base entries resolve to 72 places, and
 * drawing one dot per station would stack thirty of them on Los Angeles. A dot's
 * size carries the count instead, which is the information that stacking would
 * have destroyed.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface City {
  city: string;
  cc: string;
  region: string;
  x: number;
  y: number;
  tower: boolean;
  stations: string[];
}

const WORLD = map as unknown as {
  width: number;
  height: number;
  countries: { id: string; name: string; d: string }[];
  cities: City[];
};

/** Dot radius from how many stations broadcast there, in viewBox units. */
const radiusFor = (n: number) => Math.min(26, 8 + Math.sqrt(n) * 4);

const isOn = (city: City, sel: City | null) =>
  sel != null && sel.city === city.city && sel.cc === city.cc;

const carries = (city: City, playingSlug: string | null) =>
  playingSlug != null && city.stations.includes(playingSlug);

export const MapScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const radio = useRadio();
  const { width } = useWindowDimensions();

  const [selected, setSelected] = useState<City | null>(null);

  // The map keeps its 2:1 equirectangular ratio and fills the width.
  const mapW = width;
  const mapH = Math.round((mapW * WORLD.height) / WORLD.width);

  const stations = useMemo(
    () => (selected ? getStationsBySlugs(selected.stations) : []),
    [selected],
  );

  const onPickStation = useCallback(
    (slug: string, live: boolean) => {
      if (!live) return;
      navigation.navigate('StationDetail', { slug });
    },
    [navigation],
  );

  const c = theme.colors;
  const playingSlug = radio.playing ? radio.slug : null;
  const totalStations = useMemo(
    () => new Set(WORLD.cities.flatMap((x) => x.stations)).size,
    [],
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="display" style={styles.title}>
            Broadcast Map
          </AppText>
          <AppText style={[styles.sub, { color: c.textMuted }]}>
            {`${WORLD.cities.length} transmit cities · ${totalStations} stations on the HM band`}
          </AppText>
        </View>

        <View style={[styles.mapWrap, { backgroundColor: c.backgroundElevated }]}>
          <Svg width={mapW} height={mapH} viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}>
            <G>
              {WORLD.countries.map((country) => (
                <Path
                  // Name, not id: Natural Earth gives no ISO code to disputed
                  // territories (Kosovo, N. Cyprus, Somaliland), so three
                  // countries share an empty id. Names are unique.
                  key={country.name}
                  d={country.d}
                  fill={c.surface}
                  stroke={c.border}
                  strokeWidth={1}
                />
              ))}
            </G>
            {/* Three ordered passes, not one per city. Cities are sorted
                busiest-first, so with a halo drawn immediately before each dot,
                every LATER city's halo painted over the earlier dots — in the
                dense US cluster that covered Los Angeles entirely and swallowed
                its touches. Halos first, then dots, then a transparent hit layer
                on top means nothing can ever occlude a target. */}
            <G>
              {WORLD.cities.map((city) => (
                <Circle
                  key={`halo:${city.city}|${city.cc}`}
                  cx={city.x}
                  cy={city.y}
                  r={radiusFor(city.stations.length) * 1.9}
                  fill={carries(city, playingSlug) ? c.danger : c.accent}
                  opacity={isOn(city, selected) ? 0.3 : 0.12}
                />
              ))}
            </G>
            <G>
              {WORLD.cities.map((city) => {
                const on = isOn(city, selected);
                return (
                  <Circle
                    key={`dot:${city.city}|${city.cc}`}
                    cx={city.x}
                    cy={city.y}
                    r={radiusFor(city.stations.length)}
                    fill={carries(city, playingSlug) ? c.danger : c.accent}
                    opacity={on ? 1 : 0.85}
                    stroke={on ? c.text : 'none'}
                    strokeWidth={on ? 4 : 0}
                  />
                );
              })}
            </G>
            <G>
              {WORLD.cities.map((city) => (
                <Circle
                  key={`hit:${city.city}|${city.cc}`}
                  cx={city.x}
                  cy={city.y}
                  // A generous minimum: the smallest dot is 12 viewBox units,
                  // which is about four device pixels — untappable on its own.
                  r={Math.max(radiusFor(city.stations.length) * 1.5, 34)}
                  fill="transparent"
                  onPress={() => setSelected(isOn(city, selected) ? null : city)}
                />
              ))}
            </G>
          </Svg>
        </View>

        {selected ? (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <View style={styles.panelTitleWrap}>
                <AppText style={[styles.panelCity, { color: c.text }]}>
                  {selected.city}
                </AppText>
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

            {stations.map((s) => (
              <StationRow
                key={s.slug}
                station={s}
                playing={s.slug === playingSlug}
                onPress={(picked) => onPickStation(picked.slug, picked.live)}
              />
            ))}
          </View>
        ) : (
          <AppText style={[styles.hint, { color: c.textMuted }]}>
            Tap a transmitter to see what broadcasts from it.
          </AppText>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  header: { paddingHorizontal: 16 },
  title: { marginTop: 8 },
  sub: { fontSize: 12.5, marginTop: 6, marginBottom: 16 },
  mapWrap: { overflow: 'hidden' },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 26, paddingHorizontal: 32 },
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
});

export default MapScreen;
