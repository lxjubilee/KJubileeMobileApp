import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText } from '@/components/common';
import { FloatingMiniPlayer } from '@/components/player';
import { useTheme } from '@/context';
import { personaImage } from '@/assets/personaImages';
import { getStationBySlug, tune } from '@/services/radio';
import { cachedArticleBody, fetchArticleBody } from '@/services/band';
import {
  allBandArticles,
  articleImageUrl,
  bandArticle,
  bandMember,
  readingMinutes,
} from '@/assets/radio/bandArticles';
import type { RootStackParamList, RootStackScreenProps } from '@/navigation/types';
import { BandArticleCard } from '@/screens/BandArticles/components/BandArticleCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HEADER_HEIGHT = 38;
/** How many other essays close the page — the site's own cap. */
const MORE_COUNT = 10;

/**
 * One Heavenly Band essay.
 *
 * The index is bundled, so the headline, the standfirst, the author and the
 * picture are on screen immediately. Only the prose is fetched, and it arrives
 * under a spinner — the same three states the site has, for the same reason:
 * 113 essays of text is too much to ship and nobody reads more than a few.
 */
export const BandArticleDetailScreen: React.FC = () => {
  const { params } = useRoute<RootStackScreenProps<'BandArticleDetail'>['route']>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const article = useMemo(() => bandArticle(params.slug), [params.slug]);
  const author = bandMember(article?.author);
  // The station the essay is about, when it names one that can actually play.
  const station = article ? getStationBySlug(article.image) : undefined;

  // Seeded from the cache so returning to an essay already read shows its text
  // on the first frame instead of flashing the loading state again.
  const [body, setBody] = useState<string[] | null>(() => cachedArticleBody(params.slug) ?? null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (body) return;
    let alive = true;
    setFailed(false);
    fetchArticleBody(params.slug)
      .then((paragraphs) => {
        if (alive) setBody(paragraphs);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [params.slug, attempt, body]);

  const onPickOther = useCallback(
    // `push`, not `navigate`: reading one essay from inside another should stack,
    // so back walks the way you came rather than jumping to the index.
    (next: { slug: string }) => navigation.push('BandArticleDetail', { slug: next.slug }),
    [navigation],
  );

  const c = theme.colors;
  const heroH = Math.round(width * 0.62);

  const more = useMemo(
    () => allBandArticles().filter((a) => a.slug !== params.slug).slice(0, MORE_COUNT),
    [params.slug],
  );

  if (!article) {
    return (
      <Screen>
        <View style={styles.missing}>
          <AppText style={{ color: c.textMuted }}>That article is not on the band.</AppText>
        </View>
      </Screen>
    );
  }

  const portrait = author ? personaImage(author.id + '-inspire') : undefined;

  return (
    <Screen safeArea={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
      >
        {/* ---- hero ---- */}
        <View style={{ height: heroH }}>
          {station ? (
            <LinearGradient
              colors={station.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Image
            source={{ uri: articleImageUrl(article) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top"
            transition={200}
            cachePolicy="memory-disk"
          />
          {/* Scrim under the back pill, so it stays legible over a bright corner. */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            locations={[0, 0.35]}
            style={styles.heroTopScrim}
          />
          {/* And one under the title, which sits on the picture. */}
          <LinearGradient
            colors={['transparent', 'rgba(11,11,15,0.75)', 'rgba(11,11,15,1)']}
            locations={[0, 0.55, 1]}
            style={styles.heroBottomScrim}
          />
        </View>

        {/* ---- title block ---- */}
        <View style={styles.titleBlock}>
          <View style={styles.metaRow}>
            <View style={[styles.tab, { borderColor: c.accent }]}>
              <AppText style={[styles.tabText, { color: c.accent }]}>
                {article.kicker.toUpperCase()}
              </AppText>
            </View>
            <AppText numberOfLines={1} style={[styles.metaPlain, { color: c.textMuted }]}>
              {(author ? author.name : 'Jubilee Inspire') +
                '  ·  ' +
                readingMinutes(article.words) +
                ' min read'}
            </AppText>
          </View>

          <AppText style={[styles.title, { color: c.text }]}>{article.title}</AppText>

          <AppText style={[styles.need, { color: c.textSecondary }]}>
            <Text style={[styles.needLabel, { color: c.textMuted }]}>In short: </Text>
            {article.dek}
          </AppText>
        </View>

        {/* ---- body ---- */}
        <View style={styles.body}>
          {/* THE DROP CAP GOES ON THE FIRST REAL PARAGRAPH, not on a repeat of
              the dek. The site prints the standfirst twice — once over the hero
              and again as the lead — but it has a full-bleed photograph between
              the two. Here they would land one under the other, and the same
              sentence twice running reads as a bug rather than as a flourish.
              So "In short:" keeps the dek above, and the essay opens on its own
              first line. */}
          {body ? (
            body.map((paragraph, i) =>
              i === 0 ? (
                <AppText key={i} style={[styles.lead, { color: c.textSecondary }]}>
                  <Text style={[styles.dropCap, { color: c.accent }]}>{paragraph.charAt(0)}</Text>
                  {paragraph.slice(1)}
                </AppText>
              ) : (
                <AppText
                  key={i}
                  // Every paragraph needs its own space from the one above, or
                  // two of them read as a single run-on block.
                  style={[styles.story, styles.storyGap, { color: c.textSecondary }]}
                >
                  {paragraph}
                </AppText>
              ),
            )
          ) : failed ? (
            <View style={styles.bodyState}>
              <AppText style={[styles.story, styles.statusText, { color: c.textMuted }]}>
                This article could not be loaded.
              </AppText>
              <Pressable
                onPress={() => {
                  setFailed(false);
                  setAttempt((n) => n + 1);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.retry,
                  { borderColor: c.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <AppText style={{ color: c.text }}>Try again</AppText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.bodyState}>
              <ActivityIndicator size="small" color={c.textMuted} />
              <AppText style={[styles.story, styles.statusText, { color: c.textMuted }]}>
                Fetching the article…
              </AppText>
            </View>
          )}
        </View>

        {/* ---- the line it rests on ---- */}
        <View style={[styles.callout, { borderLeftColor: c.accent, backgroundColor: c.surface }]}>
          <View style={styles.calloutLabel}>
            <Ionicons name="star-outline" size={13} color={c.accent} />
            <AppText style={[styles.calloutLabelText, { color: c.accent }]}>
              THE LINE IT RESTS ON
            </AppText>
          </View>
          <AppText style={[styles.calloutText, { color: c.text }]}>{article.stands}</AppText>
        </View>

        {/* ---- byline ---- */}
        {author ? (
          <View style={[styles.byline, { borderColor: c.border }]}>
            {portrait ? (
              <Image
                source={portrait}
                style={styles.portrait}
                contentFit="cover"
                transition={140}
              />
            ) : null}
            <View style={styles.bylineText}>
              <AppText style={[styles.bylineLabel, { color: c.textMuted }]}>WRITTEN BY</AppText>
              <AppText style={[styles.bylineName, { color: c.text }]}>{author.name}</AppText>
              <AppText style={[styles.bylineFocus, { color: c.textSecondary }]}>
                {author.focus}
              </AppText>
            </View>
          </View>
        ) : null}

        {/* ---- hear it ----
            Only when the station the essay is about can actually play. An essay
            about a frequency that has not signed on gets no button rather than a
            dead one. */}
        {station && station.live ? (
          <Pressable
            onPress={() => void tune(station.slug)}
            accessibilityRole="button"
            accessibilityLabel={'Play ' + station.name}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="play" size={18} color={c.accentInk} />
            <View>
              <AppText style={[styles.ctaTitle, { color: c.accentInk }]}>
                Hear what this is about
              </AppText>
              <AppText style={[styles.ctaSub, { color: c.accentInk }]}>
                {station.name + '  ·  HM ' + station.hm}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        {/* ---- more from the band ----
            The first ten others in published order, as the site does — not
            "related", which the data has no way to work out. */}
        <View style={styles.moreHead}>
          <AppText style={[styles.moreTitle, { color: c.text }]}>More from the band</AppText>
        </View>
        <View style={styles.moreList}>
          {more.map((a) => (
            <BandArticleCard key={a.slug} article={a} onPress={onPickOther} />
          ))}
        </View>
      </ScrollView>

      {/* Pinned back pill — outside the scroll so it never scrolls away. */}
      <View
        style={[styles.fixedHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}
      >
        <LinearGradient
          colors={['rgba(11,11,15,1)', 'rgba(11,11,15,0.86)', 'rgba(11,11,15,0)']}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="The Heavenly Band"
          style={({ pressed }) => [
            styles.backPill,
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={c.text} />
          <AppText style={[styles.backPillText, { color: c.text }]}>The Heavenly Band</AppText>
        </Pressable>
      </View>

      <FloatingMiniPlayer />
    </Screen>
  );
};

const GUTTER = 20;

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroTopScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  heroBottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 },

  // Pulled up over the hero's lower scrim, so the kicker and headline sit on
  // the picture rather than starting below it.
  titleBlock: { paddingHorizontal: GUTTER, marginTop: -52 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tab: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  tabText: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  metaPlain: { fontSize: 11.5, flexShrink: 1 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800' },
  need: { fontSize: 14.5, lineHeight: 21, marginTop: 10 },
  needLabel: { fontWeight: '700' },

  body: { paddingHorizontal: GUTTER, marginTop: 22 },
  // JUSTIFIED, like the long-form column it is. Android only honours this from
  // 8.0 (API 26) and quietly falls back to left below that, which is the right
  // failure: ragged-right prose is normal, and nothing else about the layout
  // depends on it. The last line of a paragraph stays left on both platforms,
  // so there are no stretched orphans.
  lead: { fontSize: 16, lineHeight: 25, textAlign: 'justify' },
  // Not a true drop cap: RN has no float, so the letter sits large and
  // accent-blue on the same line and the rest flows past it.
  //
  // The lineHeight is SMALLER than the font size, and smaller than the lead's —
  // deliberately. A nested Text with a taller lineHeight pushes every line of
  // the paragraph apart, not just its own, which opened a visible gap mid
  // sentence. Same values the station article uses.
  dropCap: { fontSize: 30, lineHeight: 25, fontWeight: '800' },
  story: { fontSize: 14.5, lineHeight: 22, textAlign: 'justify' },
  storyGap: { marginTop: 14 },
  bodyState: { marginTop: 18, alignItems: 'center', gap: 12 },
  // These borrow `story` for its size but are one-line notices, not prose —
  // they must not inherit the column's justification.
  statusText: { textAlign: 'center' },
  retry: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 9 },

  callout: {
    marginTop: 26,
    marginHorizontal: GUTTER,
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 14,
  },
  calloutLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  calloutLabelText: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  calloutText: { fontSize: 14.5, lineHeight: 21 },

  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 22,
    marginHorizontal: GUTTER,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  portrait: { width: 52, height: 52, borderRadius: 26 },
  bylineText: { flex: 1 },
  bylineLabel: { fontSize: 9.5, letterSpacing: 1.4, fontWeight: '700' },
  bylineName: { fontSize: 16, fontWeight: '700', marginTop: 3 },
  bylineFocus: { fontSize: 12.5, marginTop: 2 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    marginHorizontal: GUTTER,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 8,
  },
  ctaTitle: { fontSize: 14.5, fontWeight: '700' },
  ctaSub: { fontSize: 12, marginTop: 2, opacity: 0.8 },

  moreHead: { paddingHorizontal: GUTTER, marginTop: 34, marginBottom: 12 },
  moreTitle: { fontSize: 19, fontWeight: '700' },
  moreList: { paddingHorizontal: GUTTER, gap: 16 },

  fixedHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  backPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  backPillText: { fontSize: 12.5, fontWeight: '600' },
});

export default BandArticleDetailScreen;
