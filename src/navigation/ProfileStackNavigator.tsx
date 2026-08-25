import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ProfileScreen,
  LikedSongsScreen,
  FollowedArtistsScreen,
  ChangePasswordScreen,
  PrivacyPolicyScreen,
  TermsOfUseScreen,
} from '@/screens';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// Downloads is hidden for v1 (feature not wired); re-add the screen here when it lands.
/**
 * Inner stack for the Profile tab: Profile -> account, likes and legal screens.
 *
 * This was the Playlists tab's stack. Playlists are gone — radio has no
 * playlists — but the account and legal screens lived inside it, so the stack
 * was re-rooted on Profile rather than deleted, which would have left no route
 * to account settings, the privacy policy or the terms.
 */
export const ProfileStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="LikedSongs" component={LikedSongsScreen} />
    <Stack.Screen name="FollowedArtists" component={FollowedArtistsScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
  </Stack.Navigator>
);
