import React from 'react';
import { View } from 'react-native';
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
import { HomeScreen, BrowseScreen, SearchScreen } from '@/screens';
import { PlaylistsStackNavigator } from './PlaylistsStackNavigator';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, React.ComponentProps<typeof Ionicons>['name']> = {
  HomeTab: 'home',
  BrowseTab: 'grid',
  SearchTab: 'search',
  PlaylistsTab: 'musical-notes',
};

/** Routes (nested in a tab's stack) where the MiniPlayer should be hidden. */
const HIDE_MINI_PLAYER_ON = ['Profile'];

/** Custom tab bar that stacks the persistent MiniPlayer above the real tab bar. */
const TabBarWithMiniPlayer: React.FC<BottomTabBarProps> = (props) => {
  const activeRoute = props.state.routes[props.state.index];
  const focusedNested = getFocusedRouteNameFromRoute(activeRoute);
  const hideMiniPlayer = focusedNested != null && HIDE_MINI_PLAYER_ON.includes(focusedNested);

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
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.iconMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="BrowseTab" component={BrowseScreen} options={{ title: t('tabs.browse') }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: t('tabs.search') }} />
      <Tab.Screen
        name="PlaylistsTab"
        component={PlaylistsStackNavigator}
        options={{ title: t('tabs.playlists') }}
        listeners={({ navigation }) => ({
          // Tapping the Playlists tab always returns to the Playlists root. Without
          // this, a sub-screen left over from a previous visit (e.g. Profile,
          // reached here or deep-linked from Home) would re-appear instead of
          // the playlists — wrong, since the user tapped "Playlists".
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('PlaylistsTab', { screen: 'Playlists' });
          },
        })}
      />
    </Tab.Navigator>
  );
};
