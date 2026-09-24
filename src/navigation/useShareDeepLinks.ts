import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { parseFrequencyLink } from '@/services/share';
import type { RootStackParamList } from './types';

type NavRef = NavigationContainerRefWithCurrent<RootStackParamList>;

/**
 * Handles incoming frequency links.
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

  const openDial = useCallback(
    (hm: string, attempt = 0) => {
      if (navRef.isReady()) {
        navRef.navigate('MainTabs', { screen: 'DialTab', params: { hm } });
      } else if (attempt < 20) {
        // Cold start: the container may not be ready yet — retry briefly.
        setTimeout(() => openDial(hm, attempt + 1), 150);
      }
    },
    [navRef],
  );

  const handle = useCallback(
    (url: string | null) => {
      if (!url || lastHandled.current === url) return;
      const freq = parseFrequencyLink(url);
      if (!freq) return; // not a frequency — leave it to React Navigation linking
      lastHandled.current = url;
      openDial(freq.hm);
    },
    [openDial],
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
