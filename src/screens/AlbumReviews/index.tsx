import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText, IconButton, Screen } from '@/components/common';
import { AlbumRatingSummary, ReviewComposer, ReviewItem, StarRating } from '@/components/reviews';
import { useReviews } from '@/hooks';
import { reviewsApi } from '@/services/reviews';
import { albumUuid } from '@/services/playlists';
import type { RatingDistribution, ReviewListItem, ReviewSort } from '@/types';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const PAGE_SIZE = 10;
const SORTS: ReviewSort[] = ['recent', 'highest', 'lowest'];

/** Distribution bars (5★ → 1★) shown in the reviews header. */
const DistributionBars: React.FC<{ distribution: RatingDistribution; total: number }> = ({
  distribution,
  total,
}) => {
  const theme = useTheme();
  return (
    <View style={styles.dist}>
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const pct = total > 0 ? Math.round((distribution[star] / total) * 100) : 0;
        return (
          <View key={star} style={styles.distRow}>
            <AppText variant="caption" color="textMuted" style={styles.distStar}>
              {star}
            </AppText>
            <View style={[styles.distTrack, { backgroundColor: theme.colors.surface }]}>
              <View
                style={[styles.distFill, { width: `${pct}%`, backgroundColor: theme.colors.accent }]}
              />
            </View>
            <AppText variant="caption" color="textMuted" style={styles.distPct}>
              {pct}%
            </AppText>
          </View>
        );
      })}
    </View>
  );
};

export const AlbumReviewsScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'AlbumReviews'>['route']>();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { t } = useTranslation();

  // The reviews API keys albums by the backend's deterministic uuid; the route
  // carries the catalog code, so convert it here (see songId.ts / albumUuid).
  const type = 'album' as const;
  const id = useMemo(() => albumUuid(params.albumId), [params.albumId]);

  const { summary, applySummary } = useReviews(type, id);
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [items, setItems] = useState<ReviewListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadPage = useCallback(
    (nextPage: number, replace: boolean) => {
      const setBusy = replace ? setLoading : setLoadingMore;
      setBusy(true);
      reviewsApi
        .listReviews({ type, id }, { sort, page: nextPage, limit: PAGE_SIZE })
        .then((res) => {
          setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
          setPage(res.page);
          setHasMore(res.hasMore);
        })
        .catch(() => undefined)
        .finally(() => setBusy(false));
    },
    [type, id, sort],
  );

  // Reload the first page whenever the target or sort changes.
  useEffect(() => {
    loadPage(1, true);
  }, [loadPage]);

  const onEndReached = () => {
    if (hasMore && !loadingMore && !loading) loadPage(page + 1, false);
  };

  const header = (
    <View>
      <AlbumRatingSummary
        summary={summary}
        type={type}
        targetId={id}
        onApplySummary={applySummary}
        onRate={() => setComposerOpen(true)}
      />
      {summary && summary.ratingCount > 0 ? (
        <DistributionBars distribution={summary.distribution} total={summary.ratingCount} />
      ) : null}

      <View style={styles.sortRow}>
        {SORTS.map((s) => {
          const active = s === sort;
          return (
            <Pressable
              key={s}
              onPress={() => setSort(s)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                  borderRadius: theme.radius.pill,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: active ? '#FFFFFF' : theme.colors.textSecondary }}>
                {t(`reviews.sort_${s}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
        <AppText variant="h2" numberOfLines={1} style={styles.topTitle}>
          {t('reviews.screenTitle')}
        </AppText>
      </View>
      <AppText variant="bodySm" color="textMuted" numberOfLines={1} style={styles.subtitle}>
        {params.albumTitle}
      </AppText>

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ReviewItem item={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
          ) : (
            <View style={styles.empty}>
              <StarRating value={0} size="lg" />
              <AppText color="textMuted" style={styles.emptyText}>
                {t('reviews.noReviews')}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={theme.colors.accent} style={styles.spinner} /> : null
        }
      />

      {composerOpen ? (
        <ReviewComposer
          type={type}
          id={id}
          targetLabel={params.albumTitle}
          initial={summary?.mine ?? null}
          onClose={() => setComposerOpen(false)}
          onSaved={(nextSummary, mine) => {
            applySummary({ ...nextSummary, mine });
            loadPage(1, true);
          }}
          onDeleted={(nextSummary) => {
            applySummary(nextSummary);
            loadPage(1, true);
          }}
        />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  topTitle: { flex: 1, marginLeft: 4 },
  subtitle: { paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  dist: { marginTop: 16 },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  distStar: { width: 12, textAlign: 'center' },
  distTrack: { flex: 1, height: 6, borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 3 },
  distPct: { width: 34, textAlign: 'right' },
  sortRow: { flexDirection: 'row', marginTop: 20, marginBottom: 8 },
  sortChip: { paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  spinner: { marginVertical: 24 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12 },
});

export default AlbumReviewsScreen;
