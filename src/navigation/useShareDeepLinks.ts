import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { parseShareLink } from '@/services/share';
import type { RootStackParamList } from './types';

type NavRef = NavigationContainerRefWithCurrent<RootStackParamList>;

/**
 * Handles incoming share/deep links (e.g. https://kjubilee.com/album?c=CODE or
 * kjubilee://album/CODE): navigate to that album. Sharing is album-level, so a
 * link always opens the album screen (which loads + displays the album, or
 * shows "album not found" if it's gone).
 *
 * Navigates via the container ref rather than `useNavigation`, so it can live
 * outside the navigator and fire from a cold start. `getInitialURL()` keeps
 * returning the launch URL for the session, so a link that arrives while the
 * user is signed out is still handled once RootNavigator (and this hook) mounts
 * after authentication.
 */
export function useShareDeepLinks(navRef: NavRef) {
  const lastHandled = useRef<string | null>(null);

  const openAlbum = useCallback(
    (albumCode: string, attempt = 0) => {
      if (navRef.isReady()) {
        navRef.navigate('AlbumDetails', { albumId: albumCode });
      } else if (attempt < 20) {
        // Cold start: the container may not be ready yet — retry briefly.
        setTimeout(() => openAlbum(albumCode, attempt + 1), 150);
      }
    },
    [navRef],
  );

  const handle = useCallback(
    (url: string | null) => {
      if (!url || lastHandled.current === url) return;
      const parsed = parseShareLink(url);
      if (!parsed) return; // not a share link — leave it to React Navigation linking
      lastHandled.current = url;
      openAlbum(parsed.albumCode);
    },
    [openAlbum],
  );

  useEffect(() => {
    let active = true;
    void Linking.getInitialURL().then((u) => {
      if (active) handle(u);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => {
      active = false;
      sub.remove();
    };
  }, [handle]);
}

/** Render-null mount point for the deep-link handler. */
export const ShareDeepLinks: React.FC<{ navRef: NavRef }> = ({ navRef }) => {
  useShareDeepLinks(navRef);
  return null;
};
