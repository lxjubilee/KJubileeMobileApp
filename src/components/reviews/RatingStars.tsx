import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/common';
import { formatCount } from '@/utils';
import { reviewsApi } from '@/services/reviews';
import type { MyReview, RatingDistribution, ReviewSummary, ReviewTargetType } from '@/types';
import { RATING_GOLD, StarRating, starRowMetrics, type StarSize } from './StarRating';

/**
 * Shared "double-duty" rating widget. Before a touch it shows the community
 * AVERAGE as a gold fractional readout; the moment a finger lands it flips to an
 * accent-blue whole-star INPUT that follows the finger, and on release commits
 * the rating inline (star-only upsert) with an optimistic update. The two states
 * never look alike (gold fraction + number vs. accent whole stars + label), which
 * is what kills the "is this a readout or an input?" ambiguity.
 *
 * It only handles the star score — written reviews (title/body) still go through
 * `ReviewComposer`, reached via a separate affordance on the host card.
 */

interface Props {
  summary: ReviewSummary | null;
  type: ReviewTargetType;
  /** Backend uuid. When absent the widget is display-only (no input). */
  targetId?: string;
  size?: StarSize;
  /** Push a fresh (optimistic, then authoritative) summary to the owner. */
  onApplySummary: (s: ReviewSummary) => void;
  disabled?: boolean;
  /**
   * Compact variant (default for `sm`): just stars + an inline count, no label
   * or secondary-average lines — for dense rows like the per-song track list.
   */
  compact?: boolean;
}

type Phase = 'idle' | 'dragging' | 'committing';

const EMPTY_DIST: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/** Local summary reflecting the just-made rating, shown before the round-trip. */
function optimisticSummary(
  prev: ReviewSummary | null,
  type: ReviewTargetType,
  targetId: string,
  stars: number,
): ReviewSummary {
  const dist: RatingDistribution = { ...EMPTY_DIST, ...(prev?.distribution ?? {}) };
  const bump = (k: number, delta: number) => {
    if (k >= 1 && k <= 5) {
      const key = k as 1 | 2 | 3 | 4 | 5;
      dist[key] = Math.max(0, dist[key] + delta);
    }
  };
  bump(prev?.mine?.stars ?? 0, -1); // remove the old rating if editing
  bump(stars, +1);
  const total = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
  const sum = dist[1] + dist[2] * 2 + dist[3] * 3 + dist[4] * 4 + dist[5] * 5;
  const mine: MyReview = prev?.mine
    ? { ...prev.mine, stars, edited: true }
    : {
        id: 'optimistic',
        stars,
        title: null,
        body: null,
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
        edited: false,
      };
  return {
    targetType: type,
    targetId,
    average: total > 0 ? sum / total : null,
    ratingCount: (prev?.ratingCount ?? 0) + (prev?.mine ? 0 : 1),
    reviewCount: prev?.reviewCount ?? 0,
    distribution: dist,
    mine,
  };
}

