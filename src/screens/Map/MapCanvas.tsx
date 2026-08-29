import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { City, Viewport, World } from './types';
import { GRATICULE, VIEW_H, VIEW_TOP, radiusFor } from './types';
import { PulsingHalos } from './PulsingHalos';

interface Props {
  world: World;
  width: number;
  height: number;
  view: Viewport;
  selected: City | null;
  playingSlug: string | null;
  onPick: (city: City) => void;
  colors: {
    surface: string;
    border: string;
    accent: string;
    danger: string;
    text: string;
  };
}

/**
 * The site's per-tower breathing halo, OFF.
 *
 * MEASURED, not guessed. With it on, this screen rendered 244 frames in six
 * idle seconds at a 97ms 50th percentile and 113 missed vsyncs; GPU time was
 * 5ms, so the cost is entirely JS driving 72 SVG opacity props every frame.
 * The site gets the same effect free because CSS animation runs off the main
 * thread — react-native-svg has no native driver for `opacity`, so there is no
 * equivalent here. Idle, the map should render no frames at all.
 *
 * PulsingHalos is kept, and correct: it carries the site's own FNV-1a seeding
 * so each city keeps its rhythm. Turn this on if the screen ever moves to
 * react-native-reanimated, where the loop can leave the JS thread.
 */
const PULSE_HALOS = false;

const isOn = (city: City, sel: City | null) =>
  sel != null && sel.city === city.city && sel.cc === city.cc;

const carries = (city: City, playingSlug: string | null) =>
  playingSlug != null && city.stations.includes(playingSlug);

/**
 * The map itself, split out and memoised.
 *
 * The screen around it re-renders on every keystroke in the location search,
 * and this subtree is ~1,700 SVG nodes: 177 country paths and three passes over
 * 347 towers. Keeping it behind `React.memo` with stable props means typing
 * touches the list and nothing else.
 *
 * Pan and zoom are a transform on ONE group rather than a new viewBox, for the
 * same reason: the children are referentially stable across a drag, so React
 * reconciles a single changed prop instead of rebuilding the world.
 */
const MapCanvasInner: React.FC<Props> = ({
  world,
  width,
  height,
  view,
  selected,
  playingSlug,
  onPick,
  colors,
}) => {
  // Fixed at mount: which cities breathe must not change with pan, zoom or
  // selection, or the animations restart mid-drag.
  const pulsing = React.useMemo(
    () => world.cities.filter((city) => city.stations.length > 0),
    [world],
  );

  return (
  <Svg width={width} height={height} viewBox={`0 ${VIEW_TOP} ${world.width} ${VIEW_H}`}>
    <G transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
      {/* Lat/lon every 20 degrees, under the land as the site draws it — it
          gives the projection a frame without competing with the markers. */}
      <Path
        d={GRATICULE}
        stroke={colors.border}
        strokeWidth={0.6 / view.scale}
        fill="none"
        opacity={0.5}
      />
      <G>
        {world.countries.map((country) => (
          <Path
            // Name, not id: Natural Earth gives no ISO code to disputed
            // territories (Kosovo, N. Cyprus, Somaliland), so three countries
            // share an empty id. Names are unique.
            key={country.name}
            d={country.d}
            fill={colors.surface}
            stroke={colors.border}
            strokeWidth={1 / view.scale}
          />
        ))}
      </G>

      {/* A MARKER NEVER CHANGES SIZE WITH THE MAP. Every radius is divided by
          the zoom, so a tower is the same few pixels across whether the world
          is at 1x or 8x — the site takes the same view, and the alternative is
          dots that swell into blobs the moment anyone zooms in. Sacramento's
          emphasis is a ratio, so it stays emphasised by the same ratio at every
          zoom.

          Three ordered passes, not one per city. Cities are sorted so the
          busiest are drawn LAST, and with a halo drawn immediately before each
          dot every later city's halo painted over the earlier dots — in the
          dense US cluster that covered Los Angeles entirely and swallowed its
          touches. Halos first, then dots, then a transparent hit layer on top
          means nothing can ever occlude a target.

          Halos only where a station actually broadcasts. Glowing all 347 turned
          the dense regions into a single wash and cost 347 extra nodes to say
          nothing; the 72 carrying stations are what the glow ever distinguished. */}
      {PULSE_HALOS ? (
        <PulsingHalos cities={pulsing} scale={view.scale} color={colors.accent} />
      ) : (
        <G>
          {pulsing.map((city) => (
            <Circle
              key={`halo:${city.city}|${city.cc}`}
              cx={city.x}
              cy={city.y}
              r={(radiusFor(city) * 1.9) / view.scale}
              fill={carries(city, playingSlug) ? colors.danger : colors.accent}
              opacity={isOn(city, selected) ? 0.3 : 0.12}
            />
          ))}
        </G>
      )}

      {/* The selection ring's own halo, drawn separately: the pulsing set is
          fixed at mount so it cannot depend on what is selected, and a relay
          with no stations still deserves a mark when you tap it. */}
      {selected && selected.stations.length === 0 ? (
        <Circle
          cx={selected.x}
          cy={selected.y}
          r={(radiusFor(selected) * 1.9) / view.scale}
          fill={colors.accent}
          opacity={0.3}
        />
      ) : null}

      <G>
        {world.cities.map((city) => {
          const on = isOn(city, selected);
          return (
            <Circle
              key={`dot:${city.city}|${city.cc}`}
              cx={city.x}
              cy={city.y}
              r={radiusFor(city) / view.scale}
              fill={carries(city, playingSlug) ? colors.danger : colors.accent}
              opacity={on ? 1 : city.stations.length ? 0.85 : 0.5}
              stroke={on ? colors.text : 'none'}
              strokeWidth={on ? 4 / view.scale : 0}
            />
          );
        })}
      </G>

      <G>
        {world.cities.map((city) => (
          <Circle
            key={`hit:${city.city}|${city.cc}`}
            cx={city.x}
            cy={city.y}
            // A generous minimum, because the smallest dot is a few device
            // pixels and untappable on its own — but it shrinks as the map is
            // zoomed, or the targets would stay glued together at every scale.
            // Cities are ordered busiest-last, so where two still overlap the
            // one carrying more stations is on top and wins the tap.
            r={Math.max(radiusFor(city) * 1.6, 20) / view.scale}
            fill="transparent"
            onPress={() => onPick(city)}
          />
        ))}
      </G>
    </G>
  </Svg>
  );
};

export const MapCanvas = React.memo(MapCanvasInner);
