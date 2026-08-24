import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { AppText } from '@/components/common';
import type { ReviewListItem } from '@/types';
import { StarRating } from './StarRating';

/**
 * Read-only review card: author avatar/initials, stars, title, body, name and
 * "May 2026"-style date. Helpful votes and reporting are deferred, so this phase
 * omits those affordances (RN port of the web `ReviewItem`, read-only subset).
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "May 2026" — formatted manually to avoid Intl gaps on Hermes. */
const reviewDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

interface Props {
  item: ReviewListItem;
}

export const ReviewItem: React.FC<Props> = ({ item }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const date = reviewDate(item.createdAt);

  return (
    <View style={[styles.card, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
          <AppText variant="label" color="textSecondary">
            {initials(item.authorName || (item.mine ? t('reviews.you') : ''))}
          </AppText>
        </View>
        <View style={styles.headMeta}>
          <AppText variant="h3" numberOfLines={1}>
            {item.mine ? t('reviews.you') : item.authorName || t('reviews.anonymous')}
          </AppText>
          <View style={styles.starsRow}>
            <StarRating value={item.stars} size="sm" />
            {date ? (
              <AppText variant="caption" color="textMuted" style={styles.date}>
                {date}
                {item.edited ? ` · ${t('reviews.edited')}` : ''}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>

      {item.title ? (
        <AppText variant="h3" style={styles.title}>
          {item.title}
        </AppText>
      ) : null}
      {item.body ? (
        <AppText variant="body" color="textSecondary" style={styles.body}>
          {item.body}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headMeta: { flex: 1, marginLeft: 12 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  date: { marginLeft: 8 },
  title: { marginTop: 12 },
  body: { marginTop: 6 },
});
