import React, { useEffect, useRef, useState } from 'react';
import {
  DimensionValue,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/context';
import { formatDuration } from '@/utils';
import { AppText } from '../common/AppText';

interface ProgressBarProps {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

const THUMB = 14;
const TRACK_H = 4;
const HIT_H = 32; // tall, easy-to-grab touch area around the thin track

/**
 * Interactive scrubber for the Music Player. Built on PanResponder (core RN, no
 * native slider dependency) so it reliably supports both tap-to-seek and drag:
 *  - tap anywhere on the bar  → seek to that point
 *  - drag the thumb           → live preview, commit on release
 * While dragging we show the dragged value; after release we hold that value
 * until the real stream position catches up, so the thumb never snaps backward.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ position, duration, onSeek }) => {
  const theme = useTheme();

  const [seeking, setSeeking] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  // Refs so the once-created PanResponder always reads fresh values.
  const widthRef = useRef(0);
  const startXRef = useRef(0);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);
  durationRef.current = duration;
  onSeekRef.current = onSeek;

  const secondsFromX = (x: number): number => {
    const w = widthRef.current || 1;
    const ratio = Math.min(1, Math.max(0, x / w));
    const d = durationRef.current;
    return d > 0 ? ratio * d : 0;
  };

  // Once the seek lands, drop the held value so live progress resumes.
  useEffect(() => {
    if (pending == null) return undefined;
    if (Math.abs(position - pending) < 1 || position > pending) {
      setPending(null);
      return undefined;
    }
    const t = setTimeout(() => setPending(null), 1500); // safety net
    return () => clearTimeout(t);
  }, [position, pending]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const x = e.nativeEvent.locationX;
        startXRef.current = x;
        setSeeking(secondsFromX(x));
      },
      onPanResponderMove: (_e, g: PanResponderGestureState) => {
        setSeeking(secondsFromX(startXRef.current + g.dx));
      },
      onPanResponderRelease: (_e, g: PanResponderGestureState) => {
        const secs = secondsFromX(startXRef.current + g.dx);
        setSeeking(null);
        setPending(secs);
        onSeekRef.current(secs);
      },
      onPanResponderTerminate: () => setSeeking(null),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  const value = seeking ?? pending ?? position;
  const pct = duration > 0 ? Math.min(1, Math.max(0, value / duration)) : 0;
  const pctStr = `${pct * 100}%` as DimensionValue;

  return (
    <View>
      <View style={styles.hit} onLayout={onLayout} {...pan.panHandlers}>
        <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.fill, { width: pctStr, backgroundColor: theme.colors.text }]} />
        </View>
        <View
          style={[
            styles.thumb,
            { left: pctStr, backgroundColor: theme.colors.text },
            seeking != null && styles.thumbActive,
          ]}
        />
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" color="textMuted">
          {formatDuration(value)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {formatDuration(duration)}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hit: { height: HIT_H, justifyContent: 'center' },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2, overflow: 'hidden' },
  fill: { height: TRACK_H, borderRadius: TRACK_H / 2 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -THUMB / 2,
    top: (HIT_H - THUMB) / 2,
  },
  thumbActive: { transform: [{ scale: 1.25 }] },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});
