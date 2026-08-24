import React from 'react';
import {
  NavigationContainer,
  DarkTheme,
  Theme as NavTheme,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/context';
import {
  AlbumDetailsScreen,
  AlbumReviewsScreen,
  ArtistDetailsScreen,
  AlbumListScreen,
  ArtistListScreen,
  PlaylistDetailsScreen,
  PlaylistAddSongsScreen,
  MusicPlayerScreen,
} from '@/screens';
import { MainTabNavigator } from './MainTabNavigator';
import { linking } from './linking';
import { ShareDeepLinks } from './useShareDeepLinks';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const theme = useTheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  const navTheme: NavTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.text,
      primary: theme.colors.primary,
      border: theme.colors.border,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        {/* Detail screens push full-screen over the tabs, Netflix-style. */}
        <Stack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
        <Stack.Screen name="AlbumReviews" component={AlbumReviewsScreen} />
        <Stack.Screen name="ArtistDetails" component={ArtistDetailsScreen} />
        <Stack.Screen name="AlbumList" component={AlbumListScreen} />
        <Stack.Screen name="ArtistList" component={ArtistListScreen} />
        <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
        {/* Player + the song picker slide up as modals. */}
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="MusicPlayer" component={MusicPlayerScreen} />
          <Stack.Screen name="PlaylistAddSongs" component={PlaylistAddSongsScreen} />
        </Stack.Group>
      </Stack.Navigator>
      {/* Resolves incoming share/deep links -> play the shared track. */}
      <ShareDeepLinks navRef={navigationRef} />
    </NavigationContainer>
  );
};