export const RatingStars: React.FC<Props> = ({
  summary,
  type,
  targetId,
  size = 'md',
  onApplySummary,
  disabled,
  compact,
}) => {
  const { t } = useTranslation();
  const isCompact = compact ?? size === 'sm';

  const average = summary?.average ?? null;
  const count = summary?.ratingCount ?? 0;
  const mine = summary?.mine ?? null;
  const interactive = !disabled && !!targetId;

  const { px, gap, rowWidth } = starRowMetrics(size);
  const widthRef = useRef(rowWidth);

  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState(0);
  const [committedStars, setCommittedStars] = useState(0);
  const committingRef = useRef(false);

  const confirmAnim = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => active && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) widthRef.current = w;
  };

  // Map a touch X within the row to a whole star 1..5. ceil() assigns each star
  // plus its trailing gap to that star, so the fill tracks the finger naturally.
  const starFromX = (x: number): number => {
    const w = widthRef.current || rowWidth;
    const slot = px + gap;
    const clamped = Math.max(0, Math.min(w, x));
    return Math.max(1, Math.min(5, Math.ceil(clamped / slot)));
  };

  const flashConfirm = () => {
    confirmAnim.setValue(0);
    if (reduceMotion) {
      confirmAnim.setValue(1);
      Animated.timing(confirmAnim, { toValue: 0, delay: 1100, duration: 1, useNativeDriver: true }).start();
      return;
    }
    Animated.sequence([
      Animated.timing(confirmAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(confirmAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  };

  const commit = (stars: number) => {
    if (!interactive || !targetId || committingRef.current) return;
    committingRef.current = true;
    const prev = summary;
    setCommittedStars(stars);
    setPhase('committing');
    flashConfirm();
    onApplySummary(optimisticSummary(prev, type, targetId, stars));
    // Preserve any existing written review's text — a star-only upsert must not
    // wipe the user's title/body.
    reviewsApi
      .upsert(type, targetId, { stars, title: prev?.mine?.title, body: prev?.mine?.body })
      // Always carry the authoritative review as `mine` — the upsert summary may
      // not populate it, and a null `mine` would open the composer with 0 stars.
      .then((res) => onApplySummary({ ...res.summary, mine: res.review }))
      .catch(() => {
        if (prev) onApplySummary(prev);
      })
      .finally(() => {
        committingRef.current = false;
        setPhase('idle');
      });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-8, 8])
    .onBegin((e) => {
      setPhase('dragging');
      setPreview(starFromX(e.x));
    })
    .onUpdate((e) => setPreview(starFromX(e.x)))
    .onEnd((e) => commit(starFromX(e.x)))
    .onFinalize(() => {
      if (!committingRef.current) setPhase('idle');
    });

  const tap = Gesture.Tap()
    .maxDuration(300)
    .onEnd((e) => commit(starFromX(e.x)));

  const gesture = Gesture.Exclusive(pan, tap);

  // Stars are always rating-gold — the community average as a fractional fill and
  // the user's own rating as whole stars. The readout/input distinction is carried
  // by whole-vs-fractional fill + the label swap, not by colour.
  const rated = !!mine;
  const showInput = phase !== 'idle' || rated;
  const starsValue =
    phase === 'dragging' ? preview
    : phase === 'committing' ? committedStars
    : rated ? mine!.stars
    : average ?? 0;
  const starsColor = RATING_GOLD;

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const base = mine?.stars ?? Math.round(average ?? 0);
    if (e.nativeEvent.actionName === 'increment') commit(Math.min(5, base + 1));
    else if (e.nativeEvent.actionName === 'decrement') commit(Math.max(1, base - 1));
  };

  const a11yLabel = rated
    ? t('reviews.yourRating') + ` ${mine!.stars}/5`
    : average != null
      ? t('reviews.communityRating') + ` ${average.toFixed(1)}/5 · ${formatCount(count)}`
      : t('reviews.noRatingsYet');

  const starRow = (
    <View
      onLayout={onLayout}
      style={{ width: rowWidth, height: px }}
      accessible
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityLabel={a11yLabel}
      accessibilityValue={interactive ? { min: 1, max: 5, now: mine?.stars ?? Math.round(average ?? 0) } : undefined}
      accessibilityActions={interactive ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={interactive ? onAccessibilityAction : undefined}
    >
      <StarRating value={starsValue} size={size} color={starsColor} />
    </View>
  );

  if (isCompact) {
    return (
      <View style={styles.compactRow}>
        {interactive ? <GestureDetector gesture={gesture}>{starRow}</GestureDetector> : starRow}
        <AppText variant="caption" color={showInput ? 'accent' : 'textMuted'} style={styles.compactCount}>
          ({formatCount(count)})
        </AppText>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.mainRow}>
        {interactive ? <GestureDetector gesture={gesture}>{starRow}</GestureDetector> : starRow}

        {phase === 'committing' ? (
          <Animated.View style={[styles.readout, { opacity: confirmAnim }]}>
            <AppText variant="bodySm" color="accent" numberOfLines={1}>
              {t('reviews.ratedConfirm', { stars: '★'.repeat(committedStars) })}
            </AppText>
          </Animated.View>
        ) : !rated && phase === 'idle' ? (
          <View style={styles.readout}>
            {average != null ? (
              <>
                <AppText variant="h3">{average.toFixed(1)}</AppText>
                <AppText variant="bodySm" color="textMuted" style={styles.count} numberOfLines={1}>
                  {t('reviews.basedOn', { count: formatCount(count) })}
                </AppText>
              </>
            ) : (
              <AppText variant="bodySm" color="textMuted" numberOfLines={1}>
                {t('reviews.noRatingsYet')}
              </AppText>
            )}
          </View>
        ) : rated && phase === 'idle' ? (
          <View style={styles.readout}>
            <AppText variant="caption" color="accent">
              {t('reviews.yourRating')}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {'  ·  ' + t('reviews.tapToChange')}
            </AppText>
          </View>
        ) : null}
      </View>

      {!(rated && phase === 'idle') ? (
        <View style={styles.labelRow}>
          <AppText variant="caption" color={showInput ? 'accent' : 'textMuted'}>
            {showInput ? t('reviews.yourRating') : t('reviews.communityRating')}
          </AppText>
        </View>
      ) : null}

      {rated && phase === 'idle' && average != null ? (
        <AppText variant="caption" color="textMuted" style={styles.secondary}>
          {t('reviews.averageSecondary', { avg: average.toFixed(1), count: formatCount(count) })}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  compactRow: { flexDirection: 'row', alignItems: 'center' },
  compactCount: { marginLeft: 4 },
  mainRow: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  readout: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
  count: { flex: 1, marginLeft: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  secondary: { marginTop: 2 },
});
