import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  PlaylistsScreen,
  LikedSongsScreen,
  FollowedArtistsScreen,
  ProfileScreen,
  ChangePasswordScreen,
  PrivacyPolicyScreen,
  TermsOfUseScreen,
} from '@/screens';
import type { PlaylistsStackParamList } from './types';

const Stack = createNativeStackNavigator<PlaylistsStackParamList>();

// Downloads is hidden for v1 (feature not wired); re-add the screen here when it lands.
/** Inner stack for the Playlists tab: Playlists -> Profile -> LikedSongs / FollowedArtists. */
export const PlaylistsStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Playlists" component={PlaylistsScreen} />
    <Stack.Screen name="LikedSongs" component={LikedSongsScreen} />
    <Stack.Screen name="FollowedArtists" component={FollowedArtistsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
  </Stack.Navigator>
);
