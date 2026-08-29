import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { parseFrequencyLink, parseShareLink } from '@/services/share';
import type { RootStackParamList } from './types';

type NavRef = NavigationContainerRefWithCurrent<RootStackParamList>;

/**
 * Handles incoming share/deep links.
 *
 * Two kinds arrive here. Album shares (https://kjubilee.com/album?c=CODE or
 * kjubilee://album/CODE) open the album screen — sharing is album-level, so a
 * link always resolves to an album, which loads and displays it, or shows
 * "album not found" if it's gone.
 *
 * Frequencies (https://kjubilee.com/hm308.70) open the Dial on that station.
 * These are handled here rather than in the linking table because the path is a
 * pattern rather than a route, and because the frequency has to survive into the
 * screen as a param for the Dial to say anything useful about it.
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

  const openDial = useCallback(
    (hm: string, attempt = 0) => {
      if (navRef.isReady()) {
        navRef.navigate('MainTabs', { screen: 'DialTab', params: { hm } });
      } else if (attempt < 20) {
        setTimeout(() => openDial(hm, attempt + 1), 150);
      }
    },
    [navRef],
  );

  const handle = useCallback(
    (url: string | null) => {
      if (!url || lastHandled.current === url) return;

      // Frequencies first. They are the addresses printed on cards and read out
      // on air, and no album link can look like one, so the order costs nothing
      // and keeps the more specific rule from being shadowed.
      const freq = parseFrequencyLink(url);
      if (freq) {
        lastHandled.current = url;
        openDial(freq.hm);
        return;
      }

      const parsed = parseShareLink(url);
      if (!parsed) return; // not a share link — leave it to React Navigation linking
      lastHandled.current = url;
      openAlbum(parsed.albumCode);
    },
    [openAlbum, openDial],
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
