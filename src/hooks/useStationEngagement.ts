import { useCallback, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux';
import { fetchStationFavorites, toggleStationFavorite, toggleStationLike } from '@/redux';
import { getStationsBySlugs } from '@/services/radio';
import type { RadioStation } from '@/services/radio';
import { useRequireAuth } from './useRequireAuth';

/** Is this station one of the account's favourites? Always false for a guest. */
export function useIsStationFavorite(slug: string): boolean {
  return useAppSelector((s) => s.stationFavorites.slugs.includes(slug));
}

/** Has this device liked (thumbed up) this station? */
export function useIsStationLiked(slug: string): boolean {
  return useAppSelector((s) => !!s.stationLikes.slugs[slug]);
}

/**
 * The heart and the thumb for one station, with their taps already wired.
 *
 * The heart is gated: a guest gets the Jubilee Door rather than a favourite that
 * could never be shown back to them. The thumb is not — it is a device-level
 * signal and the feedback endpoint accepts anonymous listeners.
 */
export function useStationEngagement(station: RadioStation) {
  const dispatch = useAppDispatch();
  const requireAuth = useRequireAuth();
  const favorite = useIsStationFavorite(station.slug);
  const liked = useIsStationLiked(station.slug);

  const onToggleFavorite = useCallback(
    () => requireAuth(() => void dispatch(toggleStationFavorite(station)), 'likes'),
    [dispatch, requireAuth, station],
  );
  const onToggleLike = useCallback(
    () => dispatch(toggleStationLike(station)),
    [dispatch, station],
  );

  return { favorite, liked, onToggleFavorite, onToggleLike };
}

/** The account's favourite stations, newest first, resolved against the catalog. */
export function useFavoriteStations(): RadioStation[] {
  const slugs = useAppSelector((s) => s.stationFavorites.slugs);
  return useMemo(() => getStationsBySlugs(slugs), [slugs]);
}

/**
 * Reload favourites whenever a session appears — cold-start restore, sign-in,
 * 2FA or sign-up alike — and on a change of account. Mount once, near the root.
 *
 * Keyed on the user id rather than the user object, so renaming yourself in
 * Profile does not refetch.
 */
export function useStationFavoritesSync(): void {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);

  useEffect(() => {
    if (userId) void dispatch(fetchStationFavorites());
  }, [dispatch, userId]);
}
