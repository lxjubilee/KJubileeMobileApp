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
import { HomeScreen, BrowseScreen, DialScreen, MapScreen } from '@/screens';
import { ProfileStackNavigator } from './ProfileStackNavigator';
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
  const hideMiniPlayer =
    activeRoute.name === 'ProfileTab' && (focusedNested == null || focusedNested === 'Profile');

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
