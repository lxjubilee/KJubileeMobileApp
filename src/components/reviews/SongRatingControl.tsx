import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText } from '@/components/common';
import type { ReviewSummary, ReviewTargetType } from '@/types';
import { RatingStars } from './RatingStars';

/**
 * Compact per-song rating for the album track list. The tiny stars are the
 * shared `RatingStars` input (tap/drag to rate inline), and the small pill opens
 * the composer for a written review. Its own Pressable, so tapping the pill never
 * triggers the row.
 */

interface Props {
  summary: ReviewSummary | null | undefined;
  /** Backend uuid for the song. When absent the stars are display-only. */
  targetId?: string;
  onApplySummary: (s: ReviewSummary) => void;
  onRate: () => void;
}

export const SongRatingControl: React.FC<Props> = ({ summary, targetId, onApplySummary, onRate }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const rated = !!summary?.mine;
  const type: ReviewTargetType = 'song';

  return (
    <View style={styles.wrap}>
      <RatingStars
        summary={summary ?? null}
        type={type}
        targetId={targetId}
        size="sm"
        onApplySummary={onApplySummary}
      />
      <Pressable
        onPress={onRate}
        hitSlop={8}
        style={[
          styles.rate,
          {
            borderColor: rated ? theme.colors.accent : theme.colors.border,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <AppText variant="caption" color={rated ? 'accent' : 'textSecondary'}>
          {rated ? t('reviews.editReview') : t('reviews.writeReview')}
        </AppText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  rate: { marginLeft: 8, borderWidth: 1, paddingVertical: 3, paddingHorizontal: 10 },
});
