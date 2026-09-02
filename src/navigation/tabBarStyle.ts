import type { ViewStyle } from 'react-native';
import type { ThemeColors } from '@/theme';

/**
 * The tab bar's own style, in one place because two of them set it.
 *
 * The navigator sets it for every screen; the Map sets it again on itself to
 * hide the bar while its fullscreen map is open. That second call cannot pass
 * `undefined` to put it back — react-navigation merges options with
 * `Object.assign`, so an explicit `undefined` overwrites the navigator's value
 * rather than falling back to it, and the bar would come back from fullscreen
 * transparent and borderless for the rest of the session. It has to pass the
 * real style, which means the real style cannot live only in the navigator.
 */
export const tabBarStyle = (colors: ThemeColors, hidden = false): ViewStyle =>
  hidden
    ? { display: 'none' }
    : { backgroundColor: colors.tabBar, borderTopColor: colors.border };
