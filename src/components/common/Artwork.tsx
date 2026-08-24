import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image, ImageContentFit, ImageContentPosition, ImageLoadEventData, ImageStyle } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context';
import { cdnUrl } from '@/utils';
import { useAppDispatch, markArtworkMissing } from '@/redux';

interface ArtworkProps {
  /** CDN-relative or absolute path. Resolved via cdnUrl(). */
  uri?: string | null;
  /**
   * Local bundled image (a `require()` result). When set it wins over `uri` and
   * renders directly, bypassing the CDN — used for local persona portraits.
   */
  source?: number;
  /** Background for the placeholder shown when there's no image / it fails to load. */
  accentColor?: string;
  /** Sizing/radius style — applied identically to the image and the placeholder. */
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Anchor point for the image within its frame (e.g. 'top' to top-align). */
  contentPosition?: ImageContentPosition;
  /** Fires once the image loads, carrying its natural dimensions. */
  onLoad?: (event: ImageLoadEventData) => void;
  transition?: number;
  blurRadius?: number;
  /** Placeholder glyph size. */
  iconSize?: number;
}

/**
 * Album/artist artwork with a graceful fallback. Items without published covers
 * are filtered out upstream (see manifestMappers), so this should normally show
 * real artwork — the accent-colored placeholder tile (rendered on load error or
 * empty uri) is now just an edge-case safety net (transient 404 / stale cache).
 */
export const Artwork: React.FC<ArtworkProps> = ({
  uri,
  source,
  accentColor,
  style,
  contentFit = 'cover',
  contentPosition = 'center',
  transition = 250,
  blurRadius,
  iconSize = 28,
  onLoad,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const resolved = cdnUrl(uri ?? '');
  const [failed, setFailed] = useState(false);

  // Reset on source change so recycled list rows re-attempt the new image.
  useEffect(() => {
    setFailed(false);
  }, [resolved, source]);

  const onError = () => {
    setFailed(true);
    // Record the (relative) cover key so this item is filtered out of lists.
    // `uri` is the same value stored on Album.cover / Artist.image / Track.artwork.
    if (uri) dispatch(markArtworkMissing(uri));
  };

  // Local bundled asset: render directly (can't 404, so no error tracking).
  if (source != null) {
    return (
      <Image
        source={source}
        style={style}
        contentFit={contentFit}
        contentPosition={contentPosition}
        transition={transition}
        blurRadius={blurRadius}
        onLoad={onLoad}
      />
    );
  }

  if (!resolved || failed) {
    return (
      <View
        style={[
          styles.fallback,
          style as StyleProp<ViewStyle>,
          // Applied last so the accent wins over any backgroundColor in `style`.
          { backgroundColor: accentColor ?? theme.colors.surface },
        ]}
      >
        {/* iconSize 0 is used to hide the glyph (e.g. blurred background art). A
            size-0 Ionicons is a fontSize-0 <Text>, which throws natively when
            measured on the New Architecture ("FontSize should be a positive
            value") and wedges the render loop — so render no glyph in that case. */}
        {iconSize > 0 ? (
          <Ionicons name="musical-notes" size={iconSize} color="rgba(255,255,255,0.55)" />
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolved }}
      style={style}
      contentFit={contentFit}
      contentPosition={contentPosition}
      transition={transition}
      blurRadius={blurRadius}
      recyclingKey={resolved}
      onError={onError}
      onLoad={onLoad}
    />
  );
};

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
