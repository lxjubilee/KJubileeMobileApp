import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, AppText, IconButton } from '@/components/common';
import { FloatingMiniPlayer } from '@/components/player';
import { useTheme } from '@/context';
import { allBandArticles, type BandArticle } from '@/assets/radio/bandArticles';
import type { RootStackParamList } from '@/navigation/types';
import { BandArticleCard } from './components/BandArticleCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GAP = 16;
/** Height of the pinned header row holding the back button. */
const HEADER_HEIGHT = 38;

/**
 * The Heavenly Band — the written half of the network.
 *
 * The site's right-hand nav item, ported. One column rather than the web's
 * five-across grid: at phone width a card that carries a picture, a kicker, a
 * headline and a standfirst has nowhere to go but down, and the site itself
 * collapses to one column at its narrowest breakpoint.
 *
 * PUBLISHED ORDER, NOT SORTED. There is no date in this data — the order is
 * editorial, the general essays about the band first and then twelve runs of
 * seven by each member who writes. Sorting it would destroy the only sequence
 * the band actually chose.
 */
export const BandArticlesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Bundled and synchronous — there is nothing to await and no loading state.
  const articles = allBandArticles();

  const onPick = useCallback(
    (article: BandArticle) => navigation.navigate('BandArticleDetail', { slug: article.slug }),
    [navigation],
  );

  const c = theme.colors;

  return (
    <Screen safeArea={false}>
      <FlatList
        data={articles}
        keyExtractor={(a) => a.slug}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + HEADER_HEIGHT + 8,
            // Clearance for the footer bar, as every other root-stack list does.
            paddingBottom: 96 + insets.bottom,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.head}>
            <AppText variant="display" numberOfLines={2}>
              The Heavenly Band
            </AppText>
            <AppText style={[styles.sub, { color: c.textMuted }]}>
              {`${articles.length} pieces on what this band is, why it sounds like this, and who it is for`}
            </AppText>
          </View>
        }
        renderItem={({ item }) => <BandArticleCard article={item} onPress={onPick} />}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      />

      {/* Pinned back button — outside the scroll so it never scrolls away. */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} />
      </View>

      <FloatingMiniPlayer />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: GAP },
  head: { marginBottom: 18 },
  sub: { fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  fixedHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#000',
    // A ROW. Without this the header is a column, `alignItems` defaults to
    // stretch, and the back button spans the full width — it then centres its
    // own glyph, so the chevron sat in the middle of the screen. Same two lines
    // StationList uses.
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
});

export default BandArticlesScreen;
