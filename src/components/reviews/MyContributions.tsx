import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText } from '@/components/common';
import { formatCount, logger } from '@/utils';
import type { MyReviewRow, ReviewContributions } from '@/types';
import { reviewsApi } from '@/services/reviews';
import type { ApiError } from '@/services/api';
import { StarRating } from './StarRating';

/**
 * "My Contributions" profile section (RN port of the web `MyContributions`).
 * Shows the signed-in user's rating/review activity (stat cards) plus a list of
 * their own reviews. Fetched from `/api/reviews/me/*` via authClient.
 */

/** Brand yellow, matching the profile avatars and splash mark. */
const CONTRIBUTION_YELLOW = '#ffbd59';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
/** "July 2026" — formatted manually to avoid Intl gaps on Hermes. */
const reviewDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const MyContributions: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [stats, setStats] = useState<ReviewContributions | null>(null);
  const [reviews, setReviews] = useState<MyReviewRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([reviewsApi.getContributions(), reviewsApi.getMyReviews()])
      .then(([c, r]) => {
        if (!active) return;
        setStats(c);
        setReviews(r);
      })
      .catch((e: ApiError) => logger.warn('contributions failed', e?.message))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const cards: Array<{ label: string; value: number }> = stats
    ? [
        { label: t('contributions.albumsRated'), value: stats.albumsRated },
        { label: t('contributions.songsRated'), value: stats.songsRated },
        { label: t('contributions.reviewsWritten'), value: stats.reviewsWritten },
        { label: t('contributions.helpfulReceived'), value: stats.helpfulReceived },
        { label: t('contributions.total'), value: stats.totalContributions },
      ]
    : [];

  return (
    <View style={styles.section}>
      <AppText variant="h2" style={styles.heading}>
        {t('contributions.title')}
      </AppText>

      {!ready ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
      ) : (
        <>
          <View style={styles.cards}>
            {cards.map((c) => (
              <View
                key={c.label}
                style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
              >
                <AppText variant="h1" style={styles.cardValue}>
                  {formatCount(c.value)}
                </AppText>
                <AppText variant="bodySm" color="textMuted" style={styles.cardLbl}>
                  {c.label}
                </AppText>
              </View>
            ))}
          </View>

          <AppText variant="h3" style={styles.subHeading}>
            {t('contributions.yourReviews')}
          </AppText>
          {reviews.length === 0 ? (
            <AppText variant="bodySm" color="textMuted">
              {t('contributions.empty')}
            </AppText>
          ) : (
            // Bounded, independently-scrollable list so the reviews get their own
            // scrollbar instead of stretching the whole profile page. nestedScroll
            // lets it scroll within the outer page ScrollView on Android.
            <ScrollView
              style={styles.reviewList}
              contentContainerStyle={styles.reviewListContent}
              showsVerticalScrollIndicator
              indicatorStyle="white"
              nestedScrollEnabled
            >
              {reviews.map((r) => (
                <ReviewRow key={r.id} review={r} />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

const ReviewRow: React.FC<{ review: MyReviewRow }> = ({ review }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const date = reviewDate(review.createdAt);
  const published = review.status === 'published';
  const statusKey = `contributions.status_${review.status}`;
  const statusLabel = t(statusKey);
  return (
    <View style={[styles.review, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}>
      <View style={styles.reviewHead}>
        <StarRating value={review.stars} size="sm" />
        {review.title ? (
          <AppText variant="label" style={styles.reviewTitle} numberOfLines={1}>
            {review.title}
          </AppText>
        ) : null}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: published ? `${theme.colors.success}22` : theme.colors.backgroundElevated,
              borderColor: published ? theme.colors.success : theme.colors.border,
            },
          ]}
        >
          <AppText variant="caption" style={{ color: published ? theme.colors.success : theme.colors.textMuted }}>
            {statusLabel === statusKey ? review.status : statusLabel}
          </AppText>
        </View>
      </View>

      {review.body ? (
        <AppText variant="bodySm" color="textSecondary" style={styles.reviewBody}>
          {review.body}
        </AppText>
      ) : null}

      <View style={styles.reviewMeta}>
        <View
          style={[
            styles.typePill,
            { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: theme.colors.border },
          ]}
        >
          <AppText variant="caption" color="textSecondary">
            {t(`contributions.target_${review.targetType}`)}
          </AppText>
        </View>
        {date ? (
          <AppText variant="caption" color="textMuted" style={styles.metaText}>
            · {date}
          </AppText>
        ) : null}
        {review.helpfulCount > 0 ? (
          <AppText variant="caption" color="textMuted" style={styles.metaText}>
            · 👍 {review.helpfulCount}
          </AppText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 28 },
  heading: { marginBottom: 12 },
  spinner: { marginVertical: 16, alignSelf: 'flex-start' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { flexGrow: 1, flexBasis: '30%', minWidth: 100, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center' },
  cardValue: { color: CONTRIBUTION_YELLOW },
  cardLbl: { marginTop: 4, textAlign: 'center' },
  subHeading: { marginTop: 24, marginBottom: 10 },
  // Cap the reviews list height (~3 cards) so it scrolls on its own with a
  // visible scrollbar; paddingRight keeps rows clear of the indicator.
  reviewList: { maxHeight: 420 },
  reviewListContent: { paddingRight: 4 },
  review: { padding: 14, marginBottom: 10 },
  reviewHead: { flexDirection: 'row', alignItems: 'center' },
  reviewTitle: { flex: 1, marginLeft: 8 },
  // `marginLeft: 'auto'` keeps the status pill pinned to the right edge even when
  // a review has no title (nothing else fills the row).
  statusPill: { marginLeft: 'auto', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  reviewBody: { marginTop: 8 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  typePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  metaText: { marginLeft: 6 },
});
