import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import {
  Band,
  City,
  HOME_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  Viewport,
  WORLD,
  ZOOM_STEP,
} from './types';

/**
 * Hold one axis of the world over the visible window.
 *
 * A world point `p` lands at `t + p * scale`, and the window runs from `origin`
 * to `origin + span`. Covering it means `t <= origin` and
 * `t + worldSpan * scale >= origin + span`, which is the [lo, hi] below. When
 * the world is the SMALLER of the two — the fullscreen map at base zoom, where
 * the window is taller than the sphere — the range inverts, and the only
 * sensible answer is to centre it rather than clamp to a bound that cannot be
 * met.
 */
const fitAxis = (
  origin: number,
  span: number,
  worldSpan: number,
  t: number,
  scale: number,
): number => {
  const lo = origin + span - worldSpan * scale;
  const hi = origin;
  return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, t));
};

export interface MapViewport {
  view: Viewport;
  /** Spread onto the View wrapping the canvas. */
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  /** Must be attached to that same View — a pinch is anchored off its position. */
  mapRef: React.RefObject<View | null>;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  /** Centre the map on a city, zooming in far enough to read it. */
  centreOn: (city: City) => void;
  /**
   * True from the moment a drag or pinch is claimed until every finger lifts.
   *
   * The inline map lives inside a SectionList header, and on Android the native
   * scroll view will happily run away with the second finger of a pinch mid
   * gesture — `onPanResponderTerminationRequest` is a JS-side answer to a
   * question the native scroller never asks. Binding the list's `scrollEnabled`
   * to this is what actually keeps a two-finger zoom on the map.
   */
  gesturing: boolean;
}

/** The world centred in `band` at `scale`, before clamping. */
const centred = (band: Band, scale: number): Viewport => ({
  scale,
  tx: band.x + band.w / 2 - (WORLD.width / 2) * scale,
  ty: band.y + band.h / 2 - (WORLD.height / 2) * scale,
});

/**
 * Pan, pinch and zoom over a `band` of the world drawn into a `boxW x boxH` box.
 *
 * Owns the viewport so the inline map and the fullscreen map can each keep their
 * own — expanding the map should not throw away where you had panned to, and
 * neither should closing it.
 */
export function useMapViewport(
  band: Band,
  boxW: number,
  boxH: number,
  /**
   * Zoom the map opens and resets to.
   *
   * 1 fits the whole world to the box, which is right for the inline overview.
   * The fullscreen map passes the scale that FILLS its box instead: a 2:1 world
   * fitted to a portrait screen's width leaves most of the screen empty, and —
   * worse — leaves nothing to drag, because a map that already fits has nowhere
   * to pan. Landing filled is what makes it a map you can move.
   */
  initialScale: number = MIN_SCALE,
): MapViewport {
  const [view, setView] = useState<Viewport>(HOME_VIEW);
  const [gesturing, setGesturing] = useState(false);

  /** Keep the map from being dragged off its own edges, at any scale. */
  const clamp = useCallback(
    (v: Viewport): Viewport => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
      return {
        scale,
        tx: fitAxis(band.x, band.w, WORLD.width, v.tx, scale),
        ty: fitAxis(band.y, band.h, WORLD.height, v.ty, scale),
      };
    },
    [band],
  );

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

  /** Zoom about the middle of the window, so what you are looking at stays put. */
  const zoomBy = useCallback(
    (factor: number) =>
      setView((v) => zoomAbout(v, v.scale * factor, band.x + band.w / 2, band.y + band.h / 2)),
    [band, zoomAbout],
  );

  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP), [zoomBy]);
  /**
   * Back to the opening view.
   *
   * Also run when the box is first measured: the fullscreen map cannot know its
   * own size on the first render, so its initial viewport is computed against a
   * placeholder band and has to be recomputed once the real one arrives.
   */
  const reset = useCallback(
    () => setView(clamp(centred(band, initialScale))),
    [band, clamp, initialScale],
  );

  const centreOn = useCallback(
    (city: City) =>
      setView((v) => {
        const scale = Math.max(v.scale, 4);
        return clamp({
          scale,
          tx: band.x + band.w / 2 - city.x * scale,
          ty: band.y + band.h / 2 - city.y * scale,
        });
      }),
    [band, clamp],
  );

  const viewRef = useRef(view);
  viewRef.current = view;
  /**
   * Where the current one-finger drag started: the gesture's own (dx, dy) at
   * that moment, and the viewport it is measured from.
   *
   * Re-anchored rather than captured once at grant. A gesture does not stay one
   * kind of gesture: pinch with two fingers, lift one, keep dragging, and the
   * cumulative dx/dy carries the whole pinch inside it. Measuring that against
   * the pre-pinch viewport threw the map back to where it had been before the
   * zoom and panned from there — a hard jump, mid-drag, exactly when someone is
   * trying to move the map by hand.
   */
  const panFrom = useRef<{ dx: number; dy: number; view: Viewport } | null>(null);
  /** The map's position on screen, so a pinch can be anchored where the fingers are. */
  const mapBox = useRef({ x: 0, y: 0 });
  const mapRef = useRef<View | null>(null);
  /** Set on the first two-finger frame and cleared when a finger lifts. */
  const pinch = useRef<{ dist: number; view: Viewport; vx: number; vy: number } | null>(null);

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
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          panFrom.current = null;
          pinch.current = null;
          setGesturing(true);
          mapRef.current?.measureInWindow((x, y) => {
            mapBox.current = { x, y };
          });
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;

          if (touches.length >= 2) {
            const [a, b] = touches;
            const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            // A drag cannot be resumed across a pinch — see `panFrom`.
            panFrom.current = null;
            if (!pinch.current) {
              // Anchor on the midpoint between the fingers, converted from page
              // pixels into viewBox units.
              const mx = (a.pageX + b.pageX) / 2 - mapBox.current.x;
              const my = (a.pageY + b.pageY) / 2 - mapBox.current.y;
              pinch.current = {
                dist,
                view: viewRef.current,
                vx: band.x + mx * (band.w / boxW),
                vy: band.y + my * (band.h / boxH),
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
          if (!panFrom.current) {
            panFrom.current = { dx: g.dx, dy: g.dy, view: viewRef.current };
            return;
          }
          const from = panFrom.current;
          // Gesture deltas are in layout units; the transform is in viewBox units.
          const k = band.w / boxW;
          setView(
            clamp({
              scale: from.view.scale,
              tx: from.view.tx + (g.dx - from.dx) * k,
              ty: from.view.ty + (g.dy - from.dy) * k,
            }),
          );
        },
        onPanResponderRelease: () => {
          pinch.current = null;
          panFrom.current = null;
          setGesturing(false);
        },
        onPanResponderTerminate: () => {
          pinch.current = null;
          panFrom.current = null;
          setGesturing(false);
        },
      }),
    [band, boxH, boxW, clamp, zoomAbout],
  );

  return {
    view,
    panHandlers: pan.panHandlers,
    mapRef,
    zoomIn,
    zoomOut,
    reset,
    centreOn,
    gesturing,
  };
}
