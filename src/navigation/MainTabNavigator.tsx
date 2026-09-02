import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  BottomTabBar,
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context';
import { MiniPlayer } from '@/components/player';
import { HomeScreen, BrowseScreen, DialScreen, MapScreen } from '@/screens';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { tabBarStyle } from './tabBarStyle';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  HomeTab: 'home',
  DialTab: 'radio',
  BrowseTab: 'grid',
  MapTab: 'globe-outline',
  ProfileTab: 'person-circle',
};

/** Custom tab bar that stacks the persistent MiniPlayer above the real tab bar. */
const TabBarWithMiniPlayer: React.FC<BottomTabBarProps> = (props) => {
  const activeRoute = props.state.routes[props.state.index];
  const focusedNested = getFocusedRouteNameFromRoute(activeRoute);
  // Hidden on the Profile screen itself, as before — but Profile is now the
  // ROOT of its tab rather than a pushed screen, and
  // `getFocusedRouteNameFromRoute` reports undefined for a stack sitting on its
  // initial route. Matching the name alone would therefore have quietly stopped
  // hiding it; the tab has to be checked too.
  const hideProfile =
    activeRoute.name === 'ProfileTab' && (focusedNested == null || focusedNested === 'Profile');
  // Hidden on the Dial too. The Dial is itself the radio's player surface — it
  // carries the same station, the same transport, and the tap target the bar
  // would offer — so the bar there is a second copy of the screen behind it.
  const hideMiniPlayer = hideProfile || activeRoute.name === 'DialTab';

  // A screen that hides the tab bar means it wants the whole screen — the Map
  // does this while its fullscreen map is open. `display: 'none'` is honoured
  // by BottomTabBar on its own, but the MiniPlayer sits ABOVE it in here and
  // would be left floating over the bottom of the map, so the whole stack goes.
  // `tabBarStyle` is typed as an ANIMATED style here, which has no plain
  // `display` to read — the cast is to the style that was actually set.
  const tabBarStyle = props.descriptors[activeRoute.key]?.options?.tabBarStyle as
    | StyleProp<ViewStyle>
    | undefined;
  if (StyleSheet.flatten(tabBarStyle)?.display === 'none') return null;

  return (
    <View>
      {hideMiniPlayer ? null : (
        <MiniPlayer onPress={() => props.navigation.getParent()?.navigate('MusicPlayer')} />
      )}
      <BottomTabBar {...props} />
    </View>
  );
};

export const MainTabNavigator: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBarWithMiniPlayer {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        // Blue marks the current place, as the site's active nav link does.
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.iconMuted,
        tabBarStyle: tabBarStyle(theme.colors),
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="DialTab" component={DialScreen} options={{ title: t('tabs.dial') }} />
      <Tab.Screen name="BrowseTab" component={BrowseScreen} options={{ title: t('tabs.browse') }} />
      <Tab.Screen name="MapTab" component={MapScreen} options={{ title: t('tabs.map') }} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: t('tabs.profile') }}
        listeners={({ navigation }) => ({
          // Tapping the Profile tab always returns to its root. Without this, a
          // sub-screen left over from a previous visit (e.g. Change Password)
          // would re-appear instead of the profile — wrong, since the user
          // tapped "Profile".
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('ProfileTab', { screen: 'Profile' });
          },
        })}
      />
    </Tab.Navigator>
  );
};
