import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import { getStationBySlug } from '@/services/radio';
import {
  articleImageUrl,
  bandMember,
  readingMinutes,
  type BandArticle,
} from '@/assets/radio/bandArticles';

interface Props {
  article: BandArticle;
  onPress: (article: BandArticle) => void;
}

/**
 * One essay in the band's index.
 *
 * The fields are the site's card, in the site's order: picture, kicker, title,
 * dek, then who wrote it and how long it takes. There is deliberately NO date —
 * the data carries none, and inventing one would be the app claiming something
 * the band never published.
 */
const BandArticleCardInner: React.FC<Props> = ({ article, onPress }) => {
  const theme = useTheme();
  const c = theme.colors;
  const author = bandMember(article.author);
  // `article.image` names a STATION, whose gradient is painted under the
  // picture — the same ident the site puts behind its covers, and what shows
  // through while a remote image is still loading.
  const gradient = getStationBySlug(article.image)?.gradient;

  return (
    <Pressable
      onPress={() => onPress(article)}
      accessibilityRole="button"
      accessibilityLabel={`${article.title}. ${article.kicker}. ${
        author?.name ?? 'Jubilee Inspire'
      }, ${readingMinutes(article.words)} minute read.`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={styles.cover}>
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Image
          source={{ uri: articleImageUrl(article) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          // Top-anchored like every other cover in the app: a centred crop takes
          // the top off whoever is in the picture.
          contentPosition="top"
          transition={180}
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.body}>
        <AppText style={[styles.kicker, { color: c.accent }]}>
          {article.kicker.toUpperCase()}
        </AppText>
        <AppText numberOfLines={2} style={[styles.title, { color: c.text }]}>
          {article.title}
        </AppText>
        <AppText numberOfLines={2} style={[styles.dek, { color: c.textSecondary }]}>
          {article.dek}
        </AppText>
        <AppText style={[styles.meta, { color: c.textMuted }]}>
          {`${author?.name ?? 'Jubilee Inspire'}  ·  ${readingMinutes(article.words)} min read`}
        </AppText>
      </View>
    </Pressable>
  );
};

export const BandArticleCard = React.memo(BandArticleCardInner);
BandArticleCard.displayName = 'BandArticleCard';

const styles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  // 16:9, as the site's card falls back to on its narrowest breakpoint.
  cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  body: { padding: 14, gap: 5 },
  kicker: { fontSize: 10.5, letterSpacing: 1.6, fontWeight: '700' },
  title: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  dek: { fontSize: 13.5, lineHeight: 19 },
  meta: { fontSize: 11.5, marginTop: 3 },
});
