import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText } from '@/components/common';
import type { ReviewSummary, ReviewTargetType } from '@/types';
import { RatingStars } from './RatingStars';

/**
 * Album-page rating summary. The stars themselves are the rating input (the
 * shared `RatingStars` widget: gold average readout → accent-blue tap/drag to
 * rate), so this card owns only the aggregate display + a "Write a review" entry
 * (which opens the full composer for title/body) and the link to all reviews.
 */

interface Props {
  summary: ReviewSummary | null;
  /** Backend uuid the rating targets (album uuid). */
  targetId?: string;
  type?: ReviewTargetType;
  /** Push a fresh summary up after an inline rating. */
  onApplySummary: (s: ReviewSummary) => void;
  /** Opens the composer for a written review (title + body). */
  onRate: () => void;
  /** When omitted (e.g. on the reviews screen itself), the "see all" link is hidden. */
  onSeeAll?: () => void;
}

export const AlbumRatingSummary: React.FC<Props> = ({
  summary,
  targetId,
  type = 'album',
  onApplySummary,
  onRate,
  onSeeAll,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const reviewCount = summary?.reviewCount ?? 0;
  const rated = !!summary?.mine;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }]}>
      <RatingStars
        summary={summary}
        type={type}
        targetId={targetId}
        size="md"
        onApplySummary={onApplySummary}
      />

      <View style={styles.actions}>
        <Pressable
          onPress={onRate}
          style={[styles.rateBtn, { backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill }]}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" style={styles.rateIcon} />
          <AppText variant="label" style={{ color: '#FFFFFF' }}>
            {rated ? t('reviews.editReview') : t('reviews.writeReview')}
          </AppText>
        </Pressable>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAll}>
            <AppText variant="label" color="accent">
              {reviewCount > 0
                ? t('reviews.seeAllReviewsCount', { count: reviewCount })
                : t('reviews.seeAllReviews')}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  rateBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18 },
  rateIcon: { marginRight: 6 },
  seeAll: { flexDirection: 'row', alignItems: 'center' },
});
