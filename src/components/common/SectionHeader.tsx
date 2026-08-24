import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { truncateTitle } from '@/utils';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

/** Row title with an optional "See all" action — used above each Home rail. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onSeeAll }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.row, { paddingHorizontal: theme.spacing.lg }]}>
      <AppText variant="h2">{truncateTitle(title)}</AppText>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAll}>
          <AppText variant="label" color="text" style={styles.seeAllText}>
            {t('common.seeAll')}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // A touch larger than the default `label` (13) and white, so the action reads
  // clearly next to the chevron.
  seeAllText: {
    fontSize: 15,
    marginRight: 2,
  },
});
