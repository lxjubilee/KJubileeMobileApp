import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { personaImage } from '@/assets/personaImages';
import { heroArt } from '@/assets/radio/stationArt';
import { AppText } from '@/components/common';
import { useTheme } from '@/context';
import type { RadioStation } from '@/services/radio';

/**
 * The featured hero at the top of Home, modelled on the kjubilee.com banner.
 *
 * The website runs a full-bleed cinematic strip with the copy overlaid on the
 * left third and the subject center-right. That split cannot survive a phone:
 * at 390pt a left-hand column would either cover the face or squeeze the title
 * to three words a line. So the web layout is re-cut rather than copied — the
 * image stays full-bleed and edge-to-edge, and the same elements stack up from
 * the bottom over a scrim, which is the idiom a thumb already knows.
 *
 * Element order is the website's, top to bottom, so the hierarchy reads the
 * same on both platforms: ghosted dial number, FEATURED / format / HM eyebrow,
 * oversized name, one-line description, then the Listen CTA beside the host.
 *
 * No ON AIR pill here, deliberately. The site puts that badge on the station
 * CARDS (`.cover-live`) and not in the banner — its `hero-content` has no
 * on-air element at all — and the hero says the same thing anyway through the
 * transport, which reads Pause while a station is sounding.
 */

/**
 * Hero height for a given width.
 *
 * Tall enough for the stacked copy to breathe, capped so the first station
 * shelf still peeks above the fold — a hero that fills the viewport reads as a
 * landing page and hides the fact that Home scrolls.
 */
export const featuredHeight = (width: number): number =>
  Math.round(Math.min(Math.max(width * 1.04, 350), 440));

/**
 * The copy's entrance, from the website's own keyframe:
 *   .hero-content{animation:heroIn .5s ease both}
 *   @keyframes heroIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
 *
 * It runs on every slide change here. On the site it fires only once, because
 * `paintHero` replaces the block's innerHTML rather than the block itself and a
 * CSS animation does not restart for that — the copy actually snaps over while
 * the artwork behind it cross-fades. The keyframe is clearly written for slide
 * entry, so this plays it as intended instead of reproducing that omission.
 */
/**
 * Ink on an accent-blue fill, taken from kjubilee.com's `.hero-eyebrow`
 * (`color:#04121f`). The site pairs every accent fill with a near-black ink;
 * the app used white, which was the one place the two visibly disagreed.
 */
const ACCENT_INK = '#04121f';

const CONTENT_MS = 500;
const CONTENT_RISE = 12;
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

interface Props {
  station: RadioStation;
  width: number;
  playing: boolean;
  /**
   * The track sounding right now, or null. Present only for the station that is
   * actually playing — see the note at the render site.
   */
  nowPlaying?: { title: string; artist: string; album: string } | null;
  /** True for the slide on top of the stack; drives the copy's entrance. */
  active?: boolean;
  onPress: (station: RadioStation) => void;
}

