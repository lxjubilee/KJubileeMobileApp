import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import { MapCanvas } from './MapCanvas';
import { MapControls } from './MapControls';
import { useMapViewport } from './useMapViewport';
import { City, MAX_SCALE, WORLD, bandFor } from './types';

interface Props {
  selected: City | null;
  playingSlug: string | null;
  onPick: (city: City) => void;
  onClose: () => void;
  colors: React.ComponentProps<typeof MapCanvas>['colors'];
  /**
   * Open because the phone is turned, rather than because the expand button was
   * pressed.
   *
   * The difference is that this one cannot be closed from inside: turning the
   * phone back is the way out, and a close button would shut a map that the
   * next render would reopen. See `useLandscapeMap`.
   */
  landscape: boolean;
}

/**
 * The map with the screen to itself.
 *
 * The inline map is capped by geometry: an equirectangular world drawn at full
 * width is 2:1, so showing every longitude pins it to half the screen's width —
 * 196dp, a strip. That is enough to see the network but not enough to move
 * around by hand, which is what this exists for.
 *
 * An OVERLAY, not a `Modal`. Under a Modal on Android this map could be tapped
 * and zoomed by its buttons but could not be dragged at all: touches beginning
 * on the modal's content never reached the JS responder system's move phase, so
 * `onMoveShouldSetResponderCapture` was never once called — measured by logging
 * it, 15 calls from the inline map and 0 from inside the Modal for the same
 * gesture, and still 0 with the canvas set to `pointerEvents="none"`, which
 * rules out react-native-svg swallowing it. Rendered in the screen's own tree
 * the negotiation works, which is why the inline map pans at all. The cost is
 * that the tab bar stays visible below; the gain is a map you can move.
 *
 * Its viewport is its own, so expanding does not disturb where the inline map
 * was panned to, and closing does not disturb where you got to in here.
 */
export const FullscreenMap: React.FC<Props> = ({
  selected,
  playingSlug,
  onPick,
  onClose,
  colors,
  landscape,
}) => {
  const c = useTheme().colors;
  const insets = useSafeAreaInsets();
  // Measured rather than derived from the window: the usable area is whatever
  // is left inside the screen after the caption, and guessing that would put
  // the pinch anchor a few points out at the top of the map.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height }));
  };

  const band = useMemo(() => bandFor(box.w || 1, box.h || 1), [box.w, box.h]);
  /**
   * Zoom at which the world covers the whole box.
   *
   * Fitted to width the map is a band across the middle with black above and
   * below, and — the part that actually matters — nothing to drag: a world that
   * already fits has nowhere to pan to, so every attempt to move it by finger
   * does nothing at all. Opening filled means the first drag moves the map.
   */
  const fillScale = useMemo(
    () => Math.min(MAX_SCALE, Math.max(1, band.h / WORLD.height)),
    [band],
  );
  const map = useMapViewport(band, box.w || 1, box.h || 1, fillScale);

  // The first render cannot know the box, so the opening viewport is computed
  // against a placeholder band. Recompute it once the real measurement lands.
  const { reset } = map;
  useEffect(() => {
    if (box.w > 0) reset();
  }, [box.w, box.h, reset]);

  // Back closes the map rather than leaving the tab — a Modal gave this for
  // free through onRequestClose; an overlay has to ask for it.
  //
  // Not while the phone is turned: closing would not close anything, and
  // swallowing back on top of that would leave landscape with no way out at all
  // except rotating. Left alone, back does its usual thing — off the tab, which
  // blurs the screen, which locks portrait again.
  useEffect(() => {
    if (landscape) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [landscape, onClose]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View
        style={styles.stage}
        onLayout={onLayout}
        ref={map.mapRef}
        collapsable={false}
        {...map.panHandlers}
      >
        {box.w > 0 ? (
          <MapCanvas
            world={WORLD}
            width={box.w}
            height={box.h}
            band={band}
            view={map.view}
            selected={selected}
            playingSlug={playingSlug}
            onPick={onPick}
            colors={colors}
          />
        ) : null}
      </View>

      <MapControls
        // The overlay is absolutely positioned inside the screen's SafeAreaView,
        // and an absolute child lays out against the border box — so it covers
        // the status bar rather than starting below it, and these have to be
        // pushed clear by hand. Turned, the cutout is down one SIDE instead,
        // which `Screen` does not inset either.
        top={insets.top + 10}
        right={insets.right + 10}
        actions={[
          { icon: 'remove', onPress: map.zoomOut, label: 'Zoom out' },
          { icon: 'add', onPress: map.zoomIn, label: 'Zoom in' },
          { icon: 'refresh', onPress: map.reset, label: 'Reset the map' },
          // See `landscape`: there is nothing for close to do while the phone
          // is turned, so it is not offered.
          ...(landscape
            ? []
            : [{ icon: 'close' as const, onPress: onClose, label: 'Close the map' }]),
        ]}
      />

      {/* Turned, the caption floats over the map rather than taking a strip off
          the bottom of it: landscape is short, and every point of height spent
          on a line of text is height the map does not get. `pointerEvents` is
          off so the pill is not a hole in the gesture surface — a drag that
          starts on it still moves the map underneath. */}
      {landscape ? (
        <View
          pointerEvents="none"
          style={[
            styles.captionFloatWrap,
            { bottom: insets.bottom + 10, left: insets.left + 10, right: insets.right + 10 },
          ]}
        >
          <View
            style={[
              styles.captionFloat,
              { backgroundColor: c.backgroundElevated, borderColor: c.border },
            ]}
          >
            <AppText numberOfLines={1} style={[styles.captionText, { color: c.textMuted }]}>
              {selected
                ? `${selected.city} · ${selected.region}`
                : 'Drag to move the map, pinch to zoom. Turn the phone back to leave it.'}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.caption}>
          <AppText style={[styles.captionText, { color: c.textMuted }]}>
            {selected
              ? `${selected.city} · ${selected.region}`
              : 'Drag to move the map, pinch to zoom. Tap a transmitter to select it.'}
          </AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // `elevation` as well as `zIndex`: on Android the two orderings are separate,
  // and without it the list below can paint over the map.
  root: { ...StyleSheet.absoluteFillObject, zIndex: 30, elevation: 30 },
  // The whole area is the gesture surface, not just the drawn map, so a drag
  // that starts on empty ocean still moves it.
  stage: { flex: 1, justifyContent: 'center' },
  caption: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12 },
  // Two views, so the pill hugs its text: an absolute box takes its width from
  // left/right, and one stretched across the screen would be a bar rather than
  // a caption.
  captionFloatWrap: { position: 'absolute', alignItems: 'center' },
  captionFloat: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  captionText: { fontSize: 12.5, textAlign: 'center' },
});
