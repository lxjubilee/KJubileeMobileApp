import React from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context';
import { AppText, BrandLogo, ProfileButton } from '@/components/common';
import { langFlagUrl } from '@/localization';

/** The "show everything" chip, always first in the filter row. */
export const HOME_FILTER_ALL = 'Home';

/** A Home filter is the "Home" sentinel or a catalog category label. */
export type HomeFilter = string;

/** Height the chips row collapses from / expands to. */
export const CHIP_ROW_HEIGHT = 48;

/** Diameter shared by both round header actions (language flag + profile),
 *  so the two circles always match. */
const ACTION_SIZE = 32;
/** Spacing between the two round actions. */
const ACTION_GAP = 8;
/** Diameter of the circular brand logo in the header. */
const BRAND_LOGO = 34;
/** Smallest allowed space between the wordmark and the language flag. */
const BRAND_CLEARANCE = 14;

// The wordmark is a fixed 13-glyph string in Orbitron, a wide geometric face
// whose glyphs advance roughly 0.72em. Deriving the size from the width the row
// actually has left keeps "KJubilee.com" clear of the flag on narrow phones,
// where a fixed 26px ran right up against it.
const WORDMARK_WIDTH_EM = 'KJubilee.com'.length * 0.72;
const BRAND_FONT_MAX = 26;
const BRAND_FONT_MIN = 17;

/** Wordmark size that fits the space left over beside the header actions. */
const brandFontSize = (screenWidth: number): number => {
  const free =
    screenWidth -
    32 - // `inner` horizontal padding
    (BRAND_LOGO + 8) - // logo plus its trailing margin
    (ACTION_SIZE * 2 + ACTION_GAP) - // language flag + profile avatar
    BRAND_CLEARANCE;
  return Math.max(BRAND_FONT_MIN, Math.min(BRAND_FONT_MAX, Math.floor(free / WORDMARK_WIDTH_EM)));
};

interface HomeHeaderProps {
  /** Chips to render, e.g. ['Home', 'Inspire Family', …] derived from the feed. */
  filters: HomeFilter[];
  selected: HomeFilter;
  onSelect: (filter: HomeFilter) => void;
  /** 1 = chips fully visible, 0 = fully collapsed. */
  chipsAnim: Animated.Value;
  /** 0 = transparent/gradient (at top), 1 = solid black (scrolled). */
  bgAnim: Animated.Value;
  /** Opens the profile page. */
  onPressProfile?: () => void;
  /** Current language code — drives the flag shown on the language button. */
  language?: string;
  /** Opens the language picker. */
  onPressLanguage?: () => void;
  /** Maps a chip's raw value (the filter identity) → its localized display text.
   *  Defaults to identity, so the chip renders its raw value when omitted. */
  getLabel?: (value: HomeFilter) => string;
}

/**
 * Fixed header overlaying the top of the Home hero (Netflix style):
 *  - At the top: a soft dark gradient with the title, actions, and filter chips.
 *  - On scroll down: chips collapse (height + fade) and the background
 *    cross-fades to solid black; scrolling back up restores the chips.
 * The collapse/solid state is driven by `chipsAnim` / `bgAnim` from the screen.
 */
export const HomeHeader: React.FC<HomeHeaderProps> = ({
  filters,
  selected,
  onSelect,
  chipsAnim,
  bgAnim,
  onPressProfile,
  language,
  onPressLanguage,
  getLabel,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const brandSize = brandFontSize(width);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Solid black header background. */}
      <View style={[StyleSheet.absoluteFill, styles.solidBg]} pointerEvents="none" />
      {/* Solid black layer that fades in once scrolled. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgAnim }]}
      />

      <View style={[styles.inner, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topRow}>
          <BrandLogo
            size={BRAND_LOGO}
            textStyle={[
              styles.brand,
              styles.brandText,
              { fontSize: brandSize, lineHeight: Math.round(brandSize * 1.15) },
            ]}
          />

          <View style={styles.actions}>
            {onPressLanguage ? (
              <Pressable
                onPress={onPressLanguage}
                hitSlop={8}
                style={styles.langButton}
                accessibilityRole="button"
                accessibilityLabel="Change language"
              >
                <Image
                  source={{ uri: langFlagUrl(language ?? 'en', 80) }}
                  style={styles.langFlag}
                  resizeMode="cover"
                />
              </Pressable>
            ) : null}
            <ProfileButton size={ACTION_SIZE} onPress={onPressProfile} />
          </View>
        </View>

        {/* Collapsible chips row. */}
        <Animated.View
          style={[
            styles.chipsWrap,
            {
              opacity: chipsAnim,
              height: chipsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, CHIP_ROW_HEIGHT],
              }),
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {filters.map((filter) => {
              const active = filter === selected;
              return (
                <Pressable
                  key={filter}
                  onPress={() => onSelect(filter)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.18)',
                      backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
                    },
                  ]}
                >
                  <AppText
                    variant="label"
                    style={{ color: active ? '#000' : theme.colors.text }}
                  >
                    {getLabel ? getLabel(filter) : filter}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  inner: { paddingHorizontal: 16, paddingBottom: 8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Floor on the wordmark-to-flag spacing: `space-between` alone collapses to
    // zero once the brand grows wide enough to fill the row.
    gap: BRAND_CLEARANCE,
    marginBottom: 12,
  },
  solidBg: { backgroundColor: '#000' },
  brand: { color: '#007FFF' },
  // Bold mixed-case wordmark ("KJubilee").
  // fontSize/lineHeight come from `brandFontSize` at render — see the top row.
  brandText: { fontWeight: '900', letterSpacing: 0.5 },
  // `flexShrink: 0` so the two circles keep their size and the brand yields instead.
  actions: { flexDirection: 'row', alignItems: 'center', gap: ACTION_GAP, flexShrink: 0 },
  langButton: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: '#222',
  },
  // Square + cover so the rectangular flag is cropped into the round button.
  langFlag: { width: '100%', height: '100%' },
  iconWrap: { position: 'relative' },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 9, lineHeight: 12, fontWeight: '700' },
  chipsWrap: { overflow: 'hidden', justifyContent: 'center' },
  chipsRow: { paddingRight: 16, gap: 10, alignItems: 'center' },
  chip: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