export const FeaturedStation: React.FC<Props> = React.memo(
  ({ station, width, playing, nowPlaying = null, active = true, onPress }) => {
    const theme = useTheme();
    const c = theme.colors;
    const live = station.live;
    // Hero-resolution copy: this is full-bleed, so the 640px tile asset would
    // be upscaled ~3x and visibly soft.
    const art = heroArt(station.slug);
    const height = featuredHeight(width);

    // Portraits are keyed by the persona's full manifest slug; a station host id
    // is its short form ("zev" -> "zev-inspire"). Only the twelve Inspire family
    // personas have one, so a station fronted by a character like Party Giggles
    // falls through to the initial badge below.
    const host = station.host;
    const portrait = personaImage(host ? `${host.id}-inspire` : null);

    // 0 while waiting in the stack, 1 once this slide is the live one.
    const enter = useRef(new Animated.Value(active ? 1 : 0)).current;
    useEffect(() => {
      const anim = Animated.timing(enter, {
        toValue: active ? 1 : 0,
        // Leaving is instant: the slide is fading out underneath anyway, and a
        // second curve on the way out only muddies the cross-fade.
        duration: active ? CONTENT_MS : 0,
        easing: EASE,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }, [active, enter]);

    return (
      <Pressable
        onPress={() => onPress(station)}
        disabled={!live}
        accessibilityRole="button"
        accessibilityLabel={
          live ? `Play ${station.name}, HM ${station.hm}` : `${station.name}, coming soon`
        }
        style={({ pressed }) => [{ width, height, opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.card}>
          {/* Gradient under the cover: it shows through for a station with no
              artwork, and covers the load-in for one that has it. */}
          <LinearGradient
            colors={station.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {art ? (
            <Image
              source={art}
              style={[StyleSheet.absoluteFill, !live && styles.dimmed]}
              contentFit="cover"
              contentPosition="top"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : null}

          {/* Two scrims rather than one: the top keeps the badge and the ghosted
              dial number legible over a bright sky, the bottom carries the copy
              and settles into the page background so the hero has no seam. */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            locations={[0, 1]}
            style={[StyleSheet.absoluteFill, styles.topScrim]}
          />
          <LinearGradient
            colors={[
              'transparent',
              'rgba(8,8,12,0.45)',
              'rgba(10,10,14,0.86)',
              'rgba(11,11,15,0.98)',
            ]}
            locations={[0, 0.3, 0.62, 1]}
            style={[StyleSheet.absoluteFill, styles.bottomScrim]}
          />

          {/* The website sets an oversized, near-transparent dial number in the
              banner's top-right and lets it run off the edge. */}
          <Text allowFontScaling={false} numberOfLines={1} style={styles.watermark}>
            HM {station.hm}
          </Text>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: enter,
                transform: [
                  {
                    translateY: enter.interpolate({
                      inputRange: [0, 1],
                      outputRange: [CONTENT_RISE, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Eyebrow — the site's FEATURED chip, format, and dial number. */}
            <View style={styles.eyebrow}>
              <View style={[styles.featuredPill, { backgroundColor: c.accent }]}>
                <Text allowFontScaling={false} style={styles.featuredText}>
                  FEATURED
                </Text>
              </View>
              <AppText numberOfLines={1} style={styles.format}>
                {station.format.toUpperCase()}
              </AppText>
              <Text allowFontScaling={false} style={[styles.hmInline, { color: c.accent }]}>
                HM {station.hm}
              </Text>
            </View>

            <AppText numberOfLines={2} style={styles.name}>
              {station.name}
            </AppText>

            {/* What the website changes per track is TEXT, not the picture:
                `paintNowPlaying()` writes `ti (al)` and `ar` while the cover stays
                the station's. The artwork above is deliberately left alone —
                kj-footer-player's own header says "the cover is the STATION's
                picture, not an album's". So the description slot carries the
                broadcast, and the station's blurb returns the moment it stops. */}
            {nowPlaying ? (
              <>
                <AppText numberOfLines={1} style={styles.nowTitle}>
                  {nowPlaying.album
                    ? `${nowPlaying.title} (${nowPlaying.album})`
                    : nowPlaying.title}
                </AppText>
                <AppText numberOfLines={1} style={styles.nowArtist}>
                  {nowPlaying.artist}
                </AppText>
              </>
            ) : (
              <AppText numberOfLines={2} style={styles.description}>
                {station.description}
              </AppText>
            )}

            <View style={styles.actions}>
              {live ? (
                <Pressable
                  onPress={() => onPress(station)}
                  accessibilityRole="button"
                  accessibilityLabel={`${playing ? 'Pause' : 'Listen to'} ${station.name}`}
                  style={({ pressed }) => [
                    styles.listen,
                    { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons
                    name={playing ? 'pause' : 'play'}
                    size={15}
                    color={ACCENT_INK}
                    style={playing ? undefined : styles.listenGlyph}
                  />
                  <AppText style={styles.listenText}>{playing ? 'Pause' : 'Listen now'}</AppText>
                </Pressable>
              ) : (
                <View style={styles.soon}>
                  <AppText style={styles.soonText}>Coming soon</AppText>
                </View>
              )}

              {host ? (
                <View style={styles.host}>
                  {portrait ? (
                    <RNImage source={portrait} style={styles.avatar} />
                  ) : (
                    <LinearGradient
                      colors={station.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.avatar, styles.avatarFallback]}
                    >
                      <AppText style={styles.avatarInitial}>
                        {host.name.charAt(0).toUpperCase()}
                      </AppText>
                    </LinearGradient>
                  )}
                  <View style={styles.hostText}>
                    <AppText numberOfLines={1} style={styles.hostName}>
                      {host.name}
                    </AppText>
                    <AppText numberOfLines={1} style={styles.hostFocus}>
                      {host.focus}
                    </AppText>
                  </View>
                </View>
              ) : null}
            </View>

            {/* The site's own closing pair, both inside `.hero-actions`:
                  .hero-tag  {font-size:13px;font-weight:600;color:var(--accent)}
                  .hero-meta {font-size:13px;font-weight:500;color:hsla(0,0%,100%,.82)}
                They sit beside the button on the web and wrap under it when the
                row runs out of room; a phone has no room, so they always wrap.
                This replaces a bare "N tracks" line — the track total is already
                inside `listeners` for most stations, and printing it twice read
                as a mistake. */}
            {station.listeners || station.reach ? (
              <View style={styles.metaRow}>
                {station.listeners ? (
                  <AppText numberOfLines={2} style={[styles.metaTag, { color: c.accent }]}>
                    {station.listeners}
                  </AppText>
                ) : null}
                {station.reach ? (
                  <AppText numberOfLines={1} style={styles.metaReach}>
                    {`Reach ${station.reach}`}
                  </AppText>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Pressable>
    );
  },
);
FeaturedStation.displayName = 'FeaturedStation';

const styles = StyleSheet.create({
  // Edge-to-edge, like the website banner — no inset card, no corner radius.
  card: { flex: 1, overflow: 'hidden' },
  dimmed: { opacity: 0.38 },
  topScrim: { bottom: undefined, height: 130 },
  bottomScrim: { top: undefined, height: '82%' },
  watermark: {
    position: 'absolute',
    top: 10,
    // Runs off the right edge and is clipped, as it is on the web.
    right: -6,
    fontFamily: 'Orbitron_600SemiBold',
    fontSize: 44,
    lineHeight: 54,
    color: '#FFFFFF',
    opacity: 0.13,
  },

  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 18, paddingBottom: 34 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  featuredPill: {
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredText: {
    fontSize: 9.5,
    // Explicit. This label used to be an AppText, which spreads typography.body
    // and its lineHeight of 21 — three points taller than the pill it sits in,
    // so the text was pushed off-centre and clipped rather than centred.
    lineHeight: 11,
    letterSpacing: 1.1,
    fontWeight: '800',
    color: ACCENT_INK,
    // Android pads the text box by the font's own ascent/descent, which no
    // amount of flex centring can compensate for.
    includeFontPadding: false,
    textAlignVertical: 'center',
    // letterSpacing is applied after the LAST character too, so the label reads
    // a hair left of centre without this.
    marginLeft: 1,
  },
  format: {
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  // Orbitron encodes its own weight — adding fontWeight makes Android drop the
  // family and fall back to system sans.
  hmInline: { fontFamily: 'Orbitron_600SemiBold', fontSize: 11 },
  name: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    // Lifted from 0.76 — at the old value it disappeared into a bright frame.
    color: 'rgba(255,255,255,0.88)',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Same vertical budget as the two-line description it replaces, so the hero
  // does not jump when a track starts or ends.
  nowTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  nowArtist: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.72)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
  },
  // The play triangle's own bearing sits it left of optical centre.
  listenGlyph: { marginLeft: 2 },
  listenText: { fontSize: 14, fontWeight: '700', color: ACCENT_INK },
  soon: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  soonText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  host: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  hostText: { flexShrink: 1 },
  hostName: { fontSize: 12.5, fontWeight: '600', color: '#FFFFFF' },
  hostFocus: { fontSize: 11, color: 'rgba(255,255,255,0.72)' },

  // `.hero-actions` is one wrapping flex row on the web. At phone width the two
  // texts always land on their own line, so this is that row after it has wrapped.
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 12 },
  // Explicit lineHeight: AppText's `body` variant carries 21, which opened a gap
  // between the two lines far wider than the web's.
  metaTag: { fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  metaReach: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: 'rgba(255,255,255,0.82)' },
});
